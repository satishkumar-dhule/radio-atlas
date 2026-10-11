export type WallpaperId =
  | 'obsidian'
  | 'constellations'
  | 'aurora'
  | 'rain'
  | 'radar'
  | 'blueprint'
  | 'solar_dawn'
  | 'amber_phosphor';

export interface WallpaperOption {
  id: WallpaperId;
  name: string;
  category: 'dark' | 'light' | 'retro';
  description: string;
  previewGradient: string;
}

export const WALLPAPERS: WallpaperOption[] = [
  {
    id: 'obsidian',
    name: 'Obsidian Void',
    category: 'dark',
    description: 'Minimalist deep space with soft ambient nocturnal haze',
    previewGradient: 'from-[#080b11] via-[#0f1420] to-[#080b11]',
  },
  {
    id: 'constellations',
    name: 'Cosmic Starfield',
    category: 'dark',
    description: 'Deep nocturnal cosmos with twinkling stars and starlight nebula',
    previewGradient: 'from-[#060810] via-[#10172a] to-[#060810]',
  },
  {
    id: 'aurora',
    name: 'Ionospheric Aurora',
    category: 'dark',
    description: 'Ethereal northern lights with flowing emerald & violet ionosphere',
    previewGradient: 'from-[#05131a] via-[#0b2926] to-[#0f1826]',
  },
  {
    id: 'rain',
    name: 'Midnight Rainscape',
    category: 'dark',
    description: 'Muted dark rain streaks with warm nocturnal bokeh lights',
    previewGradient: 'from-[#090c12] via-[#141822] to-[#090c12]',
  },
  {
    id: 'radar',
    name: 'Shortwave Radar',
    category: 'retro',
    description: 'Technical CRT graticule grid with sweeping military radar glow',
    previewGradient: 'from-[#05110d] via-[#09231b] to-[#05110d]',
  },
  {
    id: 'amber_phosphor',
    name: 'Amber Glow Tube',
    category: 'retro',
    description: 'Warm vacuum-tube vintage radio illumination',
    previewGradient: 'from-[#140c06] via-[#24170a] to-[#140c06]',
  },
  {
    id: 'blueprint',
    name: 'Cartographic Blueprint',
    category: 'light',
    description: 'Architectural drafting paper with technical coordinate grid',
    previewGradient: 'from-[#eef2f8] via-[#e2e8f2] to-[#eef2f8]',
  },
  {
    id: 'solar_dawn',
    name: 'Solar Dawn Horizon',
    category: 'light',
    description: 'Misty golden hour sunrise with soft ambient atmospheric warmth',
    previewGradient: 'from-[#faf6f0] via-[#f5ede2] to-[#faf6f0]',
  },
];
