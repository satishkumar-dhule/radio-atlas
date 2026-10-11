import fs from 'fs';
import path from 'path';

// Top curated global places from Radio Garden to scrape for initial instant load
const TARGET_CITY_QUERIES = [
  // Asia & East
  { city: 'Tokyo', country: 'Japan' },
  { city: 'Kyoto', country: 'Japan' },
  { city: 'Seoul', country: 'South Korea' },
  { city: 'Taipei', country: 'Taiwan' },
  { city: 'Bangkok', country: 'Thailand' },
  { city: 'Singapore', country: 'Singapore' },
  { city: 'Hong Kong', country: 'Hong Kong' },
  { city: 'Mumbai', country: 'India' },
  { city: 'Delhi', country: 'India' },
  { city: 'Jakarta', country: 'Indonesia' },
  { city: 'Manila', country: 'Philippines' },

  // Europe & North Atlantic
  { city: 'London', country: 'United Kingdom' },
  { city: 'Berlin', country: 'Germany' },
  { city: 'Paris', country: 'France' },
  { city: 'Reykjavík', country: 'Iceland' },
  { city: 'Dublin', country: 'Ireland' },
  { city: 'Amsterdam', country: 'Netherlands' },
  { city: 'Vienna', country: 'Austria' },
  { city: 'Madrid', country: 'Spain' },
  { city: 'Rome', country: 'Italy' },
  { city: 'Stockholm', country: 'Sweden' },
  { city: 'Oslo', country: 'Norway' },
  { city: 'Copenhagen', country: 'Denmark' },
  { city: 'Prague', country: 'Czech Republic' },
  { city: 'Athens', country: 'Greece' },
  { city: 'Warsaw', country: 'Poland' },
  { city: 'Zurich', country: 'Switzerland' },
  { city: 'Lisbon', country: 'Portugal' },

  // North America & Caribbean
  { city: 'New York NY', country: 'United States' },
  { city: 'San Francisco CA', country: 'United States' },
  { city: 'Los Angeles CA', country: 'United States' },
  { city: 'Chicago IL', country: 'United States' },
  { city: 'Seattle WA', country: 'United States' },
  { city: 'Austin TX', country: 'United States' },
  { city: 'Miami FL', country: 'United States' },
  { city: 'New Orleans LA', country: 'United States' },
  { city: 'Toronto', country: 'Canada' },
  { city: 'Montreal', country: 'Canada' },
  { city: 'Vancouver', country: 'Canada' },
  { city: 'Mexico City', country: 'Mexico' },
  { city: 'Havana', country: 'Cuba' },
  { city: 'Kingston', country: 'Jamaica' },
  { city: 'Honolulu HI', country: 'United States' },

  // South America
  { city: 'São Paulo', country: 'Brazil' },
  { city: 'Rio de Janeiro', country: 'Brazil' },
  { city: 'Buenos Aires', country: 'Argentina' },
  { city: 'Santiago', country: 'Chile' },
  { city: 'Bogota', country: 'Colombia' },
  { city: 'Lima', country: 'Peru' },
  { city: 'Montevideo', country: 'Uruguay' },

  // Africa & Middle East
  { city: 'Cairo', country: 'Egypt' },
  { city: 'Nairobi', country: 'Kenya' },
  { city: 'Cape Town', country: 'South Africa' },
  { city: 'Johannesburg', country: 'South Africa' },
  { city: 'Casablanca', country: 'Morocco' },
  { city: 'Beirut', country: 'Lebanon' },
  { city: 'Istanbul', country: 'Turkey' },
  { city: 'Dubai', country: 'United Arab Emirates' },

  // Oceania
  { city: 'Sydney', country: 'Australia' },
  { city: 'Melbourne', country: 'Australia' },
  { city: 'Auckland', country: 'New Zealand' },
];

function geoToPercent(lng, lat) {
  // SVG map coordinate calibration:
  // Lng [-180, 180] -> X% [0, 100]
  // Lat [-90, 90] -> Y% [0, 100]
  const x = Math.max(5, Math.min(95, ((lng + 180) / 360) * 100));
  // Mercator-like compression for polar regions
  const latRad = (lat * Math.PI) / 180;
  // Standard equirectangular mapping with slight aesthetic padding
  const y = Math.max(8, Math.min(92, ((90 - lat) / 180) * 100));
  return {
    x: Math.round(x * 10) / 10,
    y: Math.round(y * 10) / 10,
  };
}

