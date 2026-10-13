import { Station } from '../types/radio';
import { EqPreset, audioEngine } from './audioEngine';

export interface DspMasterProfile {
  eqPreset: EqPreset;
  lowGainDb: number;
  highCutHz: number;
  tubeDrive: number;
  vinylWarmth: boolean;
  rainAmbiance: boolean;
  rationale: string;
  source: 'gemini' | 'spectral-heuristic';
}

export class GeminiDspService {
  private isAutoMasterEnabled: boolean = true;
  private lastProfile: DspMasterProfile | null = null;
  private isAnalyzing: boolean = false;
  private listeners: ((profile: DspMasterProfile) => void)[] = [];

  constructor() {
    try {
      const saved = localStorage.getItem('radio_atlas_ai_dsp_master');
      this.isAutoMasterEnabled = saved !== 'false';
    } catch {
      this.isAutoMasterEnabled = true;
    }
  }

  public isEnabled(): boolean {
    return this.isAutoMasterEnabled;
  }

  public setEnabled(enabled: boolean) {
    this.isAutoMasterEnabled = enabled;
    try {
      localStorage.setItem('radio_atlas_ai_dsp_master', String(enabled));
    } catch {}
  }

  public getLastProfile(): DspMasterProfile | null {
    return this.lastProfile;
  }

