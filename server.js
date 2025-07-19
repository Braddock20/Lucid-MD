
const express = require('express');
const cors = require('cors');
const ytdl = require('ytdl-core');
const yts = require('yt-search');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Rate limiting
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
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.'
    });
  }

  userData.count++;
  next();
};

app.use(rateLimit);

const isValidYouTubeUrl = (url) => {
  const ytRegex = /^(https?\:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
  return ytRegex.test(url);
};

app.get('/', (req, res) => {
  res.json({
    message: 'YouTube Music API is running!',
    version: '1.0.0'
  });
});

app.get('/api/search', async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    if (!q) return res.status(400).json({ error: 'Missing query' });
    const results = await yts(q);
    const videos = results.videos.slice(0, limit).map(video => ({
      id: video.videoId,
      title: video.title,
      author: video.author.name,
      duration: video.duration.timestamp,
      thumbnail: video.thumbnail,
      url: video.url,
      views: video.views
    }));
    res.json({ success: true, results: videos });
  } catch (err) {
    res.status(500).json({ error: 'Search failed', message: err.message });
  }
});

app.get('/api/info', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Missing URL' });

    const info = await ytdl.getInfo(url, {
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'x-youtube-client-name': '1',
          'x-youtube-client-version': '2.20210721.00.00'
        }
      }
    });

    const videoDetails = info.videoDetails;
    const formats = info.formats
      .filter(format => format.hasAudio)
      .map(format => ({
        itag: format.itag,
        container: format.container,
        quality: format.qualityLabel,
        audioQuality: format.audioQuality,
        bitrate: format.bitrate
      }));

    res.json({
      success: true,
      info: {
        id: videoDetails.videoId,
        title: videoDetails.title,
        author: videoDetails.author.name,
        duration: videoDetails.lengthSeconds,
        description: videoDetails.description,
        thumbnail: videoDetails.thumbnails.pop().url,
        formats
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch info', message: err.message });
  }
});

app.get('/api/stream', async (req, res) => {
  try {
    const { url, quality = 'highestaudio' } = req.query;
    const info = await ytdl.getInfo(url);
    const format = ytdl.chooseFormat(info.formats, { quality, filter: 'audioonly' });

    const stream = ytdl.downloadFromInfo(info, {
      format,
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'x-youtube-client-name': '1',
          'x-youtube-client-version': '2.20210721.00.00'
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

app.get('/api/download', async (req, res) => {
  try {
    const { url, format = 'mp3' } = req.query;
    const info = await ytdl.getInfo(url);
    const selected = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: 'audioonly' });

    const stream = ytdl.downloadFromInfo(info, {
      format: selected,
      requestOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'x-youtube-client-name': '1',
          'x-youtube-client-version': '2.20210721.00.00'
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
  console.log(`✅ API running at http://localhost:${PORT}`);
});
