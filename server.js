const express = require('express');
const cors = require('cors');
const ytdl = require('ytdl-core');
const yts = require('yt-search');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Rate limiting (simple implementation)
const rateLimitMap = new Map();
const RATE_LIMIT = 100; // requests per hour
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour

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

// Helper function to validate YouTube URL
const isValidYouTubeUrl = (url) => {
  const ytRegex = /^(https?\:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
  return ytRegex.test(url);
};

// Helper function to extract video ID
const extractVideoId = (url) => {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

// API Routes

// Health check
app.get('/', (req, res) => {
  res.json({
    message: 'YouTube Music API is running!',
    version: '1.0.0',
    endpoints: {
      search: '/api/search?q=query',
      info: '/api/info?url=youtube_url',
      stream: '/api/stream?url=youtube_url&quality=high',
      download: '/api/download?url=youtube_url&format=mp3'
    }
  });
});

// Search for music
app.get('/api/search', async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }
    
    const results = await yts(q);
    const videos = results.videos.slice(0, parseInt(limit)).map(video => ({
      id: video.videoId,
      title: video.title,
      author: video.author.name,
      duration: video.duration.text,
      thumbnail: video.thumbnail,
      url: video.url,
      views: video.views
    }));
    
    res.json({
      success: true,
      query: q,
      results: videos
    });
    
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      error: 'Search failed',
      message: error.message
    });
  }
});

// Get video info
app.get('/api/info', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }
    
    if (!isValidYouTubeUrl(url)) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }
    
    const info = await ytdl.getInfo(url);
    const videoDetails = info.videoDetails;
    
    const formats = info.formats
      .filter(format => format.hasAudio)
      .map(format => ({
        itag: format.itag,
        container: format.container,
        quality: format.qualityLabel,
        audioQuality: format.audioQuality,
        bitrate: format.bitrate,
        contentLength: format.contentLength
      }));
    
    res.json({
      success: true,
      info: {
        id: videoDetails.videoId,
        title: videoDetails.title,
        author: videoDetails.author.name,
        duration: videoDetails.lengthSeconds,
        description: videoDetails.description,
        thumbnail: videoDetails.thumbnails[videoDetails.thumbnails.length - 1].url,
        formats: formats
      }
    });
    
  } catch (error) {
    console.error('Info error:', error);
    res.status(500).json({
      error: 'Failed to get video info',
      message: error.message
    });
  }
});

// Stream music
app.get('/api/stream', async (req, res) => {
  try {
    const { url, quality = 'highestaudio' } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }
    
    if (!isValidYouTubeUrl(url)) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }
    
    // Validate if video exists and is accessible
    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title.replace(/[^\w\s]/gi, '');
    
    res.setHeader('Content-Type', 'audio/webm');
    res.setHeader('Content-Disposition', `inline; filename="${title}.webm"`);
    res.setHeader('Accept-Ranges', 'bytes');
    
    const stream = ytdl(url, {
      quality: quality,
      filter: 'audioonly'
    });
    
    stream.pipe(res);
    
    stream.on('error', (error) => {
      console.error('Stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Streaming failed',
          message: error.message
        });
      }
    });
    
  } catch (error) {
    console.error('Stream error:', error);
    res.status(500).json({
      error: 'Streaming failed',
      message: error.message
    });
  }
});

// Download music
app.get('/api/download', async (req, res) => {
  try {
    const { url, format = 'mp3' } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }
    
    if (!isValidYouTubeUrl(url)) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }
    
    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title.replace(/[^\w\s]/gi, '');
    const filename = `${title}.${format === 'mp3' ? 'webm' : format}`;
    
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    const stream = ytdl(url, {
      quality: 'highestaudio',
      filter: 'audioonly'
    });
    
    stream.pipe(res);
    
    stream.on('error', (error) => {
      console.error('Download error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Download failed',
          message: error.message
        });
      }
    });
    
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      error: 'Download failed',
      message: error.message
    });
  }
});

// Get trending music
app.get('/api/trending', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    // Search for trending music
    const trendingQueries = [
      'trending music 2025',
      'popular songs',
      'top hits',
      'viral music'
    ];
    
    const randomQuery = trendingQueries[Math.floor(Math.random() * trendingQueries.length)];
    const results = await yts(randomQuery);
    
    const videos = results.videos.slice(0, parseInt(limit)).map(video => ({
      id: video.videoId,
      title: video.title,
      author: video.author.name,
      duration: video.duration.text,
      thumbnail: video.thumbnail,
      url: video.url,
      views: video.views
    }));
    
    res.json({
      success: true,
      trending: videos
    });
    
  } catch (error) {
    console.error('Trending error:', error);
    res.status(500).json({
      error: 'Failed to get trending music',
      message: error.message
    });
  }
});

// Get playlist info (basic implementation)
app.get('/api/playlist', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'Playlist URL parameter is required' });
    }
    
    // Extract playlist ID
    const playlistIdMatch = url.match(/[&?]list=([^&]+)/);
    if (!playlistIdMatch) {
      return res.status(400).json({ error: 'Invalid playlist URL' });
    }
    
    // Note: This is a basic implementation. For full playlist support,
    // you'd need additional packages like youtube-playlist or similar
    res.json({
      success: false,
      message: 'Playlist support coming soon. Use search to find individual tracks.',
      playlistId: playlistIdMatch[1]
    });
    
  } catch (error) {
    console.error('Playlist error:', error);
    res.status(500).json({
      error: 'Playlist processing failed',
      message: error.message
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: 'Something went wrong on our end'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: 'The requested API endpoint does not exist'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🎵 YouTube Music API running on port ${PORT}`);
  console.log(`🌐 API documentation: http://localhost:${PORT}`);
  console.log(`🔍 Search: http://localhost:${PORT}/api/search?q=your+query`);
  console.log(`📺 Info: http://localhost:${PORT}/api/info?url=youtube_url`);
  console.log(`🎧 Stream: http://localhost:${PORT}/api/stream?url=youtube_url`);
  console.log(`⬇️  Download: http://localhost:${PORT}/api/download?url=youtube_url`);
});

module.exports = app;