import { Station } from '../types/radio';

export interface StationAtmosphere {
  color1: string;       // Primary radial glow
  color2: string;       // Secondary ambient mood
  color3: string;       // Horizon gradient
  accentHex: string;    // Accent glow color
  glowPosition: { x: number; y: number };
  moodName: string;
  hemisphere: 'north' | 'south';
  vibe: string;
  pictureUrl: string;   // Evocative nocturnal cityscape / landscape photo
  pictureTitle: string; // Caption & city badge
}

interface CityPhotoPreset {
  keywords: string[];
  pictureUrl: string;
  pictureTitle: string;
}

const CITY_PHOTOS: CityPhotoPreset[] = [
  {
    keywords: ['tokyo', 'shibuya', 'shinjuku', 'japan'],
    pictureUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=2000&q=80',
    pictureTitle: 'Tokyo Tower & Shinjuku Nightwaves',
  },
  {
    keywords: ['reykjav', 'iceland', 'akureyri'],
    pictureUrl: 'https://images.unsplash.com/photo-1509773896068-7fd415d91e2e?auto=format&fit=crop&w=2000&q=80',
    pictureTitle: 'Aurora Borealis over Icelandic Fjord',
  },
  {
    keywords: ['berlin', 'germany', 'munich', 'hamburg', 'frankfurt'],
    pictureUrl: 'https://images.unsplash.com/photo-1560969184-10fe8719e047?auto=format&fit=crop&w=2000&q=80',
    pictureTitle: 'Alexanderplatz & Fernsehturm Nocturne',
  },
  {
    keywords: ['san francisco', 'oakland', 'berkeley', 'california'],
    pictureUrl: 'https://images.unsplash.com/photo-1506146332389-18140dc7b2fb?auto=format&fit=crop&w=2000&q=80',
    pictureTitle: 'Golden Gate Pacific Fog & Coastal Lights',
  },
  {
    keywords: ['havana', 'cuba', 'varadero'],
    pictureUrl: 'https://images.unsplash.com/photo-1500759285222-a95626b934cb?auto=format&fit=crop&w=2000&q=80',
    pictureTitle: 'Malecón Boulevard Twilight Airwaves',
  },
  {
    keywords: ['são paulo', 'sao paulo', 'brazil', 'brasilia'],
    pictureUrl: 'https://images.unsplash.com/photo-1518638150340-f706e86654de?auto=format&fit=crop&w=2000&q=80',
    pictureTitle: 'Avenida Paulista Metropolis Nightlights',
  },
  {
    keywords: ['sydney', 'melbourne', 'brisbane', 'australia'],
    pictureUrl: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=2000&q=80',
    pictureTitle: 'Sydney Harbour & Southern Cross Starlight',
  },
  {
    keywords: ['london', 'united kingdom', 'manchester', 'edinburgh', 'england'],
    pictureUrl: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=2000&q=80',
    pictureTitle: 'River Thames & London Nocturnal Airwaves',
  },
  {
    keywords: ['cairo', 'egypt', 'alexandria', 'giza'],
    pictureUrl: 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?auto=format&fit=crop&w=2000&q=80',
    pictureTitle: 'Nile Valley & Giza Starlit Desert',
  },
  {
    keywords: ['mumbai', 'delhi', 'bangalore', 'india'],
    pictureUrl: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=2000&q=80',
    pictureTitle: "Marine Drive Queen's Necklace Night",
  },
  {
    keywords: ['new york', 'manhattan', 'brooklyn', 'queens', 'nyc'],
    pictureUrl: 'https://images.unsplash.com/photo-1518391846015-55a9cc003b25?auto=format&fit=crop&w=2000&q=80',
    pictureTitle: 'Manhattan Midtown Nocturnal Skyline',
  },
  {
    keywords: ['paris', 'france', 'lyon', 'marseille'],
    pictureUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=2000&q=80',
    pictureTitle: 'Parisian Seine River Nocturne',
  },
  {
    keywords: ['rome', 'italy', 'milan', 'florence', 'venice', 'naples'],
    pictureUrl: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=2000&q=80',
    pictureTitle: 'Colosseum & Roman Forum Nightglow',
  },
  {
    keywords: ['amsterdam', 'netherlands', 'rotterdam'],
    pictureUrl: 'https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?auto=format&fit=crop&w=2000&q=80',
    pictureTitle: 'Amsterdam Canal Bridges & Water Reflection',
  },
  {
    keywords: ['seoul', 'south korea', 'korea', 'busan'],
    pictureUrl: 'https://images.unsplash.com/photo-1538485399081-7191377e8241?auto=format&fit=crop&w=2000&q=80',
    pictureTitle: 'Seoul Han River & N-Tower Cyberpunk Night',
  },
  {
    keywords: ['toronto', 'canada', 'montreal', 'vancouver'],
    pictureUrl: 'https://images.unsplash.com/photo-1507992781348-310259076fa0?auto=format&fit=crop&w=2000&q=80',
    pictureTitle: 'Toronto CN Tower & Lake Ontario Skyline',
  },
  {
    keywords: ['dubai', 'abu dhabi', 'united arab emirates', 'qatar', 'doha'],
    pictureUrl: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=2000&q=80',
    pictureTitle: 'Dubai Starlit Desert Metropolis Lights',
  },
  {
    keywords: ['singapore'],
    pictureUrl: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=2000&q=80',
    pictureTitle: 'Singapore Marina Bay Sands Night Horizon',
  },
  {
    keywords: ['los angeles', 'hollywood', 'santa monica'],
    pictureUrl: 'https://images.unsplash.com/photo-1580655653885-65763b2597d0?auto=format&fit=crop&w=2000&q=80',
    pictureTitle: 'Los Angeles Pacific Freeway Citylights',
  },
  {
    keywords: ['buenos aires', 'argentina', 'cordoba'],
    pictureUrl: 'https://images.unsplash.com/photo-1612294037637-ec328d0e075e?auto=format&fit=crop&w=2000&q=80',
    pictureTitle: 'Buenos Aires Obelisco 9 de Julio Nocturne',
  },
  {
    keywords: ['athens', 'greece', 'thessaloniki'],
    pictureUrl: 'https://images.unsplash.com/photo-1603565816030-6b389eeb23cb?auto=format&fit=crop&w=2000&q=80',
    pictureTitle: 'Athens Acropolis Starlight View',
  },
  {
    keywords: ['madrid', 'barcelona', 'spain', 'valencia'],
    pictureUrl: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=2000&q=80',
    pictureTitle: 'Madrid Gran Vía Midnight Illumination',
  },
  {
    keywords: ['stockholm', 'sweden', 'oslo', 'norway', 'copenhagen', 'denmark', 'helsinki', 'finland'],
    pictureUrl: 'https://images.unsplash.com/photo-1509356843151-3e7d96241e11?auto=format&fit=crop&w=2000&q=80',
    pictureTitle: 'Nordic Waterfront Nocturnal Twilight',
  },
  {
    keywords: ['rio', 'copacabana', 'ipanema'],
    pictureUrl: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=2000&q=80',
    pictureTitle: 'Rio de Janeiro Copacabana Midnight',
  },
  {
    keywords: ['bangkok', 'thailand', 'chiang mai'],
    pictureUrl: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=2000&q=80',
    pictureTitle: 'Bangkok Chao Phraya River Glow',
  },
  {
    keywords: ['chicago', 'illinois'],
    pictureUrl: 'https://images.unsplash.com/photo-1477959858617-67f30bc75b82?auto=format&fit=crop&w=2000&q=80',
    pictureTitle: 'Chicago Lake Michigan Nocturnal Skyline',
  },
  {
    keywords: ['hong kong', 'kowloon'],
    pictureUrl: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=2000&q=80',
    pictureTitle: 'Victoria Harbour Neon Symphony',
  },
];

