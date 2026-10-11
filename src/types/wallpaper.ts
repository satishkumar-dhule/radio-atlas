export type WallpaperId =
  | 'obsidian'
  | 'constellations'
  | 'aurora'
  | 'rain'
  | 'radar'
  | 'blueprint'
  | 'solar_dawn'
  | 'amber_phosphor'
  | 'satellite_scenes'
  | 'cyber_grid';

export type SkinThemeId = 'amber' | 'emerald' | 'cyan' | 'magenta' | 'solar';

export interface SkinTheme {
  id: SkinThemeId;
  name: string;
  accentHex: string;
  glowHex: string;
  badgeClass: string;
}

export const SKIN_THEMES: SkinTheme[] = [
  {
    id: 'amber',
    name: 'Vintage Amber Tube',
    accentHex: '#ffc174',
    glowHex: 'rgba(255, 193, 116, 0.85)',
    badgeClass: 'bg-[#ffc174]/15 text-[#ffc174] border-[#ffc174]/40',
  },
  {
    id: 'emerald',
    name: 'Cyber Emerald Radar',
    accentHex: '#4edea3',
    glowHex: 'rgba(78, 222, 163, 0.85)',
    badgeClass: 'bg-[#4edea3]/15 text-[#4edea3] border-[#4edea3]/40',
  },
  {
    id: 'cyan',
    name: 'Deep Cosmos Cyan',
    accentHex: '#38bdf8',
    glowHex: 'rgba(56, 189, 248, 0.85)',
    badgeClass: 'bg-[#38bdf8]/15 text-[#38bdf8] border-[#38bdf8]/40',
  },
  {
    id: 'magenta',
    name: 'Tokyo Neon Magenta',
    accentHex: '#f43f5e',
    glowHex: 'rgba(244, 63, 94, 0.85)',
    badgeClass: 'bg-[#f43f5e]/15 text-[#f43f5e] border-[#f43f5e]/40',
  },
  {
    id: 'solar',
    name: 'Solar Horizon Tangerine',
    accentHex: '#fb923c',
    glowHex: 'rgba(251, 146, 60, 0.85)',
    badgeClass: 'bg-[#fb923c]/15 text-[#fb923c] border-[#fb923c]/40',
  },
];

export interface WallpaperOption {
  id: WallpaperId;
  name: string;
  category: 'dark' | 'light' | 'retro' | 'natural';
  description: string;
  previewGradient: string;
}

export const WALLPAPERS: WallpaperOption[] = [
  {
    id: 'satellite_scenes',
    name: 'Natural Satellite Earth',
    category: 'natural',
    description: 'High-res natural orbital photography of planetary topography and shores',
    previewGradient: 'from-[#0b1b2b] via-[#16353d] to-[#0d211a]',
  },
  {
    id: 'obsidian',
    name: 'Obsidian Void',
    category: 'dark',
    description: 'Minimalist deep nocturnal space with soft channel-reactive glow',
    previewGradient: 'from-[#080b11] via-[#0f1420] to-[#080b11]',
  },
  {
    id: 'aurora',
    name: 'Ionospheric Aurora',
    category: 'dark',
    description: 'Ethereal flowing subpolar northern lights with emerald & violet ionosphere',
    previewGradient: 'from-[#05131a] via-[#0b2926] to-[#0f1826]',
  },
  {
    id: 'constellations',
    name: 'Cosmic Starfield',
    category: 'dark',
    description: 'Deep nocturnal cosmos with sparkling starlight and deep sky nebula',
    previewGradient: 'from-[#060810] via-[#10172a] to-[#060810]',
  },
  {
    id: 'rain',
    name: 'Midnight Rainscape',
    category: 'dark',
    description: 'Dark cinematic rain streaks with warm nocturnal bokeh city lights',
    previewGradient: 'from-[#090c12] via-[#141822] to-[#090c12]',
  },
  {
    id: 'cyber_grid',
    name: 'Vector Synthwave Grid',
    category: 'retro',
    description: 'Horizon perspective grid with neon laser filaments and pulse waves',
    previewGradient: 'from-[#1a0826] via-[#110e2e] to-[#050616]',
  },
  {
    id: 'amber_phosphor',
    name: 'Amber Glow Tube',
    category: 'retro',
    description: 'Warm glowing vacuum-tube vintage radio illumination',
    previewGradient: 'from-[#140c06] via-[#24170a] to-[#140c06]',
  },
  {
    id: 'radar',
    name: 'Shortwave Radar CRT',
    category: 'retro',
    description: 'Technical CRT graticule grid with sweeping military radar phosphor',
    previewGradient: 'from-[#05110d] via-[#09231b] to-[#05110d]',
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
