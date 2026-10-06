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
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/sessions/${sessionId}/voice`;

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        // Handshake
        this.ws?.send(JSON.stringify({ type: 'session.start', token }));
        resolve();
      };

      this.ws.onerror = (e) => {
        console.error('WebSocket error in VoiceClient', e);
        this.callbacks.onError?.('Failed to establish real-time voice connection.');
        reject(e);
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.stopAudioCapture();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleServerMessage(msg);
        } catch (err) {
          console.error('Failed to parse WebSocket message', err);
        }
      };
    });
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
      this.callbacks.onError?.('Microphone access required for voice mode.');
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
