import { Station, RadioGardenPlace } from '../types/radio';
import rawCompactAllPlaces from '../data/radioGardenAllPlacesCompact.json';

// In-memory cache for fetched channels of places
const placeChannelsCache = new Map<string, Station[]>();

// Equirectangular projection coordinates
function latLngToMapPos(lat: number, lng: number) {
  const x = Math.max(0, Math.min(100, ((lng + 180) / 360) * 100));
  const y = Math.max(0, Math.min(100, ((90 - lat) / 180) * 100));
  return {
    x: Math.round(x * 100) / 100,
    y: Math.round(y * 100) / 100,
  };
}

export class RadioGardenService {
  private allPlaces: RadioGardenPlace[];

  constructor() {
    this.allPlaces = (rawCompactAllPlaces as [string, string, string, number, number, number][]).map(
      ([id, title, country, lng, lat, size]) => ({
        id,
        title,
        country,
        geo: [lng, lat],
        mapPosition: latLngToMapPos(lat, lng),
        stationCount: size,
        size,
        url: `/visit/${encodeURIComponent(title.toLowerCase().replace(/[^a-z0-9]/g, '-'))}/${id}`,
        boost: false,
      })
    );
  }

  // Get all 12,845 global places
  public getAllPlaces(): RadioGardenPlace[] {
    return this.allPlaces;
  }

  // Find place by ID
  public getPlaceById(id: string): RadioGardenPlace | undefined {
    return this.allPlaces.find((p) => p.id === id);
  }

  // Real-time search across all 12,845 places globally
  public searchPlaces(query: string, limit = 50): RadioGardenPlace[] {
    if (!query || query.trim().length === 0) {
      return this.allPlaces.slice(0, limit);
    }

    const q = query.toLowerCase().trim();
    const results: RadioGardenPlace[] = [];

    // Prioritize exact/prefix matches first
    for (const p of this.allPlaces) {
      const titleMatch = p.title.toLowerCase().startsWith(q);
      const countryMatch = p.country.toLowerCase().startsWith(q);
      if (titleMatch || countryMatch) {
        results.push(p);
        if (results.length >= limit) return results;
      }
    }

    // Secondary pass for includes matches
    if (results.length < limit) {
      for (const p of this.allPlaces) {
        if (!results.includes(p)) {
          if (p.title.toLowerCase().includes(q) || p.country.toLowerCase().includes(q)) {
            results.push(p);
            if (results.length >= limit) return results;
          }
        }
      }
    }

    return results;
  }

