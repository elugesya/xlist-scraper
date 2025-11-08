# X List Scraper

A robust Twitter (X) List scraper with both CLI and HTTP API interfaces. Built with Node.js, TypeScript, Playwright, and Fastify.

## Features

- 🚀 **Triple Interface**: Use as Apify Actor, CLI tool, or HTTP API
- 🎯 **Robust Scraping**: Infinite scroll, dedupe, retry logic, graceful error handling
- 🔍 **Rich Data**: Extract tweets with full engagement metrics, timestamps, and metadata
- 🐳 **Docker Ready**: Dockerfile based on Playwright image
- 📊 **OpenAPI Docs**: Auto-generated API documentation
- 🔐 **Token Ready**: Authentication middleware (disabled by default)
- ⚡ **Configurable**: Extensive options for customization
- 🕷️ **Apify Actor**: Ready to deploy on Apify platform

## Installation

### Using pnpm (recommended)

```bash
pnpm install
pnpm build
```

### Using npm

```bash
npm install
npm run build
```

### Using Docker

**For Actor mode** (standalone scraping):
```bash
docker build -t xlist-scraper .
docker run -e APIFY_IS_AT_HOME=1 \
  -e APIFY_INPUT_VALUE='{"listURLs":["https://x.com/i/lists/YOUR_LIST_ID"],"maxTweets":100}' \
  xlist-scraper
```

**For Server mode** (HTTP API):
```bash
docker build -t xlist-scraper .
docker run -p 8080:8080 xlist-scraper node dist/api/server.js
```

Or with docker-compose:

```bash
docker-compose up -d
```

## Quick Start

### Apify Actor

The easiest way to use this scraper is via Apify:

1. **Via Apify Console**: Visit the [Actor page](https://apify.com/neta/xlist-scraper) and run with custom input
2. **Via API**:
   ```bash
   curl -X POST "https://api.apify.com/v2/acts/neta~xlist-scraper/runs?token=YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "listURLs": ["https://x.com/i/lists/1985510758294208956"],
       "maxTweets": 100,
       "timeoutMs": 60000,
       "headless": true
     }'
   ```

The Actor will scrape tweets and store them in a dataset that you can download in various formats (JSON, CSV, Excel).

### HTTP API

Start the server:

```bash
pnpm start
# or
node dist/api/server.js
```

Make a request:

```bash
curl -s -X POST http://localhost:8080/scrape/list \
  -H 'Content-Type: application/json' \
  -d '{
    "max-tweets": 50,
    "timeout-ms": 60000,
    "listURL": ["https://x.com/i/lists/1985510758294208956"]
  }' | jq .
```

### CLI

```bash
# Basic usage
xlist-scrape "https://x.com/i/lists/1985510758294208956"

# With options
xlist-scrape "https://x.com/i/lists/1985510758294208956" \
  --max-tweets 500 \
  --timeout 120000

# Save to file
xlist-scrape "https://x.com/i/lists/1985510758294208956" > tweets.json
```

### Library

```typescript
import { scrapeList } from 'xlist-scraper';

const tweets = await scrapeList('https://x.com/i/lists/1985510758294208956', {
  maxTweets: 200,
  timeoutMs: 60000,
  headless: true
});

console.log(tweets);
```

## API Reference

### Endpoints

#### `GET /health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok"
}
```

#### `POST /scrape/list`

Scrape tweets from one or more Twitter Lists.

**Request Body:**

```typescript
{
  listURL: string[];           // Required: Array of list URLs
  "max-tweets"?: number;       // Optional: 1-2000, default 200
  "timeout-ms"?: number;       // Optional: 10000-300000, default 60000

  // CamelCase aliases also accepted:
  listUrl?: string[];
  maxTweets?: number;
  timeoutMs?: number;
}
```

**Example Request:**

```bash
curl -X POST http://localhost:8080/scrape/list \
  -H 'Content-Type: application/json' \
  -d '{
    "listURL": [
      "https://x.com/i/lists/1985510758294208956",
      "https://x.com/i/lists/1234567890"
    ],
    "max-tweets": 100,
    "timeout-ms": 60000
  }'
