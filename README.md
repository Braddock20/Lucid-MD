# YouTube Music API 🎵

A powerful and easy-to-use YouTube Music API for searching, streaming, and downloading music from YouTube. Built with Node.js and Express.

## Features

✨ **Search Music** - Search for songs, artists, and albums  
🎧 **Stream Audio** - Stream music directly without downloading  
⬇️ **Download Music** - Download audio files in various formats  
📊 **Get Video Info** - Retrieve detailed information about YouTube videos  
🔥 **Trending Music** - Get trending and popular music  
⚡ **Fast & Lightweight** - Optimized for performance  
🛡️ **Rate Limiting** - Built-in rate limiting for API protection  

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Braddock20/Lucid-MD.git
cd Lucid-MD
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

The API will be running on `http://localhost:3000`

## API Endpoints

### Base URL
```
http://localhost:3000
```

### 🔍 Search Music
```http
GET /api/search?q=song_name&limit=20
```

**Parameters:**
- `q` (required): Search query
- `limit` (optional): Number of results (default: 20)

**Example:**
```bash
curl "http://localhost:3000/api/search?q=imagine%20dragons&limit=10"
```

### 📺 Get Video Info
```http
GET /api/info?url=youtube_url
```

**Parameters:**
- `url` (required): YouTube video URL

**Example:**
```bash
curl "http://localhost:3000/api/info?url=https://www.youtube.com/watch?v=VIDEO_ID"
```

### 🎧 Stream Audio
```http
GET /api/stream?url=youtube_url&quality=highestaudio
```

**Parameters:**
- `url` (required): YouTube video URL
- `quality` (optional): Audio quality (default: highestaudio)

**Example:**
```bash
curl "http://localhost:3000/api/stream?url=https://www.youtube.com/watch?v=VIDEO_ID"
```

### ⬇️ Download Audio
```http
GET /api/download?url=youtube_url&format=mp3
```

**Parameters:**
- `url` (required): YouTube video URL
- `format` (optional): Audio format (default: mp3)

**Example:**
```bash
curl -o song.webm "http://localhost:3000/api/download?url=https://www.youtube.com/watch?v=VIDEO_ID"
```

### 🔥 Get Trending Music
```http
GET /api/trending?limit=20
```

**Parameters:**
- `limit` (optional): Number of results (default: 20)

**Example:**
```bash
curl "http://localhost:3000/api/trending?limit=15"
```

## Response Format

All endpoints return JSON responses with the following structure:

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data here
  }
}
```

### Error Response
```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

## Usage Examples

### JavaScript/Fetch
```javascript
// Search for music
const searchMusic = async (query) => {
  const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  const data = await response.json();
  return data.results;
};

// Stream audio
const streamAudio = (url) => {
  const audioElement = new Audio(`/api/stream?url=${encodeURIComponent(url)}`);
  audioElement.play();
};

// Download audio
const downloadAudio = (url, filename) => {
  const link = document.createElement('a');
  link.href = `/api/download?url=${encodeURIComponent(url)}`;
  link.download = filename;
  link.click();
};
```

### Python
```python
import requests

# Search for music
def search_music(query, limit=20):
    response = requests.get(f'http://localhost:3000/api/search?q={query}&limit={limit}')
    return response.json()

# Get video info
def get_video_info(url):
    response = requests.get(f'http://localhost:3000/api/info?url={url}')
    return response.json()

# Download audio
def download_audio(url, filename):
    response = requests.get(f'http://localhost:3000/api/download?url={url}', stream=True)
    with open(filename, 'wb') as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)
```

## Rate Limiting

The API includes built-in rate limiting:
- **100 requests per hour** per IP address
- Rate limit resets every hour
- Exceeding the limit returns a `429 Too Many Requests` status

## Deployment

### Deploy to Heroku

1. Create a `Procfile`:
```
web: node server.js
```

2. Deploy:
```bash
heroku create your-app-name
git push heroku main
```

### 🚀 Deploy to Railway

1. Go to [Railway](https://railway.app/)
2. Click “**Start New Project**” → **Deploy from GitHub**
3. Select your repo: `Braddock20/Lucid-MD`
4. Set environment variables:
   - `PORT = 3000`
   - `RATE_LIMIT = 100`
   - `RATE_LIMIT_WINDOW = 3600000`
5. Click **Deploy**!

After deployment, Railway will give you a public URL like:

```
https://lucid-md.up.railway.app
```

---

### Deploy to Railway (Original Instructions)


1. Connect your GitHub repository to Railway
2. Set environment variables if needed
3. Deploy automatically

### Deploy to Vercel

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

## Environment Variables

You can customize the API using environment variables:

- `PORT`: Server port (default: 3000)
- `RATE_LIMIT`: Requests per hour (default: 100)
- `RATE_LIMIT_WINDOW`: Rate limit window in milliseconds (default: 3600000)

Create a `.env` file:
```env
PORT=3000
RATE_LIMIT=100
RATE_LIMIT_WINDOW=3600000
```

## Error Handling

The API handles various error scenarios:

- **Invalid YouTube URLs**: Returns 400 Bad Request
- **Video not found**: Returns 404 Not Found
- **Rate limit exceeded**: Returns 429 Too Many Requests
- **Server errors**: Returns 500 Internal Server Error

## Legal Notice

⚠️ **Important**: This API is for educational purposes only. Please respect YouTube's Terms of Service and copyright laws. The developers are not responsible for any misuse of this software.

- Only download content you have permission to download
- Respect copyright and intellectual property rights
- Use responsibly and ethically

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

If you encounter any issues or have questions:

1. Check the documentation above
2. Search existing GitHub issues
3. Create a new issue with detailed information

## Changelog

### v1.0.0
- Initial release
- Basic search, stream, and download functionality
- Rate limiting
- Error handling
- API documentation

---

Made with ❤️ for music lovers everywhere