// Curated regional fallback pictures for any global coordinates
const REGIONAL_FALLBACK_PHOTOS = [
  {
    region: 'Asia',
    url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=2000&q=80',
    title: 'East Asian Metropolis Twilight & Airwaves',
  },
  {
    region: 'Europe',
    url: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=2000&q=80',
    title: 'European Old Town Midnight Cobblestones',
  },
  {
    region: 'North America',
    url: 'https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?auto=format&fit=crop&w=2000&q=80',
    title: 'Nocturnal Highway & Distant City Horizon',
  },
  {
    region: 'South America',
    url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=2000&q=80',
    title: 'Latin American Tropical Starlight & Sea',
  },
  {
    region: 'Africa & Mid East',
    url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=2000&q=80',
    title: 'Desert Dunes & Saharan Starfield',
  },
  {
    region: 'Oceania',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2000&q=80',
    title: 'Pacific Ocean Midnight Shoreline',
  },
  {
    region: 'Cosmic',
    url: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?auto=format&fit=crop&w=2000&q=80',
    title: 'Milky Way Galaxy & Ionospheric Radio Wave',
  },
];

// Map city/country or hash to distinct nocturnal atmospheric palettes and scenic photography
export function getStationAtmosphere(station: Station, isLightMode: boolean): StationAtmosphere {
  const city = (station.city || '').toLowerCase();
  const country = (station.country || '').toLowerCase();
  const title = (station.title || '').toLowerCase();
  const queryStr = `${city} ${country} ${title}`;

  const x = station.mapPosition?.x ?? 50;
  const y = station.mapPosition?.y ?? 50;
  const lat = station.coordinates?.lat ?? 0;
  const hemisphere = lat >= 0 ? 'north' : 'south';

  // Base hash for procedural uniqueness for all 438+ Radio Garden stations
  const hash = Math.abs(
    (station.id || 'station')
      .split('')
      .reduce((acc, char, i) => acc + char.charCodeAt(0) * (i + 1), 0)
  );

  // Match photo preset
  let pictureUrl = '';
  let pictureTitle = '';

  const matchedPhoto = CITY_PHOTOS.find((item) =>
    item.keywords.some((kw) => queryStr.includes(kw))
  );

  if (matchedPhoto) {
    pictureUrl = matchedPhoto.pictureUrl;
    pictureTitle = matchedPhoto.pictureTitle;
  } else {
    // Pick regional fallback based on station coordinates or region
    const fallback =
      REGIONAL_FALLBACK_PHOTOS[hash % REGIONAL_FALLBACK_PHOTOS.length];
    pictureUrl = fallback.url;
    pictureTitle = `${station.city}, ${station.country} · ${fallback.title}`;
  }

  if (isLightMode) {
    // Light mode warm cartographic palettes
    if (city.includes('tokyo') || country.includes('japan')) {
      return {
        color1: 'rgba(251, 191, 36, 0.22)',
        color2: 'rgba(236, 72, 153, 0.12)',
        color3: 'rgba(59, 130, 246, 0.08)',
        accentHex: '#d97706',
        glowPosition: { x, y },
        moodName: 'Sunlit Tokyo Shibuya',
        hemisphere,
        vibe: 'Modern Metropolitan Airwaves',
        pictureUrl,
        pictureTitle,
      };
    }
    if (city.includes('reykjav') || country.includes('iceland')) {
      return {
        color1: 'rgba(52, 211, 153, 0.22)',
        color2: 'rgba(56, 189, 248, 0.14)',
        color3: 'rgba(147, 197, 253, 0.10)',
        accentHex: '#059669',
        glowPosition: { x, y },
        moodName: 'Subpolar Coastal Mist',
        hemisphere,
        vibe: 'Glacial Geothermal Daylight',
        pictureUrl,
        pictureTitle,
      };
    }
    if (city.includes('berlin') || country.includes('germany')) {
      return {
        color1: 'rgba(99, 102, 241, 0.18)',
        color2: 'rgba(245, 158, 11, 0.14)',
        color3: 'rgba(203, 213, 225, 0.22)',
        accentHex: '#4f46e5',
        glowPosition: { x, y },
        moodName: 'Alexanderplatz Blueprint',
        hemisphere,
        vibe: 'Industrial Precision Radio',
        pictureUrl,
        pictureTitle,
      };
    }

    // Default daylight cartography
    const lightTints = [
      { c1: 'rgba(245, 158, 11, 0.18)', c2: 'rgba(59, 130, 246, 0.10)', c3: 'rgba(236, 72, 153, 0.08)', hex: '#d97706', mood: 'Warm Daylight' },
      { c1: 'rgba(16, 185, 129, 0.18)', c2: 'rgba(56, 189, 248, 0.12)', c3: 'rgba(245, 158, 11, 0.08)', hex: '#059669', mood: 'Pacific Daylight' },
      { c1: 'rgba(99, 102, 241, 0.18)', c2: 'rgba(236, 72, 153, 0.10)', c3: 'rgba(52, 211, 153, 0.08)', hex: '#4f46e5', mood: 'Azure Daylight' },
      { c1: 'rgba(236, 72, 153, 0.16)', c2: 'rgba(245, 158, 11, 0.12)', c3: 'rgba(56, 189, 248, 0.08)', hex: '#db2777', mood: 'Pastel Sunrise' },
    ];
    const picked = lightTints[hash % lightTints.length];
    return {
      color1: picked.c1,
      color2: picked.c2,
      color3: picked.c3,
      accentHex: picked.hex,
      glowPosition: { x, y },
      moodName: `${station.city} · ${picked.mood}`,
      hemisphere,
      vibe: `${station.country} Airwaves`,
      pictureUrl,
      pictureTitle,
    };
  }

  // Dark Mode Nocturnal Palettes
  if (city.includes('tokyo') || country.includes('japan')) {
    return {
      color1: 'rgba(255, 193, 116, 0.18)',
      color2: 'rgba(168, 85, 247, 0.12)',
      color3: 'rgba(56, 189, 248, 0.08)',
      accentHex: '#ffc174',
      glowPosition: { x, y },
      moodName: 'Shibuya Citypop Twilight',
      hemisphere,
      vibe: 'Tokyo Metropolitan Nightwaves',
      pictureUrl,
      pictureTitle,
    };
  }

  if (city.includes('reykjav') || country.includes('iceland')) {
    return {
      color1: 'rgba(78, 222, 163, 0.22)',
      color2: 'rgba(56, 189, 248, 0.14)',
      color3: 'rgba(168, 85, 247, 0.09)',
      accentHex: '#4edea3',
      glowPosition: { x, y },
      moodName: 'Subpolar Aurora Borealis',
      hemisphere,
      vibe: 'Glacial Geothermal Ambient',
      pictureUrl,
      pictureTitle,
    };
  }

  if (city.includes('berlin') || country.includes('germany')) {
    return {
      color1: 'rgba(99, 102, 241, 0.16)',
      color2: 'rgba(245, 158, 11, 0.12)',
      color3: 'rgba(16, 185, 129, 0.06)',
      accentHex: '#818cf8',
      glowPosition: { x, y },
      moodName: 'Alexanderplatz Dub Techno',
      hemisphere,
      vibe: 'Analog Modular Night Airwaves',
      pictureUrl,
      pictureTitle,
    };
  }

  if (city.includes('san francisco') || city.includes('seattle')) {
    return {
      color1: 'rgba(20, 184, 166, 0.16)',
      color2: 'rgba(251, 191, 36, 0.11)',
      color3: 'rgba(56, 189, 248, 0.08)',
      accentHex: '#2dd4bf',
      glowPosition: { x, y },
      moodName: 'Pacific Marine Fog & Jazz',
      hemisphere,
      vibe: 'West Coast Late Session',
      pictureUrl,
      pictureTitle,
    };
  }

  if (city.includes('havana') || country.includes('cuba') || country.includes('jamaica')) {
    return {
      color1: 'rgba(245, 158, 11, 0.19)',
      color2: 'rgba(244, 63, 94, 0.12)',
      color3: 'rgba(16, 185, 129, 0.08)',
      accentHex: '#fbbf24',
      glowPosition: { x, y },
      moodName: 'Malecón Nocturnal Bolero',
      hemisphere,
      vibe: 'Warm Caribbean Trade Winds',
      pictureUrl,
      pictureTitle,
    };
  }

  if (city.includes('são paulo') || city.includes('sao paulo') || country.includes('brazil')) {
    return {
      color1: 'rgba(16, 185, 129, 0.18)',
      color2: 'rgba(244, 63, 94, 0.12)',
      color3: 'rgba(245, 158, 11, 0.08)',
      accentHex: '#34d399',
      glowPosition: { x, y },
      moodName: 'Paulista Tropicália & Bossa',
      hemisphere,
      vibe: 'Warm South American Airwaves',
      pictureUrl,
      pictureTitle,
    };
  }

  if (city.includes('sydney') || city.includes('melbourne') || country.includes('australia') || country.includes('new zealand')) {
    return {
      color1: 'rgba(56, 189, 248, 0.18)',
      color2: 'rgba(251, 146, 60, 0.12)',
      color3: 'rgba(168, 85, 247, 0.07)',
      accentHex: '#38bdf8',
      glowPosition: { x, y },
      moodName: 'Southern Cross Constellation',
      hemisphere: 'south',
      vibe: 'Pacific Coast Chillwave',
      pictureUrl,
      pictureTitle,
    };
  }

  if (city.includes('cairo') || city.includes('dubai') || city.includes('beirut') || country.includes('egypt')) {
    return {
      color1: 'rgba(245, 158, 11, 0.20)',
      color2: 'rgba(217, 119, 6, 0.12)',
      color3: 'rgba(59, 130, 246, 0.07)',
      accentHex: '#f59e0b',
      glowPosition: { x, y },
      moodName: 'Nile Midnight Tarab Oud',
      hemisphere,
      vibe: 'Desert Starlight Resonance',
      pictureUrl,
      pictureTitle,
    };
  }

  if (city.includes('mumbai') || city.includes('delhi') || country.includes('india')) {
    return {
      color1: 'rgba(251, 191, 36, 0.18)',
      color2: 'rgba(147, 51, 234, 0.12)',
      color3: 'rgba(236, 72, 153, 0.08)',
      accentHex: '#fbbf24',
      glowPosition: { x, y },
      moodName: 'Marine Drive Sitar & Tape',
      hemisphere,
      vibe: 'Arabian Sea Nocturne',
      pictureUrl,
      pictureTitle,
    };
  }

  if (city.includes('london') || city.includes('paris') || city.includes('rome') || city.includes('madrid')) {
    return {
      color1: 'rgba(139, 92, 246, 0.16)',
      color2: 'rgba(59, 130, 246, 0.12)',
      color3: 'rgba(245, 158, 11, 0.07)',
      accentHex: '#a78bfa',
      glowPosition: { x, y },
      moodName: 'European Midnight Broadcast',
      hemisphere,
      vibe: 'Continental Shortwave Carrier',
      pictureUrl,
      pictureTitle,
    };
  }

  // Dynamic procedural color distribution for all remaining stations
  const darkTints = [
    { c1: 'rgba(255, 193, 116, 0.17)', c2: 'rgba(56, 189, 248, 0.11)', c3: 'rgba(168, 85, 247, 0.07)', hex: '#ffc174', mood: 'Amber Ionosphere' },
    { c1: 'rgba(78, 222, 163, 0.18)', c2: 'rgba(251, 191, 36, 0.11)', c3: 'rgba(56, 189, 248, 0.07)', hex: '#4edea3', mood: 'Emerald Skywave' },
    { c1: 'rgba(56, 189, 248, 0.18)', c2: 'rgba(168, 85, 247, 0.11)', c3: 'rgba(244, 63, 94, 0.07)', hex: '#8ed5ff', mood: 'Cyan Transmit' },
    { c1: 'rgba(244, 63, 94, 0.15)', c2: 'rgba(245, 158, 11, 0.11)', c3: 'rgba(56, 189, 248, 0.07)', hex: '#fb7185', mood: 'Sunset Shortwave' },
    { c1: 'rgba(168, 85, 247, 0.16)', c2: 'rgba(78, 222, 163, 0.11)', c3: 'rgba(251, 191, 36, 0.07)', hex: '#c084fc', mood: 'Violet Airwave' },
  ];
  const picked = darkTints[hash % darkTints.length];

  return {
    color1: picked.c1,
    color2: picked.c2,
    color3: picked.c3,
    accentHex: picked.hex,
    glowPosition: { x, y },
    moodName: `${station.city} · ${picked.mood}`,
    hemisphere,
    vibe: `${station.country} Radio Garden Transmission`,
    pictureUrl,
    pictureTitle,
  };
}
