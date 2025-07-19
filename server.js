const express = require('express');
const cors = require('cors');
const ytdl = require('ytdl-core');
const yts = require('yt-search');
const { HttpsProxyAgent } = require('https-proxy-agent');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 🔁 Free Proxy List
const proxies = [
  'http://185.199.229.156:7492',
  'http://159.89.132.108:8989',
  'http://45.167.125.61:999',
  'http://89.208.219.121:8080',
  'http://190.61.88.147:8080'
];

// 🛡️ Basic Rate Limiting
const rateLimitMap = new Map();
const RATE_LIMIT = process.env.RATE_LIMIT || 100;
const RATE_LIMIT_WINDOW = process.env.RATE_LIMIT_WINDOW || 60 * 60 * 1000;

const rateLimit = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }

  const userData = rateLimitMap.get(ip);
  if (now > userData.resetTime) {
    userData.count = 1;
    userData.resetTime = now + RATE_LIMIT_WINDOW;
    return next();
  }

  if (userData.count >= RATE_LIMIT) {
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }

  userData.count++;
  next();
};

app.use(rateLimit);

// 🩺 Health Check
app.get('/', (req, res) => {
  res.json({ message: '🟢 YouTube Music API is running with proxy support' });
});

// 🔍 Search Endpoint
app.get('/api/search', async (req, res) => {
  const { q, limit = 20 } = req.query;
  if (!q) return res.status(400).json({ error: 'Missing query' });

  try {
    const result = await yts(q);
    const videos = result.videos.slice(0, limit).map(video => ({
      id: video.videoId,
      title: video.title,
      author: video.author.name,
      duration: video.timestamp,
      thumbnail: video.thumbnail,
      url: video.url,
      views: video.views
    }));
    res.json({ success: true, results: videos });
  } catch (err) {
    res.status(500).json({ error: 'Search failed', message: err.message });
  }
});

// ℹ️ Video Info Endpoint
app.get('/api/info', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing URL' });

  try {
    const proxy = proxies[Math.floor(Math.random() * proxies.length)];
    const agent = new HttpsProxyAgent(proxy);

    const info = await ytdl.getInfo(url, {
      requestOptions: {
        agent,
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      }
    });

    const video = info.videoDetails;
    res.json({
      success: true,
      info: {
        id: video.videoId,
        title: video.title,
        author: video.author.name,
        duration: video.lengthSeconds,
        description: video.description,
        thumbnail: video.thumbnails?.pop()?.url,
        formats: info.formats.filter(f => f.hasAudio)
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Info failed', message: err.message });
  }
});

// 🎧 Stream Endpoint
app.get('/api/stream', async (req, res) => {
  const { url, quality = 'highestaudio' } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing URL' });

  try {
    const proxy = proxies[Math.floor(Math.random() * proxies.length)];
    const agent = new HttpsProxyAgent(proxy);

    const info = await ytdl.getInfo(url, {
      requestOptions: {
        agent,
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      }
    });

    const format = ytdl.chooseFormat(info.formats, { quality, filter: 'audioonly' });

    const stream = ytdl.downloadFromInfo(info, {
      format,
      requestOptions: {
        agent,
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      }
    });

    res.setHeader('Content-Type', 'audio/webm');
    res.setHeader('Content-Disposition', 'inline');
    stream.pipe(res);
  } catch (err) {
    res.status(500).json({ error: 'Streaming failed', message: err.message });
  }
});

// ⬇️ Download Endpoint
app.get('/api/download', async (req, res) => {
  const { url, format = 'mp3' } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing URL' });

  try {
    const proxy = proxies[Math.floor(Math.random() * proxies.length)];
    const agent = new HttpsProxyAgent(proxy);

    const info = await ytdl.getInfo(url, {
      requestOptions: {
        agent,
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      }
    });

    const selected = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: 'audioonly' });

    const stream = ytdl.downloadFromInfo(info, {
      format: selected,
      requestOptions: {
        agent,
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      }
    });

    res.setHeader('Content-Disposition', `attachment; filename="audio.${format}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    stream.pipe(res);
  } catch (err) {
    res.status(500).json({ error: 'Download failed', message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🎧 Proxy YouTube API running on http://localhost:${PORT}`);
});
