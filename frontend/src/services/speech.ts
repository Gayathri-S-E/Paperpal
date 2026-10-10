export type PlaybackState = 'idle' | 'playing' | 'paused' | 'stopped';

export interface SpeechVoiceOption {
  name: string;
  lang: string;
  default: boolean;
}

class SpeechService {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private state: PlaybackState = 'idle';
  private rate: number = 1.0;
  private pitch: number = 1.0;
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private isSilent: boolean = false;
  private keepAliveTimer: number | null = null;

  // Listeners
  private onStateChangeCallback: ((state: PlaybackState) => void) | null = null;
  private onFinishedCallback: (() => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  public getVoices(): SpeechVoiceOption[] {
    if (!this.synth) return [];
    return this.synth.getVoices().map((v) => ({
      name: v.name,
      lang: v.lang,
      default: v.default,
    }));
  }

  private loadVoices(): void {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    // Default to a pleasant English voice if available
    const preferred = voices.find(
      (v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Aaron') || v.name.includes('Alex'))
    ) || voices.find((v) => v.lang.startsWith('en')) || voices[0];

    if (preferred && !this.selectedVoice) {
      this.selectedVoice = preferred;
    }
  }

  public setVoice(voiceName: string): void {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    const found = voices.find((v) => v.name === voiceName);
    if (found) {
      this.selectedVoice = found;
    }
  }

  public setRate(rate: number): void {
    this.rate = Math.max(0.5, Math.min(2.0, rate));
  }

  public setSilent(silent: boolean): void {
    this.isSilent = silent;
    if (silent && this.state === 'playing') {
      this.stop();
    }
  }

  public getState(): PlaybackState {
    return this.state;
  }

  public onStateChange(cb: (state: PlaybackState) => void): void {
    this.onStateChangeCallback = cb;
  }

  public onFinished(cb: () => void): void {
    this.onFinishedCallback = cb;
  }

  private setState(newState: PlaybackState): void {
    this.state = newState;
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(newState);
    }
  }

  public speak(text: string, onEnd?: () => void): void {
    if (!this.synth) {
      console.warn('SpeechSynthesis is not supported in this browser environment.');
      if (onEnd) onEnd();
      return;
    }

    // Cancel any ongoing speech
    this.stop();

    if (this.isSilent || !text.trim()) {
      this.setState('playing');
      // Simulate silent reading timing
      const words = text.trim().split(/\s+/).length;
      const readingDurationMs = Math.max(1500, (words / (200 * (this.rate || 1))) * 60 * 1000);
      const timer = window.setTimeout(() => {
        this.setState('idle');
        if (onEnd) onEnd();
        if (this.onFinishedCallback) this.onFinishedCallback();
      }, readingDurationMs);

      this.currentUtterance = { timer } as any;
      return;
    }

    // Clean text for clearer speech
    const cleanText = text
      .replace(/[\n\r]+/g, ' ')
      .replace(/\$([0-9,.]+)/g, '$1 dollars')
      .replace(/#/g, 'number ')
      .replace(/kWh/g, 'kilowatt hours');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = this.rate;
    utterance.pitch = this.pitch;

    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }

    utterance.onstart = () => {
      this.setState('playing');
      this.startKeepAlive();
    };

    utterance.onpause = () => {
      this.setState('paused');
    };

    utterance.onresume = () => {
      this.setState('playing');
    };

    utterance.onend = () => {
      this.stopKeepAlive();
      this.setState('idle');
      this.currentUtterance = null;
      if (onEnd) onEnd();
      if (this.onFinishedCallback) this.onFinishedCallback();
    };

    utterance.onerror = (e) => {
      this.stopKeepAlive();
      console.warn('SpeechSynthesis error:', e);
      this.setState('idle');
      this.currentUtterance = null;
      if (onEnd) onEnd();
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  public pause(): void {
    if (this.synth && this.state === 'playing') {
      this.synth.pause();
      this.setState('paused');
    }
  }

  public resume(): void {
    if (this.synth && this.state === 'paused') {
      this.synth.resume();
      this.setState('playing');
    }
  }

  public stop(): void {
    this.stopKeepAlive();
    if (this.currentUtterance && (this.currentUtterance as any).timer) {
      clearTimeout((this.currentUtterance as any).timer);
    }
    if (this.synth) {
      this.synth.cancel();
    }
    this.currentUtterance = null;
    this.setState('stopped');
  }

  // Workaround for Chromium 15-second speech pause bug
  private startKeepAlive(): void {
    this.stopKeepAlive();
    this.keepAliveTimer = window.setInterval(() => {
      if (this.synth && this.state === 'playing') {
        this.synth.pause();
        this.synth.resume();
      }
    }, 10000);
  }

  private stopKeepAlive(): void {
    if (this.keepAliveTimer !== null) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
  }
}

export const speechService = new SpeechService();