  // Fetch channels for any Radio Garden place dynamically
  public async fetchChannelsForPlace(place: RadioGardenPlace): Promise<Station[]> {
    if (placeChannelsCache.has(place.id)) {
      return placeChannelsCache.get(place.id)!;
    }

    // Check localStorage cache
    try {
      const cached = localStorage.getItem(`rg_channels_${place.id}`);
      if (cached) {
        const parsed = JSON.parse(cached) as Station[];
        placeChannelsCache.set(place.id, parsed);
        return parsed;
      }
    } catch {
      // ignore
    }

    const lng = place.geo[0];
    const lat = place.geo[1];
    const mapPos = latLngToMapPos(lat, lng);

    const endpoints = [
      // 1. Full-stack proxy if backend server is running
      `/api/radio-garden/channels/${place.id}`,
      // 2. Direct Radio Garden content endpoint
      `https://radio.garden/api/ara/content/page/${place.id}/channels`,
      // 3. Fast CORS proxy fallback for static GitHub Pages deployment
      `https://api.allorigins.win/raw?url=${encodeURIComponent(
        `https://radio.garden/api/ara/content/page/${place.id}/channels`
      )}`,
      `https://corsproxy.io/?url=${encodeURIComponent(
        `https://radio.garden/api/ara/content/page/${place.id}/channels`
      )}`,
    ];

    let channelItems: any[] = [];

    for (const ep of endpoints) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(ep, { signal: controller.signal });
        clearTimeout(timeout);

        if (res.ok) {
          const json = await res.json();
          const items =
            json?.data?.content?.[0]?.items ||
            json?.content?.[0]?.items ||
            json?.data?.items ||
            [];
          if (items.length > 0) {
            channelItems = items;
            break;
          }
        }
      } catch {
        // try next endpoint
      }
    }

    const stations: Station[] = [];

    if (channelItems.length > 0) {
      channelItems.forEach((item, index) => {
        const page = item.page || item;
        const channelId = page.url ? page.url.split('/').pop() : `ch_${place.id}_${index}`;
        const freqOffset = (index * 0.4) % 18;
        const baseFreq = 88.0 + ((Math.abs(Math.round(lng * 10)) % 180) / 10);
        const freq = Math.round((baseFreq + freqOffset) * 10) / 10;

        stations.push({
          id: channelId,
          title: page.title || `${place.title} Radio ${index + 1}`,
          city: place.title,
          country: place.country,
          placeId: place.id,
          region: this.inferRegion(place.country),
          geo: place.geo,
          coordinates: {
            lat,
            lng,
            display: `${place.title} • ${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(2)}° ${lng >= 0 ? 'E' : 'W'}`,
          },
          mapPosition: mapPos,
          frequency: freq,
          frequencyDisplay: `${freq.toFixed(1)} MHz`,
          callsign: page.title || `${place.title} FM`,
          track: `${page.title || place.title} — Live Broadcast`,
          streamUrl: `/api/radio-garden/stream/${channelId}`,
          directStreamUrl: `https://radio.garden/api/ara/content/listen/${channelId}/channel.mp3`,
          radioGardenUrl: `https://radio.garden${page.url || ''}`,
          accentColor: index % 2 === 0 ? 'primary' : 'secondary',
          bitrate: page.secure ? '128-320 kbps MP3/AAC' : '128 kbps MP3',
          website: page.stream || '',
          source: 'radio.garden',
        });
      });
    } else {
      // Synthetic fallback station if offline or network blocked
      const freq = 88.0 + ((Math.abs(Math.round(lng * 10)) % 180) / 10);
      stations.push({
        id: `synthetic_${place.id}`,
        title: `${place.title} Airwaves`,
        city: place.title,
        country: place.country,
        placeId: place.id,
        region: this.inferRegion(place.country),
        geo: place.geo,
        coordinates: {
          lat,
          lng,
          display: `${place.title} • ${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(2)}° ${lng >= 0 ? 'E' : 'W'}`,
        },
        mapPosition: mapPos,
        frequency: freq,
        frequencyDisplay: `${freq.toFixed(1)} MHz`,
        callsign: `${place.title} FM`,
        track: `${place.title} Ambient Shortwave`,
        streamUrl: '',
        directStreamUrl: '',
        radioGardenUrl: `https://radio.garden/visit/${place.id}`,
        accentColor: 'primary',
        bitrate: 'Procedural Atmospheric Synthesizer',
        source: 'radio.garden',
      });
    }

    placeChannelsCache.set(place.id, stations);
    try {
      localStorage.setItem(`rg_channels_${place.id}`, JSON.stringify(stations));
    } catch {
      // quota
    }

    return stations;
  }

  public inferRegion(country: string): string {
    const c = country.toLowerCase();
    if (
      ['japan', 'south korea', 'taiwan', 'thailand', 'singapore', 'hong kong', 'india', 'indonesia', 'philippines', 'china'].some(
        (k) => c.includes(k)
      )
    ) {
      return 'Asia & Pacific';
    } else if (
      [
        'united kingdom', 'germany', 'france', 'iceland', 'ireland', 'netherlands', 'austria',
        'spain', 'italy', 'sweden', 'norway', 'denmark', 'czech republic', 'czechia', 'greece',
        'poland', 'switzerland', 'portugal',
      ].some((k) => c.includes(k))
    ) {
      return 'Europe';
    } else if (['united states', 'canada', 'mexico', 'cuba', 'jamaica'].some((k) => c.includes(k))) {
      return 'North America';
    } else if (['brazil', 'argentina', 'chile', 'colombia', 'peru', 'uruguay'].some((k) => c.includes(k))) {
      return 'South America';
    } else if (
      ['egypt', 'kenya', 'south africa', 'morocco', 'lebanon', 'turkey', 'united arab emirates'].some(
        (k) => c.includes(k)
      )
    ) {
      return 'Africa & Mid East';
    } else if (['australia', 'new zealand'].some((k) => c.includes(k))) {
      return 'Oceania';
    }
    return 'Global';
  }

  // Fast geodesic haversine nearest-neighbor query across all 12,845 places
  public findNearestPlace(lat: number, lng: number): { place: RadioGardenPlace; distanceKm: number } {
    let nearest: RadioGardenPlace = this.allPlaces[0];
    let minDistanceKm = Infinity;

    // Fast rough bounding filter followed by haversine for candidates
    const degLatRad = Math.PI / 180;
    const latRad = lat * degLatRad;

    for (let i = 0; i < this.allPlaces.length; i++) {
      const p = this.allPlaces[i];
      const pLng = p.geo[0];
      const pLat = p.geo[1];

      // Quick rough degree distance filter
      const dLatDeg = pLat - lat;
      const dLngDeg = pLng - lng;
      // Rough distance metric for fast branch rejection
      const roughDistSq = dLatDeg * dLatDeg + dLngDeg * dLngDeg;
      if (roughDistSq > 1500 && minDistanceKm < 2000) {
        continue;
      }

      // Exact spherical haversine formula
      const dLat = (pLat - lat) * degLatRad;
      const dLon = (pLng - lng) * degLatRad;
      const pLatRad = pLat * degLatRad;

      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(latRad) * Math.cos(pLatRad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distKm = 6371 * c;

      if (distKm < minDistanceKm) {
        minDistanceKm = distKm;
        nearest = p;
      }
    }

    return {
      place: nearest,
      distanceKm: Math.round(minDistanceKm),
    };
  }
}

export const radioGardenService = new RadioGardenService();
