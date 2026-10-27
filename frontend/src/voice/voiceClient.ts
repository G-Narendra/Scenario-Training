export interface VoiceClientCallbacks {
  onSessionReady?: (personaName: string, scenarioTitle: string) => void;
  onTranscriptPartial?: (text: string) => void;
  onTranscriptFinal?: (text: string) => void;
  onAssistantText?: (text: string) => void;
  onAssistantSpeaking?: (isSpeaking: boolean) => void;
  onTurnComplete?: (latencyMs: number) => void;
  onError?: (err: string) => void;
  onSessionEnded?: (status: string) => void;
  onMicStatusChange?: (isCapturing: boolean, isMuted: boolean) => void;
  onFallbackHttpSend?: (spokenText: string) => Promise<void>;
  onAutoplayBlocked?: () => void;
}

export interface VoiceServerMessage {
  type: string;
  persona_name?: string;
  scenario_title?: string;
  text?: string;
  is_final?: boolean;
  latency_ms?: number;
  status?: string;
  message?: string;
}

interface ISpeechAlternative {
  transcript: string;
  confidence?: number;
}

interface ISpeechResult {
  isFinal?: boolean;
  length: number;
  [index: number]: ISpeechAlternative;
}

interface ISpeechResultList {
  length: number;
  [index: number]: ISpeechResult;
}

interface ISpeechRecognitionEvent {
  results: ISpeechResultList;
  resultIndex?: number;
}

interface ISpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