```

**Success Response (200):**

```json
{
  "ok": true,
  "count": 123,
  "items": [
    {
      "id": "1234567890",
      "text": "Tweet text here...",
      "retweetCount": 42,
      "replyCount": 10,
      "likeCount": 156,
      "quoteCount": 5,
      "createdAt": "Tue Nov 04 19:06:32 +0000 2025",
      "bookmarkCount": 0,
      "isRetweet": false,
      "isQuote": false,
      "sourceListURL": "https://x.com/i/lists/1985510758294208956"
    }
  ]
}
```

**Error Responses:**

- **400 Validation Error:**
  ```json
  {
    "ok": false,
    "error": "VALIDATION_ERROR",
    "details": [...]
  }
  ```

- **422 Partial Results:**
  ```json
  {
    "ok": false,
    "error": "PARTIAL_RESULTS",
    "items": [...],
    "details": ["error messages..."]
  }
  ```

- **429 Rate Limited:**
  ```json
  {
    "ok": false,
    "error": "RATE_LIMIT"
  }
  ```

- **500 Internal Error:**
  ```json
  {
    "ok": false,
    "error": "INTERNAL",
    "message": "error details"
  }
  ```

### OpenAPI Documentation

Interactive API documentation is available at:
- **Swagger UI**: `http://localhost:8080/docs`
- **OpenAPI JSON**: `http://localhost:8080/docs/json`

## CLI Usage

### Basic Commands

```bash
# Show help
xlist-scrape --help

# Basic scrape
xlist-scrape "https://x.com/i/lists/1985510758294208956"

# Limit tweets
xlist-scrape "https://x.com/i/lists/1985510758294208956" --max-tweets 500

# Use cookies for authentication
xlist-scrape "https://x.com/i/lists/1985510758294208956" --cookies ./cookies.json

# Use proxy
xlist-scrape "https://x.com/i/lists/1985510758294208956" --proxy "http://user:pass@proxy:8080"

# Allow partial results
xlist-scrape "https://x.com/i/lists/1985510758294208956" --partial-ok

# Run in non-headless mode (show browser)
xlist-scrape "https://x.com/i/lists/1985510758294208956" --headless false
```

### CLI Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--max-tweets` | number | 200 | Maximum tweets to scrape |
| `--timeout` | number | 60000 | Timeout in milliseconds |
| `--headless` | boolean | true | Run browser in headless mode |
| `--cookies` | string | - | Path to cookies file |
| `--proxy` | string | - | Proxy URL |
| `--partial-ok` | boolean | false | Return partial results on error |

## Configuration

### Environment Variables

```bash
# Server Configuration
PORT=8080                          # Server port
HOST=0.0.0.0                       # Server host
LOG_LEVEL=info                     # Log level (debug, info, warn, error)

# Scraper Configuration
HEADLESS=true                      # Run browser headless
PERSIST_COOKIES_PATH=/data/cookies.json  # Cookie persistence path
PROXY=http://user:pass@host:port   # Proxy configuration
CONCURRENCY=1                      # Number of concurrent scrapes
RESPECT_ROBOTS=true                # Respect robots.txt

# Authentication (Token-Ready, disabled by default)
AUTH_MODE=off                      # off | optional | required
```

### Docker Configuration

The included Dockerfile uses the official Playwright image and includes:
- Automatic browser installation
- Cookie persistence volume
- Health checks
- Graceful shutdown handling

**Environment variables for Docker:**

```yaml
environment:
  - PORT=8080
  - HEADLESS=true
  - PERSIST_COOKIES_PATH=/data/cookies.json
  - CONCURRENCY=1
```

## Tweet Data Schema

Each tweet includes:

```typescript
{
  id: string;              // Tweet ID
  text: string;            // Tweet text content
  retweetCount: number;    // Number of retweets
  replyCount: number;      // Number of replies
  likeCount: number;       // Number of likes
  quoteCount: number;      // Number of quote tweets
  createdAt: string;       // "EEE MMM dd HH:mm:ss +0000 yyyy"
  bookmarkCount: number;   // Number of bookmarks (usually 0)
  isRetweet: boolean;      // Whether this is a retweet
  isQuote: boolean;        // Whether this is a quote tweet
  sourceListURL: string;   // (API only) Source list URL
}
```

## Authentication

The scraper can work without authentication but may encounter rate limits. To avoid this:

1. **Export cookies from your browser**:
   - Use a browser extension like "EditThisCookie" or "Cookie Editor"
   - Export cookies for x.com/twitter.com
   - Save as `cookies.json`

2. **Use cookies with CLI**:
   ```bash
   xlist-scrape "https://x.com/i/lists/123" --cookies ./cookies.json
   ```

3. **Use cookies with Docker**:
   ```bash
   docker run -v $(pwd)/cookies.json:/data/cookies.json xlist-scraper
   ```

4. **Environment variable**:
   ```bash
   PERSIST_COOKIES_PATH=/path/to/cookies.json
   ```

## Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test -- --coverage
```

Tests include:
- ✅ Unit tests for utility functions
- ✅ Schema validation tests
- ✅ API integration tests
- ✅ Count parsing (K, M, B suffixes)
- ✅ Timestamp formatting
- ✅ URL validation

## Development

```bash
# Install dependencies
pnpm install

# Build TypeScript
pnpm build

# Start dev server with watch mode
pnpm dev

