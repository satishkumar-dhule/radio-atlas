import { Station, RadioGardenPlace } from '../types/radio';
import rawStations from './radioGardenStations.json';
import rawPlaces from './radioGardenPlaces.json';

// Enrich scraped stations with regional metadata and fallback telemetry
export const RADIO_GARDEN_STATIONS: Station[] = (rawStations as unknown as Station[]).map((st, idx) => {
  // Infer region from country
  let region = 'Global';
  const c = st.country.toLowerCase();
  if (['japan', 'south korea', 'taiwan', 'thailand', 'singapore', 'hong kong', 'india', 'indonesia', 'philippines', 'china'].some(k => c.includes(k))) {
    region = 'Asia & Pacific';
  } else if (['united kingdom', 'germany', 'france', 'iceland', 'ireland', 'netherlands', 'austria', 'spain', 'italy', 'sweden', 'norway', 'denmark', 'czech republic', 'czechia', 'greece', 'poland', 'switzerland', 'portugal'].some(k => c.includes(k))) {
    region = 'Europe';
  } else if (['united states', 'canada', 'mexico', 'cuba', 'jamaica'].some(k => c.includes(k))) {
    region = 'North America';
  } else if (['brazil', 'argentina', 'chile', 'colombia', 'peru', 'uruguay'].some(k => c.includes(k))) {
    region = 'South America';
  } else if (['egypt', 'kenya', 'south africa', 'morocco', 'lebanon', 'turkey', 'united arab emirates'].some(k => c.includes(k))) {
    region = 'Africa & Mid East';
  } else if (['australia', 'new zealand'].some(k => c.includes(k))) {
    region = 'Oceania';
  }

  // Generate plausible weather & telemetry for late night atmospheric vibe
  const hash = Math.abs(st.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), idx * 17));
  const temps = ['14°C', '16°C', '18°C', '11°C', '8°C', '21°C', '24°C', '19°C', '3°C', '12°C'];
  const conditions = ['Clear Night', 'Midnight Calm', 'Pacific Fog', 'Overcast Airwaves', 'Starry Sky', 'Misty Breeze', 'Ionospheric Aurora'];

  return {
    ...st,
    region,
    weather: st.weather || {
      temp: temps[hash % temps.length],
      condition: conditions[hash % conditions.length],
    },
    rssi: st.rssi || -50 - (hash % 38),
    bitrate: st.bitrate || '128-320 kbps MP3/AAC',
    source: 'radio.garden',
  };
});

export const RADIO_GARDEN_PLACES: RadioGardenPlace[] = rawPlaces as unknown as RadioGardenPlace[];

