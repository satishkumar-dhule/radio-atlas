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

// API: Proxy Radio Garden live audio stream with CORS
app.get('/api/radio-garden/stream/:channelId', async (req: Request, res: Response) => {
  const { channelId } = req.params;
  const targetUrl = `https://radio.garden/api/ara/content/listen/${channelId}/channel.mp3`;

  try {
    const upstreamRes = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RadioAtlas/1.0)',
      },
    });

    if (!upstreamRes.ok || !upstreamRes.body) {
      return res.status(upstreamRes.status).send('Stream unavailable');
    }

    const contentType = upstreamRes.headers.get('content-type') || 'audio/mpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache, no-store');

    // Pipe upstream Web stream to Express response
    const reader = upstreamRes.body.getReader();

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
        'User-Agent': 'Mozilla/5.0 (compatible; RadioAtlas/1.0)',
      },
    });
    const data = await upstreamRes.json();
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'Search failed', message });
  }
});

// API: Proxy Radio Garden Place Channels
app.get('/api/radio-garden/channels/:placeId', async (req: Request, res: Response) => {
  const { placeId } = req.params;
  try {
    const channelsUrl = `https://radio.garden/api/ara/content/page/${placeId}/channels`;
    const upstreamRes = await fetch(channelsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RadioAtlas/1.0)',
      },
    });
    const data = await upstreamRes.json();
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
