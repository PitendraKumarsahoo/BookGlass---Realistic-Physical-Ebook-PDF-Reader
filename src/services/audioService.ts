/**
 * Realistic Page Turn Audio Engine for BookGlass
 * Uses Web Audio API paper synthesis (white-noise bandpass flutter + page flick + landing thud)
 * with randomization, plus fallback hooks for custom /public/sounds/ audio files.
 */

class AudioService {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private isInitialized: boolean = false;

  constructor() {
    const saved = localStorage.getItem('bookglass_sound_enabled');
    if (saved !== null) {
      this.soundEnabled = saved === 'true';
    }
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  public setEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    localStorage.setItem('bookglass_sound_enabled', enabled ? 'true' : 'false');
  }

  public initOnUserGesture(): void {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.isInitialized = true;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  /**
   * Synthesize realistic paper flip sound
   */
  public playPageTurn(direction: 'forward' | 'backward' = 'forward'): void {
    if (!this.soundEnabled) return;
    this.initOnUserGesture();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const isFwd = direction === 'forward';

      // Duration: 220ms - 320ms for a crisp, natural page turn
      const duration = 0.24 + Math.random() * 0.08;
      const sampleRate = this.ctx.sampleRate;
      const bufferSize = Math.floor(sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
      const output = buffer.getChannelData(0);

      // Generate paper friction texture (white noise modulated by fibrous amplitude bursts)
      for (let i = 0; i < bufferSize; i++) {
        const t = i / bufferSize;
        // Fibrous micro-envelope: subtle amplitude spikes representing paper roughness
        const microFlutter = 0.8 + 0.4 * Math.sin(t * 120 + Math.random() * 2);
        output[i] = (Math.random() * 2 - 1) * microFlutter;
      }

      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = buffer;

      // Filter: bandpass that sweeps across frequencies as the page arcs through air
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.value = 2.2 + Math.random() * 0.8;

      const startFreq = isFwd ? (700 + Math.random() * 200) : (2400 + Math.random() * 300);
      const midFreq = 1800 + Math.random() * 400;
      const endFreq = isFwd ? (2600 + Math.random() * 300) : (800 + Math.random() * 150);

      filter.frequency.setValueAtTime(startFreq, now);
      filter.frequency.exponentialRampToValueAtTime(midFreq, now + duration * 0.4);
      filter.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

      // Gain envelope: fast attack, slight mid dip as page turns perpendicular, soft decay
      const gainNode = this.ctx.createGain();
      gainNode.gain.setValueAtTime(0.001, now);
      gainNode.gain.exponentialRampToValueAtTime(0.18 + Math.random() * 0.06, now + 0.04);
      gainNode.gain.setValueAtTime(0.14, now + duration * 0.5);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

      // Landing thud: subtle low resonance when the paper settles on the stack
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sine';
      const landingPitch = isFwd ? 130 + Math.random() * 25 : 115 + Math.random() * 20;
      osc.frequency.setValueAtTime(landingPitch, now + duration * 0.6);
      osc.frequency.exponentialRampToValueAtTime(45, now + duration + 0.05);

      oscGain.gain.setValueAtTime(0.0001, now);
      oscGain.gain.setValueAtTime(0.0001, now + duration * 0.58);
      oscGain.gain.exponentialRampToValueAtTime(0.09, now + duration * 0.65);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + duration + 0.06);

      // Wire up graph
      noiseSource.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);

      noiseSource.start(now);
      noiseSource.stop(now + duration + 0.02);
      osc.start(now + duration * 0.58);
      osc.stop(now + duration + 0.08);
    } catch {
      // AudioContext fallback handling
    }
  }

  /**
   * Sound effect when the book is first opened
   */
  public playBookOpen(): void {
    if (!this.soundEnabled) return;
    this.initOnUserGesture();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Soft rustle of opening spine
      const duration = 0.45;
      const buffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * duration), this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.5;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, now);
      filter.frequency.exponentialRampToValueAtTime(1400, now + 0.2);
      filter.frequency.exponentialRampToValueAtTime(300, now + duration);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);
      noise.stop(now + duration);
    } catch {
      // Ignore
    }
  }
}

export const audioService = new AudioService();