  public subscribe(cb: (profile: DspMasterProfile) => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notify(profile: DspMasterProfile) {
    this.lastProfile = profile;
    this.listeners.forEach((cb) => cb(profile));
  }

  // Extract live spectral audio metrics from Web Audio Analyser
  public extractSpectralFeatures(): {
    bassRatio: number;
    midRatio: number;
    trebleRatio: number;
    centroidHz: number;
    rmsLevel: number;
  } {
    const freqData = audioEngine.getFrequencyData();
    const timeData = audioEngine.getAnalyserData();

    if (!freqData || freqData.length === 0) {
      return { bassRatio: 0.35, midRatio: 0.45, trebleRatio: 0.2, centroidHz: 2400, rmsLevel: 0.5 };
    }

    const binCount = freqData.length;
    const bassBins = Math.floor(binCount * 0.12);
    const midBins = Math.floor(binCount * 0.45);

    let bassSum = 0;
    let midSum = 0;
    let trebleSum = 0;
    let weightedSum = 0;
    let totalMagnitude = 0;

    for (let i = 0; i < binCount; i++) {
      const mag = freqData[i];
      totalMagnitude += mag;
      weightedSum += mag * (i * 22050 / binCount);

      if (i < bassBins) bassSum += mag;
      else if (i < midBins) midSum += mag;
      else trebleSum += mag;
    }

    const total = Math.max(1, totalMagnitude);
    const centroidHz = Math.round(totalMagnitude > 0 ? weightedSum / total : 2000);

    let rms = 0;
    if (timeData) {
      for (let i = 0; i < timeData.length; i++) {
        const norm = (timeData[i] - 128) / 128;
        rms += norm * norm;
      }
      rms = Math.sqrt(rms / timeData.length);
    }

    return {
      bassRatio: Math.round((bassSum / total) * 100) / 100,
      midRatio: Math.round((midSum / total) * 100) / 100,
      trebleRatio: Math.round((trebleSum / total) * 100) / 100,
      centroidHz,
      rmsLevel: Math.round(rms * 100) / 100,
    };
  }

  // Auto-analyze and master DSP profile using Gemini (with client-side static & server proxy support)
  public async autoMasterStation(station: Station): Promise<DspMasterProfile> {
    if (this.isAnalyzing) return this.lastProfile || this.getAlgorithmicProfile(station);
    this.isAnalyzing = true;

    const spectral = this.extractSpectralFeatures();

    // 1. Try server-side endpoint if available
    try {
      const serverRes = await fetch('/api/gemini/analyze-dsp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          station: {
            title: station.title,
            city: station.city,
            country: station.country,
            frequency: station.frequencyDisplay,
            bitrate: station.bitrate,
          },
          spectral,
        }),
      });

      if (serverRes.ok) {
        const result = (await serverRes.json()) as DspMasterProfile;
        this.applyProfile(result);
        this.notify(result);
        this.isAnalyzing = false;
        return result;
      }
    } catch {
      // Static client deployment / offline fallback
    }

    // 2. Client-side direct Gemini call if VITE_GEMINI_API_KEY is available
    const clientApiKey =
      (import.meta as any).env?.VITE_GEMINI_API_KEY ||
      (typeof window !== 'undefined' && (window as any).GEMINI_API_KEY);

    if (clientApiKey && clientApiKey !== 'MY_GEMINI_API_KEY') {
      try {
        const prompt = `You are an analog broadcast mastering engineer. Analyze this radio broadcast:
Station: ${station.title} in ${station.city}, ${station.country}
Carrier: ${station.frequencyDisplay}
Spectral features: Bass: ${spectral.bassRatio}, Mid: ${spectral.midRatio}, Treble: ${spectral.trebleRatio}, Centroid: ${spectral.centroidHz}Hz, RMS: ${spectral.rmsLevel}.

Respond with a raw JSON object ONLY, no markdown:
{
  "eqPreset": "tube"|"clean"|"lofi"|"deepbass",
  "lowGainDb": 3.0,
  "highCutHz": 9000,
  "tubeDrive": 0.65,
  "vinylWarmth": true,
  "rainAmbiance": false,
  "rationale": "One brief poetic audio mastering sentence describing the tone and why."
}`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${clientApiKey}`;
        const genRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        });

        if (genRes.ok) {
          const data = await genRes.json();
          const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const cleaned = rawText.replace(/```json|```/g, '').trim();
          const parsed = JSON.parse(cleaned);

          const profile: DspMasterProfile = {
            eqPreset: (['tube', 'clean', 'lofi', 'deepbass'].includes(parsed.eqPreset)
              ? parsed.eqPreset
              : 'tube') as EqPreset,
            lowGainDb: Number(parsed.lowGainDb) || 3.0,
            highCutHz: Number(parsed.highCutHz) || 8500,
            tubeDrive: Number(parsed.tubeDrive) || 0.6,
            vinylWarmth: Boolean(parsed.vinylWarmth),
            rainAmbiance: Boolean(parsed.rainAmbiance),
            rationale: parsed.rationale || `Acoustic curve tailored for ${station.city} airwaves`,
            source: 'gemini',
          };

          this.applyProfile(profile);
          this.notify(profile);
          this.isAnalyzing = false;
          return profile;
        }
      } catch {
        // Fall back gracefully to spectral analysis
      }
    }

    // 3. High-Fidelity Client-Side Spectral & Cultural Acoustic Model
    const profile = this.getAlgorithmicProfile(station, spectral);
    this.applyProfile(profile);
    this.notify(profile);
    this.isAnalyzing = false;
    return profile;
  }

  // Built-in acoustic modeling tailored to geographical genre and spectral density
  private getAlgorithmicProfile(
    station: Station,
    spectral?: { bassRatio: number; midRatio: number; trebleRatio: number; centroidHz: number; rmsLevel: number }
  ): DspMasterProfile {
    const s = spectral || this.extractSpectralFeatures();
    const city = station.city.toLowerCase();
    const country = station.country.toLowerCase();

    if (city.includes('tokyo') || country.includes('japan')) {
      return {
        eqPreset: 'tube',
        lowGainDb: 3.5,
        highCutHz: 9200,
        tubeDrive: 0.7,
        vinylWarmth: true,
        rainAmbiance: false,
        rationale: 'Shibuya Citypop profile: Warm Class-A triode harmonics with sweet 9.2kHz tape roll-off',
        source: 'spectral-heuristic',
      };
    }

    if (city.includes('reykjav') || country.includes('iceland')) {
      return {
        eqPreset: 'clean',
        lowGainDb: 1.5,
        highCutHz: 11000,
        tubeDrive: 0.2,
        vinylWarmth: false,
        rainAmbiance: true,
        rationale: 'Subpolar Glacier profile: Pristine wide dynamic range with ethereal high-frequency clarity',
        source: 'spectral-heuristic',
      };
    }

    if (city.includes('berlin') || country.includes('germany')) {
      return {
        eqPreset: 'deepbass',
        lowGainDb: 5.0,
        highCutHz: 7500,
        tubeDrive: 0.5,
        vinylWarmth: false,
        rainAmbiance: false,
        rationale: 'Alexanderplatz Dub profile: +5dB deep analog sub-bass boost with controlled dub cut',
        source: 'spectral-heuristic',
      };
    }

    if (city.includes('havana') || city.includes('são paulo') || country.includes('cuba') || country.includes('brazil')) {
      return {
        eqPreset: 'tube',
        lowGainDb: 2.8,
        highCutHz: 8400,
        tubeDrive: 0.65,
        vinylWarmth: true,
        rainAmbiance: false,
        rationale: 'Tropical Nocturne profile: Vintage vacuum tube warmth with analog vinyl presence',
        source: 'spectral-heuristic',
      };
    }

    // Dynamic spectral adjustment
    if (s.centroidHz > 3500) {
      return {
        eqPreset: 'lofi',
        lowGainDb: 2.0,
        highCutHz: 6800,
        tubeDrive: 0.8,
        vinylWarmth: true,
        rainAmbiance: false,
        rationale: 'Harsh high-frequency detected: applied tape saturation and smooth 6.8kHz filter',
        source: 'spectral-heuristic',
      };
    }

    if (s.bassRatio < 0.25) {
      return {
        eqPreset: 'deepbass',
        lowGainDb: 4.5,
        highCutHz: 9500,
        tubeDrive: 0.4,
        vinylWarmth: false,
        rainAmbiance: false,
        rationale: 'Thin low-end detected: engaged low-frequency contour boost for fuller presence',
        source: 'spectral-heuristic',
      };
    }

    return {
      eqPreset: 'tube',
      lowGainDb: 3.0,
      highCutHz: 8800,
      tubeDrive: 0.6,
      vinylWarmth: false,
      rainAmbiance: false,
      rationale: `Optimal nocturnal mastering calibrated for ${station.city} broadcast spectrum`,
      source: 'spectral-heuristic',
    };
  }

  private applyProfile(profile: DspMasterProfile) {
    audioEngine.setEqPreset(profile.eqPreset);
  }
}

export const geminiDspService = new GeminiDspService();
