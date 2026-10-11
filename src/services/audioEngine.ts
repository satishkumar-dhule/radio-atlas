// Atmospheric Web Audio Radio Synthesizer & Real Radio Garden Stream Engine
import { Station } from '../types/radio';

export type EqPreset = 'clean' | 'tube' | 'lofi' | 'deepbass';

class RadioAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private streamGain: GainNode | null = null;
  private staticGain: GainNode | null = null;
  private heterodyneGain: GainNode | null = null;
  private heterodyneOsc: OscillatorNode | null = null;
  private analyser: AnalyserNode | null = null;

  // DSP EQ Filter Rack
  private lowShelfFilter: BiquadFilterNode | null = null;
  private highCutFilter: BiquadFilterNode | null = null;
  private midBandFilter: BiquadFilterNode | null = null;
  private activeEqPreset: EqPreset = 'tube';

  // Real Audio Stream element
  private audioElement: HTMLAudioElement | null = null;
  private mediaSourceNode: MediaElementAudioSourceNode | null = null;
  private isStreamConnected: boolean = false;
  private isLiveStreamPlaying: boolean = false;

  private isRunning: boolean = false;
  private isMuted: boolean = false;
  private volume: number = 0.75;

  private activeStation: Station | null = null;
  private currentTunedFrequency: number = 83.40;
  private activeStationFrequency: number = 83.40;

  // Synthesis voices and timer
  private sequenceTimer: number | null = null;
  private droneOscillators: OscillatorNode[] = [];
  private staticBufferNode: AudioBufferSourceNode | null = null;

  public init() {
    if (this.ctx) return;

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master output
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);

      // Analyser for CRT oscilloscope & waterfall
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.82;

      // Build DSP EQ Filter Rack
      this.lowShelfFilter = this.ctx.createBiquadFilter();
      this.lowShelfFilter.type = 'lowshelf';
      this.lowShelfFilter.frequency.setValueAtTime(200, this.ctx.currentTime);

      this.highCutFilter = this.ctx.createBiquadFilter();
      this.highCutFilter.type = 'lowpass';
      this.highCutFilter.frequency.setValueAtTime(10000, this.ctx.currentTime);

      this.midBandFilter = this.ctx.createBiquadFilter();
      this.midBandFilter.type = 'peaking';
      this.midBandFilter.frequency.setValueAtTime(1200, this.ctx.currentTime);

      this.applyEqPreset(this.activeEqPreset);

      // Connect: Master -> EQ Filters -> Analyser -> Destination
      this.masterGain.connect(this.lowShelfFilter);
      this.lowShelfFilter.connect(this.midBandFilter);
      this.midBandFilter.connect(this.highCutFilter);
      this.highCutFilter.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      // Live Stream Channel
      this.streamGain = this.ctx.createGain();
      this.streamGain.gain.setValueAtTime(0.9, this.ctx.currentTime);
      this.streamGain.connect(this.masterGain);

      // Generative Synth Channel
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      // Static / Noise Channel
      this.staticGain = this.ctx.createGain();
      this.staticGain.gain.setValueAtTime(0.03, this.ctx.currentTime);
      this.staticGain.connect(this.masterGain);

      // Heterodyne carrier whistle
      this.heterodyneGain = this.ctx.createGain();
      this.heterodyneGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
      this.heterodyneGain.connect(this.masterGain);

      this.initStaticNoise();
      this.initHeterodyne();
      this.initAudioElement();
    } catch (e) {
      console.warn('AudioContext failed to initialize:', e);
    }
  }

  public getAudioContext(): AudioContext | null {
    if (!this.ctx) this.init();
    return this.ctx;
  }

  public setEqPreset(preset: EqPreset) {
    this.activeEqPreset = preset;
    this.applyEqPreset(preset);
  }

  public getEqPreset(): EqPreset {
    return this.activeEqPreset;
  }

  private applyEqPreset(preset: EqPreset) {
    if (!this.ctx || !this.lowShelfFilter || !this.highCutFilter || !this.midBandFilter) return;
    const now = this.ctx.currentTime;

    switch (preset) {
      case 'tube':
        // Warm vacuum tube pre-amp: +3.5dB warm low shelf, pleasant high-end roll-off
        this.lowShelfFilter.gain.setTargetAtTime(3.8, now, 0.1);
        this.lowShelfFilter.frequency.setTargetAtTime(180, now, 0.1);
        this.midBandFilter.gain.setTargetAtTime(1.2, now, 0.1);
        this.highCutFilter.frequency.setTargetAtTime(8500, now, 0.1);
        break;
      case 'lofi':
        // Vintage Shortwave / Transistor receiver: bandpass 350Hz - 4200Hz
        this.lowShelfFilter.gain.setTargetAtTime(-4.0, now, 0.1);
        this.lowShelfFilter.frequency.setTargetAtTime(350, now, 0.1);
        this.midBandFilter.gain.setTargetAtTime(4.5, now, 0.1);
        this.midBandFilter.frequency.setTargetAtTime(1800, now, 0.1);
        this.highCutFilter.frequency.setTargetAtTime(4500, now, 0.1);
        break;
      case 'deepbass':
        // Midnight sub-bass boost: +6dB sub warmth
        this.lowShelfFilter.gain.setTargetAtTime(6.0, now, 0.1);
        this.lowShelfFilter.frequency.setTargetAtTime(120, now, 0.1);
        this.midBandFilter.gain.setTargetAtTime(0, now, 0.1);
        this.highCutFilter.frequency.setTargetAtTime(12000, now, 0.1);
        break;
      case 'clean':
      default:
        // Flat studio monitor
        this.lowShelfFilter.gain.setTargetAtTime(0, now, 0.1);
        this.midBandFilter.gain.setTargetAtTime(0, now, 0.1);
        this.highCutFilter.frequency.setTargetAtTime(20000, now, 0.1);
        break;
    }
  }

  private initAudioElement() {
    if (this.audioElement) return;

    this.audioElement = new Audio();
    this.audioElement.crossOrigin = 'anonymous';
    this.audioElement.preload = 'none';

    this.audioElement.addEventListener('playing', () => {
      this.isLiveStreamPlaying = true;
      if (this.musicGain && this.ctx) {
        this.musicGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.4);
      }
    });

    this.audioElement.addEventListener('waiting', () => {
      if (this.musicGain && this.ctx && this.isRunning) {
        this.musicGain.gain.setTargetAtTime(0.35, this.ctx.currentTime, 0.2);
      }
    });

    this.audioElement.addEventListener('error', () => {
      console.warn('Real stream error, falling back to procedural audio');
      this.isLiveStreamPlaying = false;
      if (this.musicGain && this.ctx && this.isRunning) {
        this.musicGain.gain.setTargetAtTime(0.85, this.ctx.currentTime, 0.2);
      }
    });
  }

  private connectAudioElementToGraph() {
    if (!this.ctx || !this.audioElement || this.isStreamConnected || !this.streamGain) return;

    try {
      this.mediaSourceNode = this.ctx.createMediaElementSource(this.audioElement);
      this.mediaSourceNode.connect(this.streamGain);
      this.isStreamConnected = true;
    } catch (err) {
      console.warn('MediaElementSource error (will play directly):', err);
    }
  }

  private initStaticNoise() {
    if (!this.ctx || !this.staticGain) return;

    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.07;
      b6 = white * 0.115926;
    }

    this.staticBufferNode = this.ctx.createBufferSource();
    this.staticBufferNode.buffer = noiseBuffer;
    this.staticBufferNode.loop = true;

    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(2200, this.ctx.currentTime);
    bandpass.Q.setValueAtTime(1.2, this.ctx.currentTime);

    this.staticBufferNode.connect(bandpass);
    bandpass.connect(this.staticGain);
    this.staticBufferNode.start();
  }

  private initHeterodyne() {
    if (!this.ctx || !this.heterodyneGain) return;

    this.heterodyneOsc = this.ctx.createOscillator();
    this.heterodyneOsc.type = 'sine';
    this.heterodyneOsc.frequency.setValueAtTime(800, this.ctx.currentTime);
    this.heterodyneOsc.connect(this.heterodyneGain);
    this.heterodyneOsc.start();
  }

  // Play station broadcast
  public async play(station?: Station, frequency?: number) {
    if (!this.ctx) {
      this.init();
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    if (station) {
      this.activeStation = station;
      this.activeStationFrequency = station.frequency;
      this.currentTunedFrequency = frequency !== undefined ? frequency : station.frequency;
    }

    this.isRunning = true;
    this.connectAudioElementToGraph();

    if (this.activeStation) {
      this.playRealStationStream(this.activeStation);
    }

    this.startAmbientGenerativeScore();
    this.updateTuningBalance(this.currentTunedFrequency);
  }

  private playRealStationStream(station: Station) {
    if (!this.audioElement) return;

    // Ordered list of candidate stream sources to attempt
    const candidateUrls: string[] = [];
    if (station.streamUrl) candidateUrls.push(station.streamUrl);
    if (station.directStreamUrl && station.directStreamUrl !== station.streamUrl) {
      candidateUrls.push(station.directStreamUrl);
    }
    candidateUrls.push(`https://radio.garden/api/ara/content/listen/${station.id}/channel.mp3`);

    let candidateIndex = 0;

    const tryNextCandidate = () => {
      if (!this.audioElement || !this.isRunning) return;

      if (candidateIndex < candidateUrls.length) {
        const src = candidateUrls[candidateIndex];
        candidateIndex++;
        this.audioElement.pause();
        this.audioElement.src = src;
        this.audioElement.load();

        const playPromise = this.audioElement.play();
        if (playPromise !== undefined) {
          playPromise.catch((e) => {
            console.warn(`Stream candidate ${src} failed, trying next fallback:`, e);
            tryNextCandidate();
          });
        }
      } else {
        // Fall back gracefully to procedural ambient audio
        console.warn('All stream candidates exhausted, engaging procedural ambient synthesizer');
        this.isLiveStreamPlaying = false;
        if (this.musicGain && this.ctx && this.isRunning) {
          this.musicGain.gain.setTargetAtTime(0.85, this.ctx.currentTime, 0.1);
        }
      }
    };

    // Attach one-time error handler for this stream loading sequence
    const errorHandler = () => {
      if (candidateIndex < candidateUrls.length) {
        tryNextCandidate();
      }
    };

    this.audioElement.onerror = errorHandler;
    tryNextCandidate();
  }

  public pause() {
    this.isRunning = false;
    if (this.audioElement) {
      this.audioElement.pause();
    }
    this.stopAmbientScore();
    if (this.streamGain && this.ctx) {
      this.streamGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
    }
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
    }
    if (this.staticGain && this.ctx) {
      this.staticGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
    }
  }

  public toggle(station?: Station) {
    if (this.isRunning) {
      this.pause();
      return false;
    } else {
      this.play(station);
      return true;
    }
  }

  public getIsPlaying(): boolean {
    return this.isRunning;
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      if (!this.isMuted) {
        this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
      }
    }
    if (this.audioElement) {
      this.audioElement.volume = this.isMuted ? 0 : this.volume;
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      const target = this.isMuted ? 0 : this.volume;
      this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05);
    }
    if (this.audioElement) {
      this.audioElement.muted = this.isMuted;
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  // Update when user changes tuned frequency on the dial / scrubber
  public tuneFrequency(freq: number, targetStationFreq: number, station?: Station) {
    this.currentTunedFrequency = freq;
    this.activeStationFrequency = targetStationFreq;

    if (station && (!this.activeStation || station.id !== this.activeStation.id)) {
      this.activeStation = station;
      if (this.isRunning) {
        this.playRealStationStream(station);
        this.startAmbientGenerativeScore();
      }
    }

    this.updateTuningBalance(freq);
  }

  private updateTuningBalance(freq: number) {
    if (!this.ctx || !this.streamGain || !this.musicGain || !this.staticGain || !this.heterodyneGain || !this.heterodyneOsc) return;

    const delta = Math.abs(freq - this.activeStationFrequency);
    const lockRange = 0.5;
    const now = this.ctx.currentTime;

    if (delta <= 0.08) {
      this.streamGain.gain.setTargetAtTime(this.isRunning ? 0.9 : 0, now, 0.05);
      this.staticGain.gain.setTargetAtTime(this.isRunning ? 0.025 : 0, now, 0.05);
      this.heterodyneGain.gain.setTargetAtTime(0, now, 0.05);
      if (!this.isLiveStreamPlaying && this.isRunning) {
        this.musicGain.gain.setTargetAtTime(0.7, now, 0.05);
      }
    } else if (delta < lockRange) {
      const proximity = 1 - delta / lockRange;
      const whistleFreq = Math.max(120, Math.min(2400, delta * 3200));
      this.heterodyneOsc.frequency.setTargetAtTime(whistleFreq, now, 0.03);

      const streamLevel = Math.max(0.1, proximity * 0.8);
      const staticLevel = Math.min(0.4, (1 - proximity) * 0.35 + 0.05);
      const whistleLevel = proximity > 0.15 ? Math.sin(proximity * Math.PI) * 0.05 : 0;

      this.streamGain.gain.setTargetAtTime(this.isRunning ? streamLevel : 0, now, 0.04);
      this.staticGain.gain.setTargetAtTime(this.isRunning ? staticLevel : 0, now, 0.04);
      this.heterodyneGain.gain.setTargetAtTime(this.isRunning ? whistleLevel : 0, now, 0.04);
    } else {
      this.streamGain.gain.setTargetAtTime(0, now, 0.08);
      this.musicGain.gain.setTargetAtTime(0, now, 0.08);
      this.staticGain.gain.setTargetAtTime(this.isRunning ? 0.24 : 0, now, 0.08);
      this.heterodyneGain.gain.setTargetAtTime(0, now, 0.08);
    }
  }

  // Generative fallback ambient score
  private startAmbientGenerativeScore() {
    this.stopAmbientScore();
    if (!this.ctx || !this.musicGain) return;

    const chords = [
      [146.83, 220.00, 277.18, 329.63], // Dmaj9
      [185.00, 220.00, 277.18, 370.00], // F#m7
      [123.47, 185.00, 220.00, 293.66], // Bm7
      [196.00, 246.94, 293.66, 370.00], // Gmaj7
    ];
    let chordIndex = 0;

    const playChordStep = () => {
      if (!this.ctx || !this.musicGain || !this.isRunning) return;

      const chord = chords[chordIndex % chords.length];
      chordIndex++;

      const stepDuration = 3.6;
      const now = this.ctx.currentTime;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      filter.Q.setValueAtTime(1.5, now);
      filter.connect(this.musicGain);

      chord.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const voiceGain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        const baseAmp = 0.08 / chord.length;
        voiceGain.gain.setValueAtTime(0.0001, now);
        voiceGain.gain.linearRampToValueAtTime(baseAmp, now + 0.8 + idx * 0.1);
        voiceGain.gain.exponentialRampToValueAtTime(0.0001, now + stepDuration + 0.4);

        osc.connect(voiceGain);
        voiceGain.connect(filter);

        osc.start(now);
        osc.stop(now + stepDuration + 0.5);
        this.droneOscillators.push(osc);
      });

      this.sequenceTimer = window.setTimeout(playChordStep, stepDuration * 1000 - 100);
    };

    playChordStep();
  }

  private stopAmbientScore() {
    if (this.sequenceTimer) {
      window.clearTimeout(this.sequenceTimer);
      this.sequenceTimer = null;
    }
    this.droneOscillators.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // already stopped
      }
    });
    this.droneOscillators = [];
  }

  public getAnalyserData(): Uint8Array | null {
    if (!this.analyser) return null;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(data);
    return data;
  }

  public getFrequencyData(): Uint8Array | null {
    if (!this.analyser) return null;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }
}

export const audioEngine = new RadioAudioEngine();
