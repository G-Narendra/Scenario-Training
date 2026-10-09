export interface VoiceClientCallbacks {
  onSessionReady?: (personaName: string, scenarioTitle: string) => void;
  onTranscriptPartial?: (text: string) => void;
  onTranscriptFinal?: (text: string) => void;
  onAssistantText?: (text: string) => void;
  onAssistantSpeaking?: (isSpeaking: boolean) => void;
  onTurnComplete?: (latencyMs: number) => void;
  onError?: (err: string) => void;
  onSessionEnded?: (status: string) => void;
}

export class VoiceClient {
  private ws: WebSocket | null = null;
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private isConnected = false;
  private isRecording = false;
  private callbacks: VoiceClientCallbacks;

  constructor(callbacks: VoiceClientCallbacks = {}) {
    this.callbacks = callbacks;
  }

  async connect(sessionId: string, token: string): Promise<void> {
    const isDevPort = window.location.port === '5173';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const hostDirect = `${protocol === 'wss:' ? 'wss:' : 'ws:'}//${window.location.hostname || '127.0.0.1'}:8000`;
    const hostProxy = `${protocol}//${window.location.host}`;

    // When running under Vite dev server (port 5173), try direct connection to backend first
    const primaryUrl = isDevPort
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

  private handleServerMessage(msg: any): void {
    switch (msg.type) {
      case 'session.ready':
        this.callbacks.onSessionReady?.(msg.persona_name, msg.scenario_title);
        break;
      case 'transcript.partial':
        this.callbacks.onTranscriptPartial?.(msg.text);
        break;
      case 'transcript.final':
        this.callbacks.onTranscriptFinal?.(msg.text);
        break;
      case 'assistant.text':
        this.callbacks.onAssistantText?.(msg.text);
        break;
      case 'assistant.audio':
        this.callbacks.onAssistantSpeaking?.(true);
        if (msg.is_final) {
          this.callbacks.onAssistantSpeaking?.(false);
        }
        break;
      case 'turn.complete':
        this.callbacks.onAssistantSpeaking?.(false);
        this.callbacks.onTurnComplete?.(msg.latency_ms);
        break;
      case 'session.ended':
        this.callbacks.onSessionEnded?.(msg.status);
        break;
      case 'error':
        this.callbacks.onError?.(msg.message);
        break;
      default:
        break;
    }
  }

  async startAudioCapture(): Promise<void> {
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
        },
      });

      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });
      await this.audioContext.resume();
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (e) => {
        if (!this.isRecording || !this.isConnected || !this.ws) return;
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
    } catch (err: any) {
      console.warn('Microphone access denied or audio capture failed', err);
      this.callbacks.onError?.('Microphone access required for voice mode. Please grant microphone permission.');
      throw err;
    }
  }

  stopAudioCapture(): void {
    this.isRecording = false;
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
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify({ type: 'audio.commit' }));
    }
  }

  interrupt(): void {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify({ type: 'interrupt' }));
      this.callbacks.onAssistantSpeaking?.(false);
    }
  }

  endSession(): void {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify({ type: 'session.end' }));
    }
    this.stopAudioCapture();
  }

  disconnect(): void {
    this.stopAudioCapture();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }
}