# Lint code
pnpm lint

# Format code
pnpm format
```

## Deployment

### Docker

```bash
docker build -t xlist-scraper .
docker run -d -p 8080:8080 --name xlist xlist-scraper
```

### Docker Compose

```bash
docker-compose up -d
```

### Cloud Platforms

The application is ready to deploy to:
- **Railway**: Dockerfile included
- **Fly.io**: Works out of the box
- **Google Cloud Run**: Set PORT env var
- **AWS ECS/Fargate**: Use provided Dockerfile
- **Heroku**: Buildpack compatible

### Apify Actor Deployment

This project is ready to deploy as an Apify Actor:

**Project Structure for Apify:**
- `src/actor.ts` - Main Actor entrypoint (reads input, scrapes, pushes to dataset)
- `.apify/actor.json` - Actor configuration and metadata
- `INPUT_SCHEMA.json` - Input schema for Apify UI
- `Dockerfile` - Runs `dist/actor.js` by default

**Deployment Steps:**

1. **Via Apify Console**:
   - Create new Actor from Git repository
   - Point to your GitHub repository
   - Apify will automatically detect the Dockerfile and INPUT_SCHEMA.json
   - Build and publish

2. **Via Apify CLI**:
   ```bash
   # Install Apify CLI
   npm install -g apify-cli
   
   # Login
   apify login
   
   # Push to Apify
   apify push
   ```

3. **Key Configuration**:
   - The Dockerfile uses `mcr.microsoft.com/playwright:v1.42.1-jammy` base image (browsers pre-installed)
   - Playwright version is pinned to `1.42.1` in `package.json` to match the base image
   - Actor reads input from `APIFY_INPUT_VALUE` environment variable
   - Results are pushed to Apify dataset (one item per tweet)

4. **Running the Actor**:
   - Via Console: Use the web interface with input form
   - Via API: See "Quick Start > Apify Actor" section above
   - Output: Dataset with tweets in JSON/CSV/Excel format

5. **For Server Mode** (HTTP API instead of Actor):
   - Override Dockerfile CMD: `CMD ["node", "dist/api/server.js"]`
   - Or set via Apify Actor settings

**Input Schema:**
The Actor accepts the following input (see `INPUT_SCHEMA.json` for full schema):
- `listURLs` (required): Array of Twitter/X list URLs
- `maxTweets`: Maximum tweets per list (default: 200)
- `timeoutMs`: Page timeout in milliseconds (default: 60000)
- `headless`: Run browser headless (default: true)
- `proxy`: Optional proxy URL
- `persistCookiesPath`: Path for cookie storage (default: /data/cookies.json)
- `partialOk`: Allow partial results on error (default: false)

## Architecture

```
/src
  /api
    server.ts      # Fastify server setup
    routes.ts      # API route handlers
    schemas.ts     # Zod validation schemas
  /scraper
    scrapeList.ts  # Main scraper logic
    domParsers.ts  # DOM parsing utilities
  /lib
    counts.ts      # Count parsing (1.2K → 1200)
    time.ts        # Timestamp formatting
    url.ts         # URL validation/normalization
  types.ts         # TypeScript type definitions
  index.ts         # Library exports
  cli.ts           # CLI implementation
```

## Troubleshooting

### Common Issues

**Login Wall / Rate Limiting**
- Solution: Use cookies for authentication (see Authentication section)

**Timeout Errors**
- Increase `timeout-ms` parameter
- Check internet connection
- Verify list URL is valid

**No Tweets Found**
- List may be private (requires authentication)
- List may be empty
- URL may be incorrect

**Docker Issues**
- Ensure Playwright browsers are installed in the image
- Check volume mounts for cookie persistence
- Verify port mappings

## Performance

- **Default concurrency**: 1 (sequential scraping to avoid rate limits)
- **Configurable via**: `CONCURRENCY` env variable
- **Recommended**: Keep at 1-2 to avoid detection
- **Memory usage**: ~200-500MB per browser instance
- **Speed**: ~50-100 tweets per minute (varies by list)

## Limitations

- **Quote count**: Not always available from DOM, may be 0
- **Bookmark count**: Requires interaction, typically 0
- **Private lists**: Require authentication cookies
- **Rate limits**: Twitter may throttle requests
- **Login walls**: May appear without cookies

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Submit a pull request

## License

MIT

## Support

- 📖 Documentation: See this README
- 🐛 Issues: GitHub Issues
- 💬 Questions: GitHub Discussions

## Acknowledgments

Built with:
- [Playwright](https://playwright.dev/) - Browser automation
- [Fastify](https://www.fastify.io/) - Web framework
- [Zod](https://zod.dev/) - Schema validation
- [TypeScript](https://www.typescriptlang.org/) - Type safety
