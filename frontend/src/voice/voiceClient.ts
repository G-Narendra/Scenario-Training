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

export class VoiceClient {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private currentBufferSource: AudioBufferSourceNode | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private recognition: any = null;
  private latestUtterance = '';
  public isConnected = false;
  private isRecording = false;
  private isMuted = false;
  private isSpeaking = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private silenceTimer: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private restartTimeout: any = null;
  public isContinuousCall = true;
  public sessionPersonaName = '';
  public sessionVoiceGender: 'male' | 'female' = 'male';
  private callbacks: VoiceClientCallbacks;
  private ttsAudioCache = new Map<string, AudioBuffer>();

  constructor(callbacks: VoiceClientCallbacks = {}) {
    this.callbacks = callbacks;
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
    if (!this.audioContext || this.audioContext.state === 'closed') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioCtx({ sampleRate: 24000 });
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    return this.audioContext;
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
    const apiHost = isVercel ? 'https://scenariolab-api.onrender.com' : '';
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
      ? 'wss://scenariolab-api.onrender.com'
      : `${protocol}//${window.location.host}`;

    const primaryUrl = isVercel
      ? `wss://scenariolab-api.onrender.com/api/sessions/${sessionId}/voice?token=${encodeURIComponent(token)}`
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
  async startAudioCapture(): Promise<void> {
    if (this.isMuted) return;

    if (this.isSpeaking) {
      this.interrupt();
    }

    if (this.isRecording && this.recognition) {
      return;
    }

    const windowWithSpeech = window as unknown as {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      SpeechRecognition?: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      webkitSpeechRecognition?: any;
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

      if (this.recognition) {
        try {
          this.recognition.abort();
        } catch {}
        this.recognition = null;
      }

      const recog = new SpeechRecognitionClass();
      recog.continuous = true;
      recog.interimResults = true;
      recog.lang = 'en-US';
      recog.maxAlternatives = 1;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recog.onresult = (event: any) => {
        // If muted or assistant is actively speaking, ignore to avoid feedback loop
        if (this.isMuted || this.isSpeaking) return;

        // Accumulate full utterance across all results for the active turn so no words are dropped
        let currentUtterance = '';
        let isFinalChunk = false;
        for (let i = 0; i < event.results.length; ++i) {
          const piece = event.results[i][0]?.transcript || '';
          if (piece) {
            currentUtterance += piece + ' ';
          }
          if (event.results[i].isFinal) {
            isFinalChunk = true;
          }
        }

        const trimmed = currentUtterance.trim();
        if (trimmed) {
          this.latestUtterance = trimmed;
          this.callbacks.onTranscriptPartial?.(trimmed);

          // Clear any pending silence commit timer
          if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
          }

          // Natural human conversational silence detection:
          // If the chunk was finalized by speech engine, commit after 500ms.
          // If interim, allow 850ms so trainee can pause to breathe without getting cut off.
          if (this.isContinuousCall && trimmed.length >= 2) {
            const delayMs = isFinalChunk ? 500 : 850;
            this.silenceTimer = setTimeout(() => {
              if (this.latestUtterance && !this.isSpeaking) {
                this.commitTurn(trimmed);
              }
            }, delayMs);
          }
        }
      };

      // Built-in speech cessation detection: fires the exact millisecond vocal sound ends
      recog.onspeechend = () => {
        if (this.isMuted || this.isSpeaking) return;
        if (this.latestUtterance && this.latestUtterance.length >= 2) {
          if (this.silenceTimer) clearTimeout(this.silenceTimer);
          this.silenceTimer = setTimeout(() => {
            if (this.latestUtterance && !this.isSpeaking) {
              this.commitTurn(this.latestUtterance);
            }
          }, 350);
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recog.onerror = (event: any) => {
        if (event.error === 'not-allowed') {
          this.callbacks.onError?.('Microphone permission denied. Please allow microphone in your browser address bar.');
          this.isRecording = false;
          this.callbacks.onMicStatusChange?.(false, this.isMuted);
        } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.warn('Speech recognition notice:', event.error);
        }
      };

      recog.onend = () => {
        // Auto-rearm speech recognition if continuous call is active and user didn't mute or speak
        if (this.isRecording && !this.isMuted && !this.isSpeaking) {
          if (this.restartTimeout) clearTimeout(this.restartTimeout);
          this.restartTimeout = setTimeout(() => {
            if (this.isRecording && !this.isMuted && !this.isSpeaking) {
              try {
                this.recognition?.start();
              } catch (e) {
                console.warn('Recognition auto-restart notice:', e);
              }
            }
          }, 150);
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
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }

    this.isRecording = false;
    this.callbacks.onMicStatusChange?.(false, this.isMuted);

    if (this.recognition) {
      try {
        this.recognition.stop();
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

    const spokenText = (text || this.latestUtterance).trim();
    this.latestUtterance = '';

    if (!spokenText || spokenText.match(/^(\.|\s|\.\.\.)+$/)) {
      return;
    }

    // Set speaking flag immediately to ignore room echo while counterpart processes
    this.isSpeaking = true;
    this.callbacks.onTranscriptFinal?.(spokenText);

    // Stop audio capture immediately upon turn commit so microphone doesn't pick up ambient sound
    this.stopAudioCapture();

    // Primary: Send over WebSocket if open
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'audio.commit',
          text: spokenText,
        })
      );
    } else if (this.callbacks.onFallbackHttpSend) {
      // Bulletproof Fallback: Send over streaming HTTP API
      this.callbacks.onFallbackHttpSend(spokenText);
    } else {
      console.error('No turn dispatch route available (WS closed and onFallbackHttpSend missing)');
      this.isSpeaking = false;
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
    if (this.currentBufferSource) {
      try {
        this.currentBufferSource.stop();
        this.currentBufferSource.disconnect();
      } catch {}
      this.currentBufferSource = null;
    }
    this.isSpeaking = false;
    this.callbacks.onAssistantSpeaking?.(false);
  }

  /**
   * Synthesize & speak counterpart text using Microsoft Edge Neural TTS via Web Audio API.
   * Completely bypasses robotic desktop window.speechSynthesis for 100% human neural voice.
   */
  async speakText(text: string, personaName: string = ''): Promise<void> {
    if (!text || typeof window === 'undefined') {
      this.isSpeaking = false;
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
      this.isSpeaking = false;
      return;
    }

    // Determine voice gender based on persona name or locked session persona
    const nameToTest = (personaName || this.sessionPersonaName || '').toLowerCase();
    const isFemale = /sarah|priya|elena|rachel|maya|jessica|emily|anna|claire|female/.test(nameToTest);
    const isMale = /marcus|david|james|carlos|vikram|tariq|michael|liam|jonathan|omar|rohan|kevin|alexander|daniel|andrew|guy|chris|male/.test(nameToTest);
    const voiceParam = isFemale ? 'female' : isMale ? 'male' : this.sessionVoiceGender;

    const isVercel = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');
    const apiHost = isVercel ? 'https://scenariolab-api.onrender.com' : '';
    const audioUrl = `${apiHost}/api/voice/tts?text=${encodeURIComponent(clean.slice(0, 600))}&voice=${voiceParam}`;

    try {
      const ctx = await this.ensureAudioContext();

      let audioBuffer = this.ttsAudioCache.get(audioUrl);
      if (!audioBuffer) {
        const res = await fetch(audioUrl);
        if (!res.ok) {
          throw new Error(`Edge-TTS endpoint returned HTTP ${res.status}`);
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
      this.isSpeaking = true;
      this.callbacks.onAssistantSpeaking?.(true);

      source.onended = () => {
        if (this.currentBufferSource === source) {
          this.currentBufferSource = null;
          this.isSpeaking = false;
          this.callbacks.onAssistantSpeaking?.(false);
          this.latestUtterance = '';

          // Re-arm speech recognition in hands-free mode
          if (this.isContinuousCall && !this.isMuted) {
            setTimeout(() => {
              this.startAudioCapture().catch(() => {});
            }, 100);
          }
        }
      };

      source.start(0);
    } catch (err) {
      console.warn('Neural audio playback notice, attempting direct Audio element fallback:', err);
      try {
        const audio = new Audio(audioUrl);
        audio.onplay = () => {
          this.isSpeaking = true;
          this.callbacks.onAssistantSpeaking?.(true);
        };
        audio.onended = () => {
          this.isSpeaking = false;
          this.callbacks.onAssistantSpeaking?.(false);
          this.latestUtterance = '';
          if (this.isContinuousCall && !this.isMuted) {
            setTimeout(() => {
              this.startAudioCapture().catch(() => {});
            }, 100);
          }
        };
        await audio.play();
      } catch (audioErr) {
        console.error('All neural TTS playback channels failed:', audioErr);
        this.isSpeaking = false;
        this.callbacks.onAssistantSpeaking?.(false);
        if (this.isContinuousCall && !this.isMuted) {
          setTimeout(() => {
            this.startAudioCapture().catch(() => {});
          }, 100);
        }
      }
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
