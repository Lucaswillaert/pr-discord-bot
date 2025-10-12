# PR Discord Bot

A serverless Discord bot that sends notifications to a Discord channel when pull requests are opened on GitHub. Built to run on Vercel.

## Features

- 🔔 Sends Discord notifications when a PR is opened
- 🔒 Verifies GitHub webhook signatures for security
- ☁️ Serverless deployment on Vercel
- ✅ Comprehensive test coverage

## Setup

### Prerequisites

1. A Discord bot token (create one at [Discord Developer Portal](https://discord.com/developers/applications))
2. A Discord channel ID where notifications will be sent
3. A GitHub webhook secret (you'll set this when creating the webhook)
4. A Vercel account for deployment

### Local Development

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd pr-discord-bot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Fill in your environment variables in `.env`:
   - `DISCORD_TOKEN`: Your Discord bot token
   - `CHANNEL_ID`: The Discord channel ID for notifications
   - `GITHUB_WEBHOOK_SECRET`: Secret for webhook verification

### Testing

Run the test suite:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

The test suite includes:
- ✅ Health check endpoint (GET)
- ✅ Invalid method handling
- ✅ Signature verification (valid/invalid)
- ✅ JSON parsing
- ✅ Pull request opened event handling
- ✅ Other GitHub events
- ✅ Error handling

## Deployment

### Deploy to Vercel

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Set environment variables in Vercel:
   ```bash
   vercel env add DISCORD_TOKEN
   vercel env add CHANNEL_ID
   vercel env add GITHUB_WEBHOOK_SECRET
   ```

### Configure GitHub Webhook

1. Go to your GitHub repository → Settings → Webhooks → Add webhook
2. Set the Payload URL to: `https://your-vercel-domain.vercel.app/api/github-webhook`
3. Set Content type to: `application/json`
4. Set the Secret to match your `GITHUB_WEBHOOK_SECRET`
5. Select "Let me select individual events" and choose:
   - Pull requests
6. Click "Add webhook"

## API Endpoints

### GET /api/github-webhook

Health check endpoint.

**Response:**
```json
{
  "ok": true,
  "route": "/api/github-webhook"
}
```

### POST /api/github-webhook

Receives GitHub webhook events.

**Headers:**
- `x-github-event`: The event type (e.g., "pull_request")
- `x-hub-signature-256`: HMAC signature for verification

**Supported Events:**
- `pull_request` with action `opened`

## Project Structure

```
pr-discord-bot/
├── api/
│   ├── github-webhook.js      # Main webhook handler
│   └── github-webhook.test.js # Test suite
├── .env.example               # Environment variables template
├── .gitignore                 # Git ignore rules
├── package.json               # Dependencies and scripts
├── vercel.json                # Vercel configuration
└── README.md                  # This file
```

## How It Works

1. GitHub sends a webhook when a PR is opened
2. Vercel receives the webhook at `/api/github-webhook`
3. The handler verifies the HMAC signature
4. If valid, it parses the payload
5. For `pull_request.opened` events, it:
   - Extracts PR information (title, author, branches, URL)
   - Connects to Discord
   - Sends a formatted message to the configured channel

## Security

- ✅ Webhook signature verification using HMAC SHA-256
- ✅ Environment variables for sensitive data
- ✅ No credentials stored in code

## License

ISC