interface ISpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives?: number;
  onstart?: (() => void) | null;
  onresult: ((event: ISpeechRecognitionEvent) => void) | null;
  onerror: ((event: ISpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onspeechend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => ISpeechRecognition;

export class VoiceClient {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private currentBufferSource: AudioBufferSourceNode | null = null;
  private currentAudioElement: HTMLAudioElement | null = null;
  private recognition: ISpeechRecognition | null = null;
  private latestUtterance = '';
  private isCommitting = false;
  public isConnected = false;
  private isRecording = false;
  private isMuted = false;
  private isSpeaking = false;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private restartTimeout: ReturnType<typeof setTimeout> | null = null;
  private watchdogTimer: ReturnType<typeof setTimeout> | null = null;
  /**
   * Hard-deadline timer: forces a turn commit N seconds after the user first
   * silence timer on mobile.
   */
  private hardCommitTimer: ReturnType<typeof setTimeout> | null = null;
  public isContinuousCall = true;
  public sessionPersonaName = '';
  public sessionVoiceGender: 'male' | 'female' = 'male';
  public recognitionLanguage: string = (() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('scenariolab_voice_lang');
      if (saved) return saved;
      const nav = (navigator.languages && navigator.languages[0]) || navigator.language;
      if (nav) return nav;
    }
    return 'en-IN';
  })();
  private callbacks: VoiceClientCallbacks;
  private ttsAudioCache = new Map<string, AudioBuffer>();
  private networkErrorCount = 0;
  private consecutiveFastRestarts = 0;
  private lastStartTimestamp = 0;
  private pendingSpeech: { text: string; personaName: string } | null = null;

  constructor(callbacks: VoiceClientCallbacks = {}) {
    this.callbacks = callbacks;
  }

  public hasPendingSpeech(): boolean {
    return this.pendingSpeech !== null;
  }

  public async playPendingSpeech(): Promise<void> {
    if (!this.pendingSpeech) return;
    const item = this.pendingSpeech;
    this.pendingSpeech = null;
    await this.speakText(item.text, item.personaName);
  }

  /**
   * Dynamically switch speech recognition language (e.g. en-IN for Indian English, en-US, en-GB).
   */
  public setRecognitionLanguage(lang: string): void {
    if (!lang) return;
    this.recognitionLanguage = lang;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('scenariolab_voice_lang', lang);
      } catch {}
    }
    if (this.recognition) {
      try {
        this.recognition.lang = lang;
      } catch {}
    }
  }

  /**
   * Sliding-window deduplication that deterministically removes repeated phrases
   * of ANY length (e.g. "see our see our see our" -> "see our", or
   * "see our software dashboard see our software dashboard" -> "see our software dashboard")
   * as well as consecutive duplicate single words.
   */
  private dedupConsecutiveWords(text: string): string {
    if (!text) return '';
    const cleaned = text.trim();
    const words = cleaned.split(/\s+/).filter(Boolean);
    if (words.length <= 1) return cleaned;

    let changed = true;
    while (changed) {
      changed = false;
      const maxL = Math.floor(words.length / 2);
      for (let L = maxL; L >= 1; L--) {
        for (let i = 0; i <= words.length - 2 * L; i++) {
          let match = true;
          for (let k = 0; k < L; k++) {
            if (words[i + k].toLowerCase() !== words[i + L + k].toLowerCase()) {
              match = false;
              break;
            }
          }
          if (match) {
            words.splice(i + L, L);
            changed = true;
            break;
          }
        }
        if (changed) break;
      }
    }

    return words.join(' ');
  }

  /**
   * Lock the counterpart persona name and voice gender for the entire session.
   * Guarantees consistent voice identity across all turns without mid-call switches.
   */
  public setPersona(name: string, gender?: 'male' | 'female'): void {
    if (name) this.sessionPersonaName = name;
    if (gender) {
      this.sessionVoiceGender = gender;
    } else if (name) {
      const lower = name.toLowerCase();
      const isFemale = /sarah|priya|elena|rachel|maya|jessica|emily|anna|claire|female/.test(lower);
      this.sessionVoiceGender = isFemale ? 'female' : 'male';
    }
  }

  /**
   * Unlock and ensure browser AudioContext is running on user gesture.
   */
  public async ensureAudioContext(): Promise<AudioContext> {
    const windowWithAudio = window as unknown as {
      __sharedAudioContext?: AudioContext;
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };

    if (windowWithAudio.__sharedAudioContext && windowWithAudio.__sharedAudioContext.state !== 'closed') {
      this.audioContext = windowWithAudio.__sharedAudioContext;
    }

    if (!this.audioContext || this.audioContext.state === 'closed') {
      const AudioCtx =
        window.AudioContext ||
        windowWithAudio.webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx({ sampleRate: 24000 });
        windowWithAudio.__sharedAudioContext = this.audioContext;
      }
    }
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume().catch(() => {});
    }
    return this.audioContext!;
  }

  /**
   * Pre-fetches and decodes neural TTS audio into in-memory cache.
   * Ensures 0ms delay when playback is triggered after the 1-second delay.
   */
  public async prefetchAudio(text: string, personaName: string = ''): Promise<void> {
    if (!text || typeof window === 'undefined') return;

    const clean = text
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/#+\s/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/•\s*/g, '')
      .replace(/—/g, ', ')
      .trim();

    if (!clean) return;

    const nameToTest = (personaName || this.sessionPersonaName || '').toLowerCase();
    const isFemale = /sarah|priya|elena|rachel|maya|jessica|emily|anna|claire|female/.test(nameToTest);
    const isMale = /marcus|david|james|carlos|vikram|tariq|michael|liam|jonathan|omar|rohan|kevin|alexander|daniel|andrew|guy|chris|male/.test(nameToTest);
    const voiceParam = isFemale ? 'female' : isMale ? 'male' : this.sessionVoiceGender;

    const isVercel = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');
    const apiHost = isVercel ? 'https://mrdev444-scenario-training-backend.hf.space' : '';
    const audioUrl = `${apiHost}/api/voice/tts?text=${encodeURIComponent(clean.slice(0, 600))}&voice=${voiceParam}`;

    if (this.ttsAudioCache.has(audioUrl)) return;

    try {
      const ctx = await this.ensureAudioContext();
      const res = await fetch(audioUrl);
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        if (this.ttsAudioCache.size < 100) {
          this.ttsAudioCache.set(audioUrl, audioBuffer);
        }
      }
    } catch {
      // Best-effort prefetch
    }
  }

  async connect(sessionId: string, token: string): Promise<void> {
    await this.ensureAudioContext().catch(() => {});

    const isDevPort = window.location.port === '5173';
    const isVercel = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const hostDirect = `${protocol === 'wss:' ? 'wss:' : 'ws:'}//${window.location.hostname || '127.0.0.1'}:8000`;
    const hostProxy = isVercel
      ? 'wss://mrdev444-scenario-training-backend.hf.space'
      : `${protocol}//${window.location.host}`;

    const primaryUrl = isVercel
      ? `wss://mrdev444-scenario-training-backend.hf.space/api/sessions/${sessionId}/voice?token=${encodeURIComponent(token)}`
      : isDevPort
      ? `${hostDirect}/api/sessions/${sessionId}/voice?token=${encodeURIComponent(token)}`
      : `${hostProxy}/api/sessions/${sessionId}/voice?token=${encodeURIComponent(token)}`;

    const fallbackUrl = isDevPort
      ? `${hostProxy}/api/sessions/${sessionId}/voice?token=${encodeURIComponent(token)}`
      : `${hostDirect}/api/sessions/${sessionId}/voice?token=${encodeURIComponent(token)}`;

    const tryConnect = (url: string, timeoutMs = 1200): Promise<void> => {
      return new Promise((resolve, reject) => {
        let settled = false;
        const timer = setTimeout(() => {
          if (!settled) {
            settled = true;
            try {
              ws.close();
            } catch {}
            reject(new Error('WebSocket connection timed out'));
          }
        }, timeoutMs);

        const ws = new WebSocket(url);

        ws.onopen = () => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          this.ws = ws;
          this.isConnected = true;
          try {
            ws.send(JSON.stringify({ type: 'session.start', token }));
          } catch (err) {
            console.error('Failed to send handshake frame', err);
          }
          resolve();
        };

        ws.onerror = () => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            reject(new Error('WebSocket connection failed'));
          }
        };

        ws.onclose = () => {
          this.isConnected = false;
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            this.handleServerMessage(msg);
          } catch (err) {
            console.error('Failed to parse WebSocket message', err);
          }
        };
      });
    };

    try {
      await tryConnect(primaryUrl);
    } catch {
      try {
        await tryConnect(fallbackUrl);
      } catch (err) {
        console.warn('Real-time WebSocket unavailable; operating via instant HTTP audio stream.', err);
        this.isConnected = false;
        this.callbacks.onSessionReady?.('Counterpart', 'Voice Practice');
      }
    }

    // Arm microphone capture if continuous call is active, unmuted, and assistant not speaking
    if (this.isContinuousCall && !this.isMuted && !this.isSpeaking) {
      setTimeout(() => {
        if (!this.isSpeaking && !this.isRecording) {
          this.startAudioCapture().catch((e) => console.warn('Mic auto-arm notice:', e));
        }
      }, 300);
    }
  }

  private handleServerMessage(msg: VoiceServerMessage): void {
    switch (msg.type) {
      case 'session.ready':
        if (msg.persona_name) {
          this.setPersona(msg.persona_name);
        }
        this.callbacks.onSessionReady?.(msg.persona_name || this.sessionPersonaName || '', msg.scenario_title || '');
        if (this.isContinuousCall && !this.isRecording && !this.isMuted) {
          setTimeout(() => {
            this.startAudioCapture().catch(() => {});
          }, 300);
        }
        break;
      case 'transcript.partial':
        this.callbacks.onTranscriptPartial?.(msg.text || '');
        break;
      case 'transcript.final':
        this.callbacks.onTranscriptFinal?.(msg.text || '');
        break;
      case 'assistant.text':
        this.callbacks.onAssistantText?.(msg.text || '');
        if (msg.text) {
          this.speakText(msg.text, msg.persona_name || this.sessionPersonaName);
        }
        break;
      case 'turn.complete':
        this.callbacks.onTurnComplete?.(msg.latency_ms || 0);
        break;
      case 'session.ended':
        this.stopSpeaking();
        this.callbacks.onSessionEnded?.(msg.status || 'completed');
        break;
      case 'error':
        this.callbacks.onError?.(msg.message || 'Voice error');
        break;
      default:
        break;
    }
  }

  /**
   * Start listening to the trainee's microphone via Web Speech API.
   * Completely avoids opening conflicting getUserMedia streams.
   */
  async startAudioCapture(forceUnlock = false): Promise<void> {
    if (this.isMuted) return;

    if (forceUnlock) {
      this.isSpeaking = false;
      this.isCommitting = false;
      this.networkErrorCount = 0;
      this.consecutiveFastRestarts = 0;
    }

    // Critical: Do NOT interrupt assistant speech when mic capture arms automatically!
    if (this.isSpeaking || this.isCommitting) {
      return;
    }

    // Guard against instant crash loops (e.g. invalid permission throwing in < 200ms)
    const now = Date.now();
    if (now - this.lastStartTimestamp < 200) {
      this.consecutiveFastRestarts++;
      if (this.consecutiveFastRestarts > 5) {
        console.warn('Speech recognition aborted too rapidly, backing off.');
        this.isRecording = false;
        this.callbacks.onMicStatusChange?.(false, this.isMuted);
        return;
      }
    } else {
      this.consecutiveFastRestarts = 0;
    }
    this.lastStartTimestamp = now;

    // Fully tear down any previous recognition instance before constructing a fresh one
    if (this.recognition) {
      try {
        this.recognition.onend = null;
        this.recognition.onerror = null;
        this.recognition.onresult = null;
        this.recognition.onspeechend = null;
        this.recognition.abort();
      } catch {}
      this.recognition = null;
    }

    const windowWithSpeech = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const SpeechRecognitionClass =
      windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      this.callbacks.onError?.(
        'Speech recognition requires Google Chrome, Microsoft Edge, or a Web Speech API browser.'
      );
      return;
    }

    try {
      this.isRecording = true;
      this.callbacks.onMicStatusChange?.(true, this.isMuted);

      const recog = new SpeechRecognitionClass();
      recog.continuous = true;
      recog.interimResults = true;
      recog.lang = this.recognitionLanguage || 'en-IN';
      recog.maxAlternatives = 1;

      let hadFatalError = false;

      recog.onstart = () => {
        this.consecutiveFastRestarts = 0;
        this.networkErrorCount = 0;
        this.isRecording = true;
        this.callbacks.onMicStatusChange?.(true, this.isMuted);
      };

      recog.onresult = (event: ISpeechRecognitionEvent) => {
        // If muted, assistant is speaking, or currently committing turn, ignore incoming audio
        if (this.isMuted || this.isSpeaking || this.isCommitting) return;

        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          const segment = (res[0]?.transcript || '').trim();
          if (!segment) continue;

          if (res.isFinal) {
            // Deduplicate segments
            if (!finalTranscript) {
              finalTranscript = segment;
            } else if (!finalTranscript.toLowerCase().endsWith(segment.toLowerCase())) {
              finalTranscript += ' ' + segment;
            }
          } else {
            interimTranscript = segment;
          }
        }

        const combined = (finalTranscript ? finalTranscript + (interimTranscript ? ' ' + interimTranscript : '') : interimTranscript).trim();
        const cleaned = this.dedupConsecutiveWords(combined);

        if (cleaned) {
          this.latestUtterance = cleaned;
          this.callbacks.onTranscriptPartial?.(cleaned);

          // 10-second safety deadline for very long uninterrupted speech
          if (!this.hardCommitTimer) {
            this.hardCommitTimer = setTimeout(() => {
              this.hardCommitTimer = null;
              if (this.latestUtterance && !this.isSpeaking && !this.isCommitting) {
                const words = this.latestUtterance.trim().split(/\s+/).filter(Boolean);
                if (words.length >= 2 || this.latestUtterance.trim().length >= 8) {
                  this.commitTurn(this.latestUtterance);
                }
              }
            }, 10000);
          }

          // Natural silence detection timer (1200ms allows natural conversational pacing)
          if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
          }

          const lastResult = event.results[event.results.length - 1];
          const isFinal = lastResult?.isFinal;
          const delayMs = isFinal ? 1200 : 1600;

          this.silenceTimer = setTimeout(() => {
            if (this.latestUtterance && !this.isSpeaking && !this.isCommitting) {
              const words = this.latestUtterance.trim().split(/\s+/).filter(Boolean);
              if (words.length >= 2 || this.latestUtterance.trim().length >= 8) {
                this.commitTurn(this.latestUtterance);
              }
            }
          }, delayMs);
        }
      };

      // Built-in speech cessation detection: fires when vocal sound ends
      recog.onspeechend = () => {
        if (this.isMuted || this.isSpeaking || this.isCommitting) return;
        const words = (this.latestUtterance || '').trim().split(/\s+/).filter(Boolean);
        if (words.length >= 2 || (this.latestUtterance || '').trim().length >= 8) {
          if (this.silenceTimer) clearTimeout(this.silenceTimer);
          // Wait 1000ms after speech cessation before committing
          this.silenceTimer = setTimeout(() => {
            if (this.latestUtterance && !this.isSpeaking && !this.isCommitting) {
              this.commitTurn(this.latestUtterance);
            }
          }, 1000);
        }
      };

      recog.onerror = (event: ISpeechRecognitionErrorEvent) => {
        if (event.error === 'not-allowed') {
          hadFatalError = true;
          this.isRecording = false;
          this.callbacks.onError?.('Microphone permission denied. Please allow microphone in your browser address bar.');
          this.callbacks.onMicStatusChange?.(false, this.isMuted);
        } else if (event.error === 'network') {
          hadFatalError = true;
          this.networkErrorCount++;
          console.warn(`Speech recognition notice: network error (occurrence ${this.networkErrorCount})`);
          // Critical: Never commit partial fragments on network error!
          this.latestUtterance = '';
          if (this.silenceTimer) clearTimeout(this.silenceTimer);
          if (this.hardCommitTimer) clearTimeout(this.hardCommitTimer);

          if (this.networkErrorCount >= 2) {
            this.isRecording = false;
            this.callbacks.onMicStatusChange?.(false, this.isMuted);
            this.callbacks.onError?.(
              'Browser speech recognition cloud connection interrupted. Tap "Tap to Speak" or type below.'
            );
          } else {
            this.callbacks.onError?.('Speech recognition reconnecting...');
          }
        } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.warn('Speech recognition notice:', event.error);
        }
      };

      recog.onend = () => {
        this.recognition = null;

        if (this.isSpeaking || this.isCommitting) {
          this.callbacks.onMicStatusChange?.(false, this.isMuted);
          return;
        }

        // If stopped due to fatal error (network or not-allowed), do NOT auto-commit!
        if (hadFatalError) {
          if (this.networkErrorCount === 1 && this.isContinuousCall && !this.isMuted) {
            // One gentle restart attempt with backoff
            if (this.restartTimeout) clearTimeout(this.restartTimeout);
            this.restartTimeout = setTimeout(() => {
              if (this.isRecording && !this.isMuted && !this.isSpeaking && !this.isCommitting) {
                this.startAudioCapture().catch(() => {});
              }
            }, 1500);
          } else {
            this.callbacks.onMicStatusChange?.(false, this.isMuted);
          }
          return;
        }

        // Reset network error count on successful session
        this.networkErrorCount = 0;

        // If user finished an utterance, commit it
        const trimmed = (this.latestUtterance || '').trim();
        const words = trimmed.split(/\s+/).filter(Boolean);
        if (words.length >= 2 && trimmed.length >= 5) {
          if (this.silenceTimer) clearTimeout(this.silenceTimer);
          if (this.hardCommitTimer) clearTimeout(this.hardCommitTimer);
          this.commitTurn(trimmed);
          return;
        }

        // Keep microphone listening if call is active and unmuted
        if (this.isRecording && !this.isMuted && !this.isSpeaking && !this.isCommitting) {
          if (this.restartTimeout) clearTimeout(this.restartTimeout);
          this.restartTimeout = setTimeout(() => {
            if (this.isRecording && !this.isMuted && !this.isSpeaking && !this.isCommitting) {
              this.startAudioCapture().catch(() => {});
            }
          }, 350);
        } else {
          this.callbacks.onMicStatusChange?.(false, this.isMuted);
        }
      };

      recog.start();
      this.recognition = recog;
    } catch (err: unknown) {
      console.warn('Speech recognition initialization error:', err);
      this.isRecording = false;
      this.callbacks.onMicStatusChange?.(false, this.isMuted);
      this.callbacks.onError?.('Microphone initialization failed. Please click Unmute or Tap to Speak.');
    }
  }

  stopAudioCapture(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.hardCommitTimer) {
      clearTimeout(this.hardCommitTimer);
      this.hardCommitTimer = null;
    }
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }

    this.isRecording = false;
    this.callbacks.onMicStatusChange?.(false, this.isMuted);

    if (this.recognition) {
      try {
        this.recognition.onend = null;
        this.recognition.onerror = null;
        this.recognition.onresult = null;
        this.recognition.onspeechend = null;
        this.recognition.abort();
      } catch {}
      this.recognition = null;
    }
  }

  /**
   * Commit the trainee's spoken utterance and trigger the counterpart response.
   */
  commitTurn(text?: string): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.hardCommitTimer) {
      clearTimeout(this.hardCommitTimer);
      this.hardCommitTimer = null;
    }

    if (this.isCommitting) return;

    const spokenText = (text || this.latestUtterance).trim();
    this.latestUtterance = '';

    if (!spokenText || spokenText.match(/^(\.|\s|\.\.\.)+$/)) {
      return;
    }

    this.isCommitting = true;
    this.isSpeaking = true;
    this.callbacks.onTranscriptFinal?.(spokenText);

    // Stop audio capture immediately upon turn commit so microphone doesn't pick up ambient sound
    this.stopAudioCapture();

    // 12-second safety watchdog: if turn response hangs, unlock automatically so call is never frozen
    if (this.watchdogTimer) clearTimeout(this.watchdogTimer);
    this.watchdogTimer = setTimeout(() => {
      if (this.isCommitting || this.isSpeaking) {
        console.warn('Voice turn watchdog: turn response timed out after 12s, releasing lock.');
        this.releaseTurnLock();
        this.callbacks.onError?.('Response took too long. Microphone is ready again.');
      }
    }, 12000);

    // Primary: Send over robust streaming HTTP API with NVIDIA NIM and full conversation context
    if (this.callbacks.onFallbackHttpSend) {
      this.callbacks.onFallbackHttpSend(spokenText);
    } else if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'audio.commit',
          text: spokenText,
        })
      );
    } else {
      console.error('No turn dispatch route available');
      this.releaseTurnLock();
    }
  }

  /**
   * Complete Deadlock Breaker: Resets all locks, stops any stalled playback, and re-arms mic.
   */
  public releaseTurnLock(): void {
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
    if (this.hardCommitTimer) {
      clearTimeout(this.hardCommitTimer);
      this.hardCommitTimer = null;
    }
    if (this.currentBufferSource) {
      try {
        this.currentBufferSource.stop();
        this.currentBufferSource.disconnect();
      } catch {}
      this.currentBufferSource = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }

    this.isSpeaking = false;
    this.isCommitting = false;
    this.latestUtterance = '';
    this.callbacks.onAssistantSpeaking?.(false);

    if (this.isContinuousCall && !this.isMuted) {
      setTimeout(() => {
        this.startAudioCapture().catch(() => {});
      }, 100);
    }
  }

  /**
   * Manual override: User taps "Done Speaking • Send Now" to send turn with 0ms delay.
   */
  forceCommitTurn(): void {
    if (this.latestUtterance.trim()) {
      this.commitTurn(this.latestUtterance);
    }
  }

  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    this.callbacks.onMicStatusChange?.(this.isRecording, this.isMuted);

    if (this.isMuted) {
      this.stopAudioCapture();
    } else if (this.isContinuousCall && !this.isSpeaking) {
      this.startAudioCapture().catch(() => {});
    }
    return this.isMuted;
  }

  stopSpeaking(): void {
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
    if (this.currentAudioElement) {
      try {
        this.currentAudioElement.pause();
        this.currentAudioElement.currentTime = 0;
      } catch {}
      this.currentAudioElement = null;
    }
    if (this.currentBufferSource) {
      try {
        this.currentBufferSource.stop();
        this.currentBufferSource.disconnect();
      } catch {}
      this.currentBufferSource = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    this.isSpeaking = false;
    this.isCommitting = false;
    this.callbacks.onAssistantSpeaking?.(false);
  }

  /**
   * Synthesize & speak counterpart text with authentic Neural Edge-TTS human voice.
   * Uses HTML5 Audio with instant streaming and proper browser autoplay handling.
   */
  async speakText(text: string, personaName: string = ''): Promise<void> {
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }

    if (!text || typeof window === 'undefined') {
      this.releaseTurnLock();
      return;
    }
    this.stopSpeaking();
    this.stopAudioCapture();

    // Clean formatting for natural spoken flow
    const clean = text
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/#+\s/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/•\s*/g, '')
      .replace(/—/g, ', ')
      .trim();

    if (!clean) {
      this.releaseTurnLock();
      return;
    }

    // Determine voice gender based on persona name or locked session persona
    const nameToTest = (personaName || this.sessionPersonaName || '').toLowerCase();
    const isFemale = /sarah|priya|elena|rachel|maya|jessica|emily|anna|claire|female/.test(nameToTest);
    const isMale = /marcus|david|james|carlos|vikram|tariq|michael|liam|jonathan|omar|rohan|kevin|alexander|daniel|andrew|guy|chris|male/.test(nameToTest);
    const voiceParam = isFemale ? 'female' : isMale ? 'male' : this.sessionVoiceGender;

    const isVercel = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');
    const apiHost = isVercel ? 'https://mrdev444-scenario-training-backend.hf.space' : '';
    const audioUrl = `${apiHost}/api/voice/tts?text=${encodeURIComponent(clean.slice(0, 600))}&voice=${voiceParam}`;

    this.isSpeaking = true;
    this.callbacks.onAssistantSpeaking?.(true);

    return new Promise<void>((resolve) => {
      let resolved = false;
      const onPlaybackComplete = () => {
        if (!resolved) {
          resolved = true;
          this.pendingSpeech = null;
          if (this.currentAudioElement) {
            try { this.currentAudioElement.pause(); } catch {}
            this.currentAudioElement = null;
          }
          this.currentBufferSource = null;
          this.isSpeaking = false;
          this.isCommitting = false;
          this.latestUtterance = '';
          this.callbacks.onAssistantSpeaking?.(false);

          if (this.isContinuousCall && !this.isMuted) {
            setTimeout(() => {
              this.startAudioCapture().catch(() => {});
            }, 120);
          }
          resolve();
        }
      };

      // Primary: Native HTML5 Audio stream from Neural Edge-TTS
      try {
        if (typeof Audio !== 'undefined') {
          const audio = new Audio(audioUrl);
          audio.preload = 'auto';
          this.currentAudioElement = audio;

          audio.onended = () => onPlaybackComplete();
          audio.onerror = () => {
            console.warn('HTML5 Audio playback error, falling back to Web Audio decoding...');
            this.playViaWebAudio(audioUrl, onPlaybackComplete);
          };

          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.catch((err: Error) => {
              console.warn('HTML5 Audio playback notice:', err.name);
              if (err.name === 'NotAllowedError') {
                // Autoplay blocked: store pending speech so first user click anywhere immediately plays it!
                this.pendingSpeech = { text: clean, personaName };
                this.isSpeaking = false;
                this.callbacks.onAssistantSpeaking?.(false);
                this.callbacks.onAutoplayBlocked?.();
                resolve();
              } else {
                this.playViaWebAudio(audioUrl, onPlaybackComplete);
              }
            });
          }
          return;
        }
      } catch (audioInitErr) {
        console.warn('HTML5 Audio init exception:', audioInitErr);
      }

      // Secondary fallback: Web Audio Buffer Source
      this.playViaWebAudio(audioUrl, onPlaybackComplete);
    });
  }

  private async playViaWebAudio(audioUrl: string, onComplete: () => void): Promise<void> {
    try {
      const ctx = await this.ensureAudioContext();
      let audioBuffer = this.ttsAudioCache.get(audioUrl);

      if (!audioBuffer) {
        const controller = new AbortController();
        const fetchTimeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(audioUrl, { signal: controller.signal });
        clearTimeout(fetchTimeout);

        if (!res.ok) {
          throw new Error(`Edge-TTS returned HTTP ${res.status}`);
        }
        const arrayBuffer = await res.arrayBuffer();
        audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        if (this.ttsAudioCache.size < 100) {
          this.ttsAudioCache.set(audioUrl, audioBuffer);
        }
      }

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      this.currentBufferSource = source;

      const durationMs = ((audioBuffer.duration || 3) * 1000) + 800;
      let completed = false;
      const finishBufferPlayback = () => {
        if (!completed) {
          completed = true;
          clearTimeout(bufferSafetyTimer);
          if (this.currentBufferSource === source) {
            onComplete();
          }
        }
      };

      const bufferSafetyTimer = setTimeout(finishBufferPlayback, durationMs);
      source.onended = finishBufferPlayback;
      source.start(0);
      return;
    } catch (audioErr) {
      console.warn('Neural Web Audio fallback notice:', audioErr);
      onComplete();
    }
  }

  interrupt(): void {
    this.stopSpeaking();
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'interrupt' }));
    }
    if (this.isContinuousCall && !this.isMuted) {
      this.startAudioCapture().catch(() => {});
    }
  }

  endSession(): void {
    this.disconnect();
  }

  disconnect(): void {
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
    this.stopAudioCapture();
    this.stopSpeaking();
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
  }
}
