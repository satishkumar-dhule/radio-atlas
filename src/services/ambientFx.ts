// Nocturnal Atmosphere FX: Procedural Night Rain, Vinyl Warmth & Cosmic Drone

class AmbientFxEngine {
  private ctx: AudioContext | null = null;
  private rainGain: GainNode | null = null;
  private vinylGain: GainNode | null = null;
  private cosmicGain: GainNode | null = null;

  private isRainActive: boolean = false;
  private isVinylActive: boolean = false;
  private isCosmicActive: boolean = false;

  private rainVolume: number = 0.35;
  private vinylVolume: number = 0.25;
  private cosmicVolume: number = 0.18;

  private rainSource: AudioBufferSourceNode | null = null;
  private vinylTimer: number | null = null;
  private cosmicOscs: OscillatorNode[] = [];

  public init(audioCtx: AudioContext) {
    if (this.ctx) return;
    this.ctx = audioCtx;

    // Rain gain
    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.rainGain.connect(this.ctx.destination);

    // Vinyl gain
    this.vinylGain = this.ctx.createGain();
    this.vinylGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.vinylGain.connect(this.ctx.destination);

    // Cosmic drone gain
    this.cosmicGain = this.ctx.createGain();
    this.cosmicGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.cosmicGain.connect(this.ctx.destination);

    this.initRainBuffer();
    this.initCosmicDrone();
  }

  private initRainBuffer() {
    if (!this.ctx) return;

    const bufferSize = this.ctx.sampleRate * 4;
    const rainBuffer = this.ctx.createBuffer(2, bufferSize, this.ctx.sampleRate);
    const left = rainBuffer.getChannelData(0);
    const right = rainBuffer.getChannelData(1);

    for (let i = 0; i < bufferSize; i++) {
      const whiteL = Math.random() * 2 - 1;
      const whiteR = Math.random() * 2 - 1;
      left[i] = whiteL * 0.12;
      right[i] = whiteR * 0.12;
    }

    const rainFilter = this.ctx.createBiquadFilter();
    rainFilter.type = 'lowpass';
    rainFilter.frequency.setValueAtTime(950, this.ctx.currentTime);
    rainFilter.Q.setValueAtTime(0.8, this.ctx.currentTime);

    this.rainSource = this.ctx.createBufferSource();
    this.rainSource.buffer = rainBuffer;
    this.rainSource.loop = true;

    if (this.rainGain) {
      this.rainSource.connect(rainFilter);
      rainFilter.connect(this.rainGain);
    }
    this.rainSource.start();
  }

  private initCosmicDrone() {
    if (!this.ctx || !this.cosmicGain) return;

    // Harmonic celestial drone in 432 Hz / 216 Hz / 108 Hz
    const freqs = [108, 216, 432];
    freqs.forEach((f) => {
      if (!this.ctx || !this.cosmicGain) return;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, this.ctx.currentTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, this.ctx.currentTime);

      osc.connect(filter);
      filter.connect(this.cosmicGain);
      osc.start();
      this.cosmicOscs.push(osc);
    });
  }

  public toggleRain(ctx?: AudioContext): boolean {
    if (ctx && !this.ctx) this.init(ctx);
    if (!this.ctx || !this.rainGain) return false;

    this.isRainActive = !this.isRainActive;
    const target = this.isRainActive ? this.rainVolume : 0;
    this.rainGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.2);

    return this.isRainActive;
  }

  public toggleVinyl(ctx?: AudioContext): boolean {
    if (ctx && !this.ctx) this.init(ctx);
    if (!this.ctx || !this.vinylGain) return false;

    this.isVinylActive = !this.isVinylActive;
    const target = this.isVinylActive ? this.vinylVolume : 0;
    this.vinylGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.2);

    if (this.isVinylActive) {
      this.startVinylPopping();
    } else {
      if (this.vinylTimer) {
        clearInterval(this.vinylTimer);
        this.vinylTimer = null;
      }
    }

    return this.isVinylActive;
  }

  public toggleCosmic(ctx?: AudioContext): boolean {
    if (ctx && !this.ctx) this.init(ctx);
    if (!this.ctx || !this.cosmicGain) return false;

    this.isCosmicActive = !this.isCosmicActive;
    const target = this.isCosmicActive ? this.cosmicVolume : 0;
    this.cosmicGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.4);

    return this.isCosmicActive;
  }

  private startVinylPopping() {
    if (!this.ctx || !this.vinylGain) return;

    this.vinylTimer = window.setInterval(() => {
      if (!this.ctx || !this.vinylGain || !this.isVinylActive) return;

      if (Math.random() > 0.45) {
        const popOsc = this.ctx.createOscillator();
        const popGain = this.ctx.createGain();

        popOsc.type = 'triangle';
        popOsc.frequency.setValueAtTime(60 + Math.random() * 240, this.ctx.currentTime);

        popGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
        popGain.gain.linearRampToValueAtTime(0.04 * this.vinylVolume, this.ctx.currentTime + 0.002);
        popGain.gain.exponentialRampToValueAtTime(0.00001, this.ctx.currentTime + 0.02 + Math.random() * 0.03);

        popOsc.connect(popGain);
        popGain.connect(this.vinylGain);

        popOsc.start(this.ctx.currentTime);
        popOsc.stop(this.ctx.currentTime + 0.06);
      }
    }, 180);
  }

  public getRainActive(): boolean {
    return this.isRainActive;
  }

  public getVinylActive(): boolean {
    return this.isVinylActive;
  }

  public getCosmicActive(): boolean {
    return this.isCosmicActive;
  }
}

export const ambientFx = new AmbientFxEngine();
