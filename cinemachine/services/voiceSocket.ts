export type VoiceSocketState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

export interface VoiceSocketCallbacks {
  onStateChange: (state: VoiceSocketState) => void;
  onAudioData: (data: ArrayBuffer) => void;
  onCommand: (action: 'START_RECORDING' | 'STOP_RECORDING') => void;
  onStoryContext: (context: {
    character: string;
    setting: string;
    plot: string;
  }) => void;
  onTranscript: (text: string) => void;
  onError: (error: string) => void;
}

const BASE_URL = 'wss://cinemachine-api-684023745855.us-central1.run.app';

export class VoiceSocket {
  private ws: WebSocket | null = null;
  private callbacks: VoiceSocketCallbacks;
  private kidId: string;
  private token: string;
  private _state: VoiceSocketState = 'disconnected';
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    kidId: string,
    token: string,
    callbacks: VoiceSocketCallbacks
  ) {
    this.kidId = kidId;
    this.token = token;
    this.callbacks = callbacks;
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  get state(): VoiceSocketState {
    return this._state;
  }

  connect(): void {
    if (this.ws) {
      this.disconnect();
    }

    this.setState('connecting');

    const url = `${BASE_URL}/ws/voice/${this.kidId}?token=${encodeURIComponent(
      this.token
    )}`;

    try {
      this.ws = new WebSocket(url);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        this.setState('connected');
      };

      this.ws.onmessage = (event: MessageEvent) => {
        this.handleMessage(event);
      };

      this.ws.onerror = (event: Event) => {
        console.warn('[VoiceSocket] WebSocket error', event);
        this.setState('error');
        this.callbacks.onError('WebSocket connection error');
      };

      this.ws.onclose = () => {
        if (this._state !== 'disconnected') {
          // Unexpected close — transition to error so the UI can react
          this.setState('error');
          this.callbacks.onError('WebSocket connection closed unexpectedly');
        }
        this.ws = null;
      };
    } catch (err) {
      this.setState('error');
      this.callbacks.onError(
        err instanceof Error ? err.message : 'Failed to create WebSocket'
      );
    }
  }

  sendAudio(data: ArrayBuffer): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.setState('disconnected');
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }

  // -----------------------------------------------------------------------
  // Internal
  // -----------------------------------------------------------------------

  private setState(state: VoiceSocketState): void {
    this._state = state;
    this.callbacks.onStateChange(state);
  }

  private handleMessage(event: MessageEvent): void {
    // Binary message — audio data from Gemini
    if (event.data instanceof ArrayBuffer) {
      this.callbacks.onAudioData(event.data);
      return;
    }

    // Text message — JSON
    try {
      const msg = JSON.parse(event.data as string);

      switch (msg.type) {
        case 'command':
          if (
            msg.action === 'START_RECORDING' ||
            msg.action === 'STOP_RECORDING'
          ) {
            this.callbacks.onCommand(msg.action);
          }
          break;

        case 'story_context':
          this.callbacks.onStoryContext({
            character: msg.character,
            setting: msg.setting,
            plot: msg.plot,
          });
          break;

        case 'transcript':
          this.callbacks.onTranscript(msg.text);
          break;

        default:
          // Unknown message type — ignore gracefully
          break;
      }
    } catch {
      console.warn(
        '[VoiceSocket] Failed to parse text message:',
        event.data
      );
    }
  }
}