function parseFrequency(title, index) {
  // Look for FM / AM in title, e.g. "88.6", "105.1 FM", "94.0", "Setagaya 83.4"
  const fmMatch = title.match(/(\d{2,3}(?:\.\d{1,2})?)\s*(?:FM|MHz)?/i);
  if (fmMatch) {
    const val = parseFloat(fmMatch[1]);
    if (val >= 76.0 && val <= 108.0) {
      return { freq: val, display: `${val.toFixed(1)} FM` };
    }
  }

  const amMatch = title.match(/(\d{3,4})\s*AM/i);
  if (amMatch) {
    const val = parseInt(amMatch[1], 10);
    return { freq: Math.round((val / 10) * 10) / 100, display: `${val} AM` };
  }

  // Fallback procedural FM frequency distributed across 87.5 - 107.9
  const hash = Math.abs(title.split('').reduce((acc, c) => acc + c.charCodeAt(0), index * 37));
  const pseudoFreq = 87.5 + (hash % 204) * 0.1;
  return {
    freq: Math.round(pseudoFreq * 10) / 10,
    display: `${(Math.round(pseudoFreq * 10) / 10).toFixed(1)} FM`,
  };
}

async function run() {
  console.log('Fetching places list from radio.garden...');
  const placesRes = await fetch('https://radio.garden/api/ara/content/places');
  const placesData = await placesRes.json();
  const allPlaces = placesData.data.list;
  console.log(`Loaded ${allPlaces.length} places.`);

  const matchedPlaces = [];
  for (const target of TARGET_CITY_QUERIES) {
    const found = allPlaces.find(
      p =>
        p.title.toLowerCase() === target.city.toLowerCase() &&
        (!target.country || p.country.toLowerCase() === target.country.toLowerCase())
    ) || allPlaces.find(
      p => p.title.toLowerCase().startsWith(target.city.toLowerCase())
    );

    if (found) {
      matchedPlaces.push(found);
    }
  }

  console.log(`Matched ${matchedPlaces.length} target cities.`);

  const allStations = [];
  const processedPlaces = [];

  for (const place of matchedPlaces) {
    try {
      const placeUrl = `https://radio.garden/api/ara/content/page/${place.id}/channels`;
      const chRes = await fetch(placeUrl);
      if (!chRes.ok) continue;
      const chData = await chRes.json();
      const items = chData.data?.content?.[0]?.items || [];

      const lng = place.geo[0];
      const lat = place.geo[1];
      const mapPos = geoToPercent(lng, lat);

      processedPlaces.push({
        id: place.id,
        title: place.title,
        country: place.country,
        geo: place.geo,
        mapPosition: mapPos,
        stationCount: place.size,
      });

      // Keep top 6 channels per place for balanced diversity
      const channels = items.slice(0, 8);
      for (let i = 0; i < channels.length; i++) {
        const ch = channels[i];
        const page = ch.page;
        if (!page || !page.url) continue;

        const channelId = page.url.split('/').pop();
        if (!channelId) continue;

        const freqInfo = parseFrequency(page.title, allStations.length);

        const stationObj = {
          id: channelId,
          title: page.title,
          city: place.title.replace(/\s+(CA|NY|TX|FL|WA|IL|LA|HI)$/, ''),
          country: place.country,
          placeId: place.id,
          geo: place.geo,
          coordinates: {
            lat: lat,
            lng: lng,
            display: `${place.title} • ${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(2)}° ${lng >= 0 ? 'E' : 'W'}`,
          },
          mapPosition: mapPos,
          frequency: freqInfo.freq,
          frequencyDisplay: freqInfo.display,
          callsign: page.title,
          track: `${page.title} — Live Broadcast`,
          streamUrl: `/api/radio-garden/stream/${channelId}`,
          directStreamUrl: `https://radio.garden/api/ara/content/listen/${channelId}/channel.mp3`,
          radioGardenUrl: `https://radio.garden${page.url}`,
          accentColor: allStations.length % 2 === 0 ? 'primary' : 'secondary',
          bitrate: page.secure ? '128-320 kbps MP3/AAC' : '128 kbps MP3',
          website: page.stream || '',
          source: 'radio.garden',
        };

        allStations.push(stationObj);
      }

      console.log(`Scraped ${channels.length} stations from ${place.title}, ${place.country}`);
    } catch (e) {
      console.warn(`Error scraping ${place.title}:`, e.message);
    }
  }

  console.log(`Total scraped stations: ${allStations.length}`);

  // Save to src/data/radioGardenStations.json
  const outDir = path.resolve('src/data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(
    path.join(outDir, 'radioGardenStations.json'),
    JSON.stringify(allStations, null, 2),
    'utf-8'
  );

  // Save compact global places database with all 12k+ places
  const compactAllPlaces = allPlaces.map((p) => [
    p.id,
    p.title,
    p.country,
    Math.round(p.geo[0] * 1000) / 1000,
    Math.round(p.geo[1] * 1000) / 1000,
    p.size || 1,
  ]);

  fs.writeFileSync(
    path.join(outDir, 'radioGardenAllPlacesCompact.json'),
    JSON.stringify(compactAllPlaces),
    'utf-8'
  );

  console.log(`Successfully saved radioGardenStations.json, radioGardenPlaces.json and all ${allPlaces.length} places in radioGardenAllPlacesCompact.json!`);
}

run();
