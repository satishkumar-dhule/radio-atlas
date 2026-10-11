import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Enable CORS for API routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Range');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Cache places in memory
let cachedPlaces: unknown = null;

// Deep in-memory cache for channels & stream URLs
const cachedChannelsMap = new Map<string, { data: unknown; expires: number }>();
const cachedStreamRedirects = new Map<string, { url: string; expires: number }>();

// API: Proxy Radio Garden live audio stream with CORS & automatic 302 follow
app.get('/api/radio-garden/stream/:channelId', async (req: Request, res: Response) => {
  const { channelId } = req.params;
  const now = Date.now();

  try {
    let resolvedStreamUrl = '';
    const cachedRedirect = cachedStreamRedirects.get(channelId);
    if (cachedRedirect && cachedRedirect.expires > now) {
      resolvedStreamUrl = cachedRedirect.url;
    } else {
      const targetUrl = `https://radio.garden/api/ara/content/listen/${channelId}/channel.mp3`;
      const upstreamRes = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Referer': 'https://radio.garden/',
          'Accept': '*/*',
        },
        redirect: 'manual',
      });

      if (upstreamRes.status === 301 || upstreamRes.status === 302) {
        resolvedStreamUrl = upstreamRes.headers.get('location') || '';
      } else if (upstreamRes.ok) {
        resolvedStreamUrl = targetUrl;
      }

      if (resolvedStreamUrl) {
        cachedStreamRedirects.set(channelId, {
          url: resolvedStreamUrl,
          expires: now + 3600 * 1000 * 4, // Cache stream location for 4 hours
        });
      }
    }

    if (!resolvedStreamUrl) {
      return res.status(404).send('Stream location not found');
    }

    // Connect to actual audio stream server
    const streamRes = await fetch(resolvedStreamUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': '*/*',
      },
    });

    if (!streamRes.ok || !streamRes.body) {
      return res.status(streamRes.status || 502).send('Upstream stream error');
    }

    const contentType = streamRes.headers.get('content-type') || 'audio/mpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache, no-store');

    const reader = streamRes.body.getReader();
    req.on('close', () => {
      reader.cancel().catch(() => {});
    });

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        res.write(value);
      }
    }
    res.end();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (!res.headersSent) {
      res.status(502).json({ error: 'Failed to proxy audio stream', message });
    }
  }
});

// API: Proxy Radio Garden Search
app.get('/api/radio-garden/search', async (req: Request, res: Response) => {
  const q = req.query.q as string;
  if (!q) {
    return res.json({ hits: { hits: [] } });
  }

  try {
    const searchUrl = `https://radio.garden/api/search?q=${encodeURIComponent(q)}`;
    const upstreamRes = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://radio.garden/',
      },
    });
    const data = await upstreamRes.json();
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'Search failed', message });
  }
});

// API: Proxy Radio Garden Place Channels with deep caching
app.get('/api/radio-garden/channels/:placeId', async (req: Request, res: Response) => {
  const { placeId } = req.params;
  const now = Date.now();

  const cached = cachedChannelsMap.get(placeId);
  if (cached && cached.expires > now) {
    res.setHeader('X-Cache', 'HIT');
    return res.json(cached.data);
  }

  try {
    const channelsUrl = `https://radio.garden/api/ara/content/page/${placeId}/channels`;
    const upstreamRes = await fetch(channelsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://radio.garden/',
      },
    });
    const data = await upstreamRes.json();
    // Cache for 24 hours
    cachedChannelsMap.set(placeId, {
      data,
      expires: now + 24 * 3600 * 1000,
    });
    res.setHeader('X-Cache', 'MISS');
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'Channels fetch failed', message });
  }
});

// API: Get Places
app.get('/api/radio-garden/places', async (req: Request, res: Response) => {
  try {
    if (cachedPlaces) {
      return res.json(cachedPlaces);
    }

    const localPlacesFile = path.resolve('src/data/radioGardenPlaces.json');
    if (fs.existsSync(localPlacesFile)) {
      const data = JSON.parse(fs.readFileSync(localPlacesFile, 'utf-8'));
      cachedPlaces = data;
      return res.json(data);
    }

    const upstreamRes = await fetch('https://radio.garden/api/ara/content/places');
    const data = await upstreamRes.json();
    cachedPlaces = data;
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'Places fetch failed', message });
  }
});

// API: Gemini AI Auto-Master DSP Analysis
app.post('/api/gemini/analyze-dsp', async (req: Request, res: Response) => {
  try {
    const { station, spectral } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return res.status(503).json({ error: 'GEMINI_API_KEY not configured on server' });
    }

    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const prompt = `You are a world-class analog radio broadcast mastering engineer.
Analyze this broadcast telemetry and audio spectrum:
Station: ${station?.title || 'Unknown'} (${station?.city || ''}, ${station?.country || ''})
Carrier: ${station?.frequency || 'FM'}
Bitrate: ${station?.bitrate || '128k'}
Live Spectral Metrics: Bass: ${spectral?.bassRatio ?? 0.3}, Mid: ${spectral?.midRatio ?? 0.45}, Treble: ${spectral?.trebleRatio ?? 0.25}, Spectral Centroid: ${spectral?.centroidHz ?? 2500}Hz, RMS Level: ${spectral?.rmsLevel ?? 0.5}.

Choose the single best analog DSP mastering preset among: 'tube', 'clean', 'lofi', 'deepbass'.
Provide lowGainDb (-6 to +6), highCutHz (4000 to 12000), tubeDrive (0 to 1), vinylWarmth (boolean), rainAmbiance (boolean), and a 1-sentence poetic rationale for the acoustic mastering.

Output raw JSON ONLY:
{
  "eqPreset": "tube"|"clean"|"lofi"|"deepbass",
  "lowGainDb": 3.0,
  "highCutHz": 8800,
  "tubeDrive": 0.65,
  "vinylWarmth": false,
  "rainAmbiance": false,
  "rationale": "Short explanation",
  "source": "gemini"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text?.trim() || '{}';
    const parsed = JSON.parse(text);
    res.json({
      ...parsed,
      source: 'gemini',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'Gemini DSP analysis failed', message });
  }
});

async function bootstrap() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Radio Atlas Server running on http://0.0.0.0:${PORT}`);
  });
}

bootstrap();
