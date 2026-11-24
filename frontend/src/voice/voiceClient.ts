import { api } from '../api/client';

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

export class VoiceClient {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private currentBufferSource: AudioBufferSourceNode | null = null;
  private currentAudioElement: HTMLAudioElement | null = null;
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
    return 'en-US';
  })();
  private micMediaStream: MediaStream | null = null;
  private callbacks: VoiceClientCallbacks;
  private ttsAudioCache = new Map<string, AudioBuffer>();
  private pendingSpeech: { text: string; personaName: string } | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  public useWhisperBackend = true;
  private vadInterval: ReturnType<typeof setInterval> | null = null;
  private vadSource: MediaStreamAudioSourceNode | null = null;
  private vadAnalyser: AnalyserNode | null = null;
  private isTranscribing = false;

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
      } catch (err) {
        console.debug('Failed to save preferred voice language:', err);
      }
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
    } catch (err) {
      console.debug('Audio prefetch skipped:', err);
    }
  }

  async connect(sessionId: string, token: string): Promise<void> {
    await this.ensureAudioContext().catch((ctxErr) => {
      console.debug('AudioContext ensure notice:', ctxErr);
    });

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
            } catch (closeErr) {
              console.debug('WebSocket close timeout notice:', closeErr);
            }
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
  }

  private handleServerMessage(msg: VoiceServerMessage): void {
    switch (msg.type) {
      case 'session.ready':
        if (msg.persona_name) {
          this.setPersona(msg.persona_name);
        }
        this.callbacks.onSessionReady?.(msg.persona_name || this.sessionPersonaName || '', msg.scenario_title || '');
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
   * Start listening to the trainee's microphone via pure native MediaRecorder + Whisper backend.
   * Eliminates Google Chrome Web Speech API network errors and browser dependency.
   */
  async startAudioCapture(forceUnlock = false): Promise<void> {
    if (this.isMuted) return;

    if (forceUnlock) {
      this.isSpeaking = false;
      this.isCommitting = false;
    }

    // Critical: Do NOT interrupt assistant speech when mic capture arms automatically!
    if (this.isSpeaking || this.isCommitting) {
      return;
    }

    await this.startMediaRecorderCapture();
  }

  /**
   * Immediate manual commit: called when trainee taps the microphone button to send response
   * without waiting for automatic silence detection.
   */
  public forceCommit(): void {
    if (this.vadInterval) {
      clearInterval(this.vadInterval);
      this.vadInterval = null;
    }
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      try {
        this.mediaRecorder.stop();
      } catch (err) {
        console.debug('Force commit stop notice:', err);
      }
    }
  }

  /**
   * Native audio capture via MediaRecorder with hardware echo cancellation and noise suppression.
   */
  async startMediaRecorderCapture(): Promise<void> {
    if (this.isMuted || this.isSpeaking || this.isCommitting || this.isTranscribing) return;
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') return;

    try {
      if (!this.micMediaStream || !this.micMediaStream.active) {
        this.micMediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      }

      this.recordedChunks = [];
      let mimeType = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        }
      }

      const recorder = new MediaRecorder(this.micMediaStream, { mimeType });
      this.mediaRecorder = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        if (this.vadInterval) {
          clearInterval(this.vadInterval);
          this.vadInterval = null;
        }

        if (this.recordedChunks.length === 0 || this.isCommitting || this.isSpeaking) return;
        const audioBlob = new Blob(this.recordedChunks, { type: mimeType });
        this.recordedChunks = [];

        // If audio blob is under 600 bytes, ignore as tap/ambient pop
        if (audioBlob.size < 600) {
          if (this.isContinuousCall && !this.isMuted && !this.isSpeaking && !this.isCommitting) {
            setTimeout(() => this.startMediaRecorderCapture(), 200);
          }
          return;
        }

        await this.transcribeAndCommit(audioBlob);
      };

      recorder.start(200);
      this.isRecording = true;
      this.callbacks.onMicStatusChange?.(true, this.isMuted);

      this.setupVAD();
    } catch (err: unknown) {
      console.warn('MediaRecorder mic capture notice:', err);
      this.isRecording = false;
      this.callbacks.onMicStatusChange?.(false, this.isMuted);
      this.callbacks.onError?.('Microphone access denied or unavailable. Please enable microphone permissions in your browser.');
    }
  }

  /**
   * FAANG-grade adaptive Voice Activity Detection:
   * Uses dual time-domain RMS + vocal formant frequency band detection.
   * Responsive 1.4s natural pause commit with 200ms speech gate.
   */
  private setupVAD(): void {
    if (!this.micMediaStream) return;
    try {
      if (!this.audioContext || this.audioContext.state === 'closed') {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.audioContext = new AudioCtx();
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }

      // Safely disconnect previous nodes
      if (this.vadSource) {
        try { this.vadSource.disconnect(); } catch {}
        this.vadSource = null;
      }
      if (this.vadAnalyser) {
        try { this.vadAnalyser.disconnect(); } catch {}
        this.vadAnalyser = null;
      }

      this.vadSource = this.audioContext.createMediaStreamSource(this.micMediaStream);
      this.vadAnalyser = this.audioContext.createAnalyser();
      this.vadAnalyser.fftSize = 512;
      this.vadSource.connect(this.vadAnalyser);

      const timeBuffer = new Uint8Array(this.vadAnalyser.fftSize);
      const freqBuffer = new Uint8Array(this.vadAnalyser.frequencyBinCount);
      let speechActive = false;
      let totalSpeechMs = 0;
      let lastSpeechTime = Date.now();
      const startTime = Date.now();
      let ambientNoiseEnergy = 0.005;
      let calibrationFrames = 0;

      if (this.vadInterval) clearInterval(this.vadInterval);

      this.vadInterval = setInterval(() => {
        if (!this.isRecording || this.isMuted || this.isSpeaking || this.isCommitting || this.isTranscribing) {
          return;
        }

        if (!this.vadAnalyser) return;
        this.vadAnalyser.getByteTimeDomainData(timeBuffer);
        this.vadAnalyser.getByteFrequencyData(freqBuffer);

        // 1. Calculate time-domain normalized RMS energy
        let sumSq = 0;
        for (let i = 0; i < timeBuffer.length; i++) {
          const norm = (timeBuffer[i] - 128) / 128;
          sumSq += norm * norm;
        }
        const rms = Math.sqrt(sumSq / timeBuffer.length);

        // 2. Calculate vocal frequency band energy (human voice 300Hz-3400Hz, bins 2 to 45)
        let vocalSum = 0;
        const maxBin = Math.min(45, freqBuffer.length);
        for (let i = 2; i < maxBin; i++) {
          vocalSum += freqBuffer[i];
        }
        const vocalAvg = vocalSum / (maxBin - 2);

        // Calibrate ambient baseline during first 300ms (3 frames)
        if (calibrationFrames < 3) {
          calibrationFrames++;
          ambientNoiseEnergy = Math.max(0.003, (ambientNoiseEnergy + rms) / 2);
          return;
        }

        // Sensitive, human-tuned voice threshold across all hardware
        const isVoiceDetected = rms > Math.max(0.005, ambientNoiseEnergy * 1.2) || vocalAvg > 10;

        if (isVoiceDetected) {
          lastSpeechTime = Date.now();
          totalSpeechMs += 100;
          if (!speechActive && totalSpeechMs >= 200) {
            speechActive = true;
            this.callbacks.onTranscriptPartial?.('Listening to your response... (Voice detected)');
          }
        } else if (speechActive && totalSpeechMs >= 300 && Date.now() - lastSpeechTime > 1200) {
          // Trainee finished speaking and paused for 1.2 seconds -> commit turn!
          speechActive = false;
          if (this.vadInterval) {
            clearInterval(this.vadInterval);
            this.vadInterval = null;
          }
          if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
          }
        } else if (Date.now() - startTime > 7000) {
          // Responsive 7-second automatic slice guard (avoids 25s dead silence if VAD is muted or AudioContext suspended)
          speechActive = false;
          if (this.vadInterval) {
            clearInterval(this.vadInterval);
            this.vadInterval = null;
          }
          if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
          }
        }
      }, 100);
    } catch (vadErr) {
      console.debug('VAD setup notice:', vadErr);
    }
  }

  /**
   * Transcribe recorded audio with self-hosted faster-whisper and send to dialogue engine.
   */
  private async transcribeAndCommit(audioBlob: Blob): Promise<void> {
    if (this.isCommitting || this.isSpeaking) return;
    this.isTranscribing = true;
    this.callbacks.onTranscriptPartial?.('Processing your response...');

    try {
      const result = await api.transcribeAudio(audioBlob);
      const transcribedText = this.dedupConsecutiveWords((result.text || '').trim());

      if (transcribedText && transcribedText.length > 1) {
        this.callbacks.onTranscriptFinal?.(transcribedText);
        this.commitTurn(transcribedText);
      } else {
        this.callbacks.onTranscriptPartial?.('No clear speech detected. Speak clearly into mic or type below.');
        setTimeout(() => {
          this.callbacks.onTranscriptPartial?.('');
        }, 2500);
        if (this.isContinuousCall && !this.isMuted && !this.isSpeaking && !this.isCommitting) {
          setTimeout(() => this.startMediaRecorderCapture(), 200);
        }
      }
    } catch (transcribeErr) {
      console.warn('Transcription service notice:', transcribeErr);
      this.callbacks.onTranscriptPartial?.('Transcription connection notice. Tap mic to retry or type below.');
      setTimeout(() => {
        this.callbacks.onTranscriptPartial?.('');
      }, 2500);
      if (this.isContinuousCall && !this.isMuted && !this.isSpeaking && !this.isCommitting) {
        setTimeout(() => this.startMediaRecorderCapture(), 300);
      }
    } finally {
      this.isTranscribing = false;
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
    if (this.vadInterval) {
      clearInterval(this.vadInterval);
      this.vadInterval = null;
    }

    if (this.vadSource) {
      try { this.vadSource.disconnect(); } catch {}
      this.vadSource = null;
    }
    if (this.vadAnalyser) {
      try { this.vadAnalyser.disconnect(); } catch {}
      this.vadAnalyser = null;
    }

    this.isRecording = false;
    this.callbacks.onMicStatusChange?.(false, this.isMuted);

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (recErr) {
        console.debug('MediaRecorder stop notice:', recErr);
      }
      this.mediaRecorder = null;
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
      } catch (stopErr) {
        console.debug('BufferSource stop notice:', stopErr);
      }
      this.currentBufferSource = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (cancelErr) {
        console.debug('SpeechSynthesis cancel notice:', cancelErr);
      }
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
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      try {
        this.mediaRecorder.stop();
      } catch (err) {
        console.debug('MediaRecorder force commit notice:', err);
      }
      return;
    }
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
      } catch (pauseErr) {
        console.debug('Audio element pause notice:', pauseErr);
      }
      this.currentAudioElement = null;
    }
    if (this.currentBufferSource) {
      try {
        this.currentBufferSource.stop();
        this.currentBufferSource.disconnect();
      } catch (stopErr) {
        console.debug('BufferSource stop notice:', stopErr);
      }
      this.currentBufferSource = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (cancelErr) {
        console.debug('SpeechSynthesis cancel notice:', cancelErr);
      }
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

    return new Promise<void>(async (resolve) => {
      let resolved = false;
      let watchdogTimer: ReturnType<typeof setTimeout> | null = null;

      const onPlaybackComplete = () => {
        if (!resolved) {
          resolved = true;
          if (watchdogTimer) {
            clearTimeout(watchdogTimer);
            watchdogTimer = null;
          }
          this.pendingSpeech = null;
          if (this.currentBufferSource) {
            try {
              this.currentBufferSource.stop();
              this.currentBufferSource.disconnect();
            } catch (bufErr) {
              console.debug('BufferSource disconnect notice:', bufErr);
            }
            this.currentBufferSource = null;
          }
          if (this.currentAudioElement) {
            try {
              this.currentAudioElement.pause();
              if (this.currentAudioElement.parentNode) {
                this.currentAudioElement.parentNode.removeChild(this.currentAudioElement);
              }
            } catch (pauseErr) {
              console.debug('Playback complete audio pause notice:', pauseErr);
            }
            this.currentAudioElement = null;
          }
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

      // 1. Primary Engine: High-fidelity Web Audio Buffer Source
      // Immune to Chromium's detached-DOM bug, handles instant playback from in-memory cache, accurate duration
      try {
        const ctx = await this.ensureAudioContext();
        if (ctx.state === 'suspended') {
          await ctx.resume().catch(() => {});
        }
        if (ctx.state === 'running') {
          await this.playViaWebAudio(audioUrl, onPlaybackComplete);
          return;
        }
      } catch (webAudioErr) {
        console.warn('Web Audio primary attempt notice:', webAudioErr);
      }

      // 2. Secondary Engine: Native HTML5 Audio (attached to DOM to guarantee ended event in Chromium)
      try {
        if (typeof Audio !== 'undefined') {
          const audio = new Audio();
          audio.src = audioUrl;
          audio.preload = 'auto';
          audio.style.display = 'none';
          document.body.appendChild(audio);
          this.currentAudioElement = audio;

          // Safety watchdog for HTML5 Audio fallback
          const wordCount = clean.split(/\s+/).filter(Boolean).length;
          const maxDurationMs = Math.max(5000, Math.ceil(wordCount / 2.0) * 1000 + 3000);
          watchdogTimer = setTimeout(() => {
            console.warn(`HTML5 Audio fallback watchdog (${maxDurationMs}ms), proceeding with turn...`);
            onPlaybackComplete();
          }, maxDurationMs);

          audio.onended = () => onPlaybackComplete();
          audio.onerror = () => {
            console.warn('HTML5 Audio playback error notice');
            onPlaybackComplete();
          };

          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.catch((err: Error) => {
              if (err.name === 'AbortError') return;
              if (err.name === 'NotAllowedError') {
                console.warn('HTML5 Audio autoplay blocked by browser policy. Storing pending speech for direct user tap.');
                this.pendingSpeech = { text: clean, personaName };
                this.isSpeaking = false;
                this.isCommitting = false;
                this.callbacks.onAssistantSpeaking?.(false);
                this.callbacks.onAutoplayBlocked?.();
                if (watchdogTimer) {
                  clearTimeout(watchdogTimer);
                  watchdogTimer = null;
                }
                resolve();
                return;
              }
              onPlaybackComplete();
            });
          }
          return;
        }
      } catch (audioInitErr) {
        console.warn('HTML5 Audio init exception:', audioInitErr);
      }

      // 3. Fallback: complete playback lock so conversation is never stalled
      onPlaybackComplete();
    });
  }

  private async playViaWebAudio(audioUrl: string, onComplete: () => void): Promise<void> {
    const ctx = await this.ensureAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {});
    }
    if (ctx.state === 'suspended') {
      throw new Error('AudioContext suspended by browser autoplay policy');
    }

    try {
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
    if (this.micMediaStream) {
      try {
        this.micMediaStream.getTracks().forEach((t) => t.stop());
      } catch (trackErr) {
        console.debug('MediaStream track stop notice:', trackErr);
      }
      this.micMediaStream = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch (closeErr) {
        console.debug('WebSocket disconnect notice:', closeErr);
      }
      this.ws = null;
    }
  }
}
