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
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private recognition: any = null;
  private currentTurnTranscript = '';
  public activeUtterance: SpeechSynthesisUtterance | null = null;
  private isConnected = false;
  private isRecording = false;
  private isMuted = false;
  private isSpeaking = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private silenceTimer: any = null;
  public isContinuousCall = true;
  private callbacks: VoiceClientCallbacks;

  constructor(callbacks: VoiceClientCallbacks = {}) {
    this.callbacks = callbacks;
  }

  async connect(sessionId: string, token: string): Promise<void> {
    const isDevPort = window.location.port === '5173';
    const isVercel = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const hostDirect = `${protocol === 'wss:' ? 'wss:' : 'ws:'}//${window.location.hostname || '127.0.0.1'}:8000`;
    const hostProxy = isVercel
      ? 'wss://scenariolab-api.onrender.com'
      : `${protocol}//${window.location.host}`;

    // When running under Vite dev server (port 5173), try direct connection to backend first
    const primaryUrl = isVercel
      ? `wss://scenariolab-api.onrender.com/api/sessions/${sessionId}/voice?token=${encodeURIComponent(token)}`
      : isDevPort
      ? `${hostDirect}/api/sessions/${sessionId}/voice?token=${encodeURIComponent(token)}`
      : `${hostProxy}/api/sessions/${sessionId}/voice?token=${encodeURIComponent(token)}`;
    const fallbackUrl = isDevPort
      ? `${hostProxy}/api/sessions/${sessionId}/voice?token=${encodeURIComponent(token)}`
      : `${hostDirect}/api/sessions/${sessionId}/voice?token=${encodeURIComponent(token)}`;

    const tryConnect = (url: string, timeoutMs = 6000): Promise<void> => {
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
          // Send handshake frame with token
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
          } else {
            this.callbacks.onError?.('Voice connection interrupted.');
          }
        };

        ws.onclose = () => {
          this.isConnected = false;
          this.stopAudioCapture();
          this.stopSpeaking();
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
        this.callbacks.onError?.('Real-time voice service unavailable. You can continue in Text Mode.');
        throw err;
      }
    }
  }

  private handleServerMessage(msg: VoiceServerMessage): void {
    switch (msg.type) {
      case 'session.ready':
        this.callbacks.onSessionReady?.(msg.persona_name || '', msg.scenario_title || '');
        // In continuous hands-free mode, arm mic immediately so student is in a live active conversation
        if (this.isContinuousCall && !this.isRecording && !this.isMuted) {
          setTimeout(() => {
            this.startAudioCapture().catch(() => {});
          }, 400);
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
          this.speakText(msg.text);
        }
        break;
      case 'assistant.audio':
        this.callbacks.onAssistantSpeaking?.(true);
        if (msg.is_final) {
          this.callbacks.onAssistantSpeaking?.(false);
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

  async startAudioCapture(): Promise<void> {
    if (this.isMuted) return;

    // Barge-in: if counterpart was still speaking when trainee begins, stop immediately
    if (this.isSpeaking) {
      this.interrupt();
    }

    if (this.isRecording) {
      return; // Already capturing
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone audio capture not supported in this browser environment.');
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioCtx({
        sampleRate: 16000,
      });
      await this.audioContext.resume();
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (e) => {
        if (!this.isRecording || !this.isConnected || !this.ws || this.isMuted) return;
        const inputData = e.inputBuffer.getChannelData(0);

        // Convert Float32 to 16-bit PCM
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        // Base64 encode
        const bytes = new Uint8Array(pcm16.buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const b64 = window.btoa(binary);

        this.ws.send(JSON.stringify({ type: 'audio.chunk', data: b64 }));
      };

      source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      this.isRecording = true;
      this.callbacks.onMicStatusChange?.(true, this.isMuted);

      // Initialize Web Speech Recognition for accurate, real-time client-side STT & VAD
      const windowWithSpeech = window as unknown as {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        SpeechRecognition?: any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        webkitSpeechRecognition?: any;
      };
      const SpeechRecognition =
        windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;

      this.currentTurnTranscript = '';

      if (SpeechRecognition) {
        try {
          const recog = new SpeechRecognition();
          recog.continuous = true;
          recog.interimResults = true;
          recog.lang = 'en-US';
          recog.maxAlternatives = 1;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          recog.onresult = (event: any) => {
            if (this.isMuted) return;

            // Barge-in: if the student speaks while assistant is speaking, interrupt assistant immediately
            if (this.isSpeaking) {
              this.interrupt();
            }

            let interim = '';
            let finalized = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
              const transcript = event.results[i][0].transcript;
              if (event.results[i].isFinal) {
                finalized += transcript + ' ';
              } else {
                interim += transcript;
              }
            }

            if (finalized) {
              this.currentTurnTranscript = (this.currentTurnTranscript + ' ' + finalized).trim();
            }

            const livePreview = (this.currentTurnTranscript + ' ' + interim).trim();
            if (livePreview) {
              this.callbacks.onTranscriptPartial?.(livePreview);

              // Auto-VAD: Reset silence timer whenever words are heard
              if (this.silenceTimer) {
                clearTimeout(this.silenceTimer);
                this.silenceTimer = null;
              }

              // In continuous hands-free mode: if speaker pauses for 1.3s after speaking a coherent thought, auto-commit
              if (this.isContinuousCall && livePreview.length >= 3) {
                this.silenceTimer = setTimeout(() => {
                  this.handleAutoCommit();
                }, 1300);
              }
            }
          };

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          recog.onerror = (event: any) => {
            if (event.error !== 'no-speech' && event.error !== 'aborted') {
              console.warn('Speech recognition notice:', event.error);
            }
          };

          recog.onend = () => {
            // Keep speech recognition alive during active recording turn
            if (this.isRecording && !this.isMuted && this.recognition) {
              try {
                recog.start();
              } catch {}
            }
          };

          recog.start();
          this.recognition = recog;
        } catch (e) {
          console.warn('Web Speech Recognition initialization failed:', e);
        }
      }
    } catch (err: unknown) {
      console.warn('Microphone access denied or audio capture failed', err);
      this.callbacks.onError?.(
        'Microphone access required for voice mode. Please grant microphone permission.'
      );
      throw err;
    }
  }

  private handleAutoCommit(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    const textToCommit = this.currentTurnTranscript.trim();
    // Only commit if there is real meaningful speech (avoid empty strings or noise)
    if (textToCommit && !textToCommit.match(/^(\.|\s|\.\.\.)+$/)) {
      this.commitTurn();
    }
  }

  stopAudioCapture(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    this.isRecording = false;
    this.callbacks.onMicStatusChange?.(false, this.isMuted);

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
      this.recognition = null;
    }

    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
  }

  commitTurn(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    const spokenText = this.currentTurnTranscript.trim();
    this.currentTurnTranscript = '';

    // Temporarily pause mic capture while counterpart processes and responds
    this.stopAudioCapture();

    if (this.ws && this.isConnected) {
      if (spokenText && !spokenText.match(/^(\.|\s|\.\.\.)+$/)) {
        this.ws.send(
          JSON.stringify({
            type: 'audio.commit',
            text: spokenText,
          })
        );
        this.callbacks.onTranscriptFinal?.(spokenText);
      }
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
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    this.activeUtterance = null;
    this.isSpeaking = false;
    this.callbacks.onAssistantSpeaking?.(false);
  }

  speakText(text: string): void {
    if (!text || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    this.stopSpeaking();

    // Clean any markdown formatting, asterisks, bullet points for natural human speech flow
    const clean = text
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/#+\s/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/•\s*/g, '')
      .replace(/—/g, ', ')
      .trim();

    if (!clean) return;

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.0; // Natural executive pacing
    utterance.pitch = 1.0;
    utterance.lang = 'en-US';

    // Prioritize natural neural voices (e.g. Microsoft Natural, Google US English, Apple Samantha)
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice =
      voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Natural') ||
            v.name.includes('Online') ||
            v.name.includes('Jenny') ||
            v.name.includes('Guy') ||
            v.name.includes('Aria') ||
            v.name.includes('Neural'))
      ) ||
      voices.find((v) => v.lang.startsWith('en') && v.name.includes('Google')) ||
      voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Samantha') || v.name.includes('Daniel'))) ||
      voices.find((v) => v.lang.startsWith('en')) ||
      voices[0];

    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
      this.callbacks.onAssistantSpeaking?.(true);
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.callbacks.onAssistantSpeaking?.(false);
      this.activeUtterance = null;

      // In continuous call mode: auto-rearm microphone as soon as counterpart finishes speaking!
      if (this.isContinuousCall && !this.isMuted && this.isConnected) {
        setTimeout(() => {
          this.startAudioCapture().catch(() => {});
        }, 300);
      }
    };

    utterance.onerror = (e) => {
      console.warn('SpeechSynthesis error:', e);
      this.isSpeaking = false;
      this.callbacks.onAssistantSpeaking?.(false);
      this.activeUtterance = null;

      if (this.isContinuousCall && !this.isMuted && this.isConnected) {
        this.startAudioCapture().catch(() => {});
      }
    };

    this.activeUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  interrupt(): void {
    this.stopSpeaking();
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify({ type: 'interrupt' }));
    }
    this.callbacks.onAssistantSpeaking?.(false);
  }

  endSession(): void {
    this.stopSpeaking();
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify({ type: 'session.end' }));
    }
    this.stopAudioCapture();
  }

  disconnect(): void {
    this.stopSpeaking();
    this.stopAudioCapture();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }
}