// Default initial stations for map beacons (one prominent carrier per iconic world hub from Radio Garden)
export const FEATURED_STATIONS: Station[] = [
  // Tokyo (Japan)
  RADIO_GARDEN_STATIONS.find(s => s.city.toLowerCase().includes('tokyo')) || RADIO_GARDEN_STATIONS[0],
  // Reykjavík (Iceland)
  RADIO_GARDEN_STATIONS.find(s => s.city.toLowerCase().includes('reykjavík') || s.city.toLowerCase().includes('reykjavik')) || RADIO_GARDEN_STATIONS[1],
  // Berlin (Germany)
  RADIO_GARDEN_STATIONS.find(s => s.city.toLowerCase().includes('berlin')) || RADIO_GARDEN_STATIONS[2],
  // San Francisco (USA)
  RADIO_GARDEN_STATIONS.find(s => s.city.toLowerCase().includes('san francisco')) || RADIO_GARDEN_STATIONS[3],
  // Havana (Cuba)
  RADIO_GARDEN_STATIONS.find(s => s.city.toLowerCase().includes('havana')) || RADIO_GARDEN_STATIONS[4],
  // São Paulo (Brazil)
  RADIO_GARDEN_STATIONS.find(s => s.city.toLowerCase().includes('são paulo') || s.city.toLowerCase().includes('sao paulo')) || RADIO_GARDEN_STATIONS[5],
  // Sydney (Australia)
  RADIO_GARDEN_STATIONS.find(s => s.city.toLowerCase().includes('sydney')) || RADIO_GARDEN_STATIONS[6],
  // London (UK)
  RADIO_GARDEN_STATIONS.find(s => s.city.toLowerCase().includes('london')) || RADIO_GARDEN_STATIONS[7],
  // Paris (France)
  RADIO_GARDEN_STATIONS.find(s => s.city.toLowerCase().includes('paris')) || RADIO_GARDEN_STATIONS[8],
  // New York (USA)
  RADIO_GARDEN_STATIONS.find(s => s.city.toLowerCase().includes('new york')) || RADIO_GARDEN_STATIONS[9],
  // Cairo (Egypt)
  RADIO_GARDEN_STATIONS.find(s => s.city.toLowerCase().includes('cairo')) || RADIO_GARDEN_STATIONS[10],
  // Mumbai (India)
  RADIO_GARDEN_STATIONS.find(s => s.city.toLowerCase().includes('mumbai')) || RADIO_GARDEN_STATIONS[11],
  // Seoul (South Korea)
  RADIO_GARDEN_STATIONS.find(s => s.city.toLowerCase().includes('seoul')) || RADIO_GARDEN_STATIONS[12],
  // Honolulu (Hawaii)
  RADIO_GARDEN_STATIONS.find(s => s.city.toLowerCase().includes('honolulu')) || RADIO_GARDEN_STATIONS[13],
  // Buenos Aires (Argentina)
  RADIO_GARDEN_STATIONS.find(s => s.city.toLowerCase().includes('buenos aires')) || RADIO_GARDEN_STATIONS[14],
  // Cape Town (South Africa)
  RADIO_GARDEN_STATIONS.find(s => s.city.toLowerCase().includes('cape town')) || RADIO_GARDEN_STATIONS[15],
].filter(Boolean);

// Dynamic search in Radio Garden API
export async function searchRadioGardenLive(query: string): Promise<Station[]> {
  try {
    const res = await fetch(`/api/radio-garden/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const data = await res.json();
    const hits = data.hits?.hits || [];

    const results: Station[] = [];
    hits.forEach((hit: { _source?: { type?: string; page?: { url?: string; title?: string; place?: { title?: string; id?: string }; country?: { title?: string } } } }) => {
      const page = hit._source?.page;
      if (!page || !page.url || !page.title || hit._source?.type !== 'channel') return;

      const title = page.title;
      const channelId = page.url.split('/').pop();
      if (!channelId) return;

      const city = page.place?.title || 'Unknown City';
      const country = page.country?.title || 'Global';

      // Find place coordinates if we have them
      const knownPlace = RADIO_GARDEN_PLACES.find(p => p.title.toLowerCase() === city.toLowerCase());
      const mapPos = knownPlace ? knownPlace.mapPosition : { x: 50, y: 50 };
      const geo = knownPlace ? knownPlace.geo : [0, 0];

      // Parse frequency from title
      const fmMatch = title.match(/(\d{2,3}(?:\.\d{1,2})?)\s*(?:FM|MHz)?/i);
      const freq = fmMatch ? parseFloat(fmMatch[1]) : 88.0 + (results.length * 1.5) % 20;

      results.push({
        id: channelId,
        title: title,
        city,
        country,
        geo: geo as [number, number],
        coordinates: {
          lat: geo[1],
          lng: geo[0],
          display: `${city} • ${country}`,
        },
        mapPosition: mapPos,
        frequency: Math.round(freq * 10) / 10,
        frequencyDisplay: fmMatch ? `${freq.toFixed(1)} FM` : 'FM Live',
        callsign: title,
        track: `${title} — Radio Garden Live`,
        streamUrl: `/api/radio-garden/stream/${channelId}`,
        directStreamUrl: `https://radio.garden/api/ara/content/listen/${channelId}/channel.mp3`,
        radioGardenUrl: `https://radio.garden${page.url}`,
        accentColor: results.length % 2 === 0 ? 'primary' : 'secondary',
        bitrate: '128-320 kbps MP3/AAC',
        source: 'radio.garden',
      });
    });

    return results;
  } catch (err) {
    console.warn('Failed to search radio garden live:', err);
    return [];
  }
}
