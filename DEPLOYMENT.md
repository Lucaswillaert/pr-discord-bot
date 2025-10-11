# Deployment Guide

This guide will walk you through deploying the PR Discord Bot to Vercel.

## Prerequisites

- ✅ A [Vercel](https://vercel.com) account
- ✅ [Vercel CLI](https://vercel.com/docs/cli) installed: `npm install -g vercel`
- ✅ A Discord bot token
- ✅ A Discord channel ID
- ✅ A GitHub webhook secret

## Step 1: Verify Project Structure

Before deploying, verify the project structure is correct:

```bash
npm run verify
```

You should see:
```
✅ Project structure is ready for Vercel deployment!
```

## Step 2: Run Tests

Ensure all tests pass:

```bash
npm test
```

Expected output:
```
Test Suites: 1 passed, 1 total
Tests:       13 passed, 13 total
```

## Step 3: Deploy to Vercel

### First-time deployment:

```bash
vercel
```

Follow the prompts:
- Set up and deploy? **Y**
- Which scope? Select your account
- Link to existing project? **N**
- Project name? `pr-discord-bot` (or your choice)
- In which directory is your code located? `./`
- Want to override the settings? **N**

### Subsequent deployments:

```bash
vercel --prod
```

## Step 4: Configure Environment Variables

You have two options:

### Option A: Using Vercel CLI

```bash
vercel env add DISCORD_TOKEN
# Enter your Discord bot token when prompted

vercel env add CHANNEL_ID
# Enter your Discord channel ID when prompted

vercel env add GITHUB_WEBHOOK_SECRET
# Enter your webhook secret when prompted
```

### Option B: Using Vercel Dashboard

1. Go to your project in [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Settings** → **Environment Variables**
3. Add each variable:
   - `DISCORD_TOKEN`: Your Discord bot token
   - `CHANNEL_ID`: Your Discord channel ID
   - `GITHUB_WEBHOOK_SECRET`: Your webhook secret

Make sure to select all environments (Production, Preview, Development) for each variable.

## Step 5: Redeploy After Adding Environment Variables

```bash
vercel --prod
```

## Step 6: Test the Deployment

### Test the health check endpoint:

```bash
curl https://your-project.vercel.app/api/github-webhook
```

Expected response:
```json
{"ok":true,"route":"/api/github-webhook"}
```

### Test with the manual testing script:

```bash
node test-webhook.js https://your-project.vercel.app/api/github-webhook your-webhook-secret
```

## Step 7: Configure GitHub Webhook

1. Go to your GitHub repository
2. Click **Settings** → **Webhooks** → **Add webhook**
3. Configure:
   - **Payload URL**: `https://your-project.vercel.app/api/github-webhook`
   - **Content type**: `application/json`
   - **Secret**: Your webhook secret (same as `GITHUB_WEBHOOK_SECRET`)
   - **Which events**: Select "Let me select individual events"
     - Check **Pull requests**
     - Uncheck everything else
   - **Active**: ✓ (checked)
4. Click **Add webhook**

## Step 8: Test with a Real Pull Request

1. Create a test branch in your repository
2. Make a small change
3. Open a pull request
4. Check your Discord channel for the notification!

Expected notification format:
```
Nieuwe pull request in **owner/repo**
Titel: Your PR Title
Auteur: username
Branches: feature-branch → main
https://github.com/owner/repo/pull/123
```

## Troubleshooting

### Check Vercel Logs

```bash
vercel logs
```

Or visit the Vercel Dashboard → Your Project → Deployments → Select deployment → View logs

### Common Issues

#### 1. "Invalid signature" errors

- Verify `GITHUB_WEBHOOK_SECRET` in Vercel matches the secret in GitHub webhook settings
- Check that the webhook is using `application/json` content type

#### 2. No Discord message sent

- Verify `DISCORD_TOKEN` is correct
- Verify `CHANNEL_ID` is correct
- Check that the bot has permission to send messages in the channel
- Make sure the bot is added to your Discord server

#### 3. 401 Unauthorized

- The webhook signature verification failed
- Check that `GITHUB_WEBHOOK_SECRET` is set correctly in Vercel
- Verify the GitHub webhook is configured with the correct secret

#### 4. 500 Internal Server Error

- Check Vercel logs for detailed error messages
- Verify all environment variables are set
- Test Discord bot token separately

### Get Discord Bot Token

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application or select existing one
3. Go to **Bot** section
4. Click **Reset Token** and copy the new token
5. Under **Privileged Gateway Intents**, enable:
   - Presence Intent
   - Server Members Intent
   - Message Content Intent
6. Save changes

### Get Discord Channel ID

1. Enable Developer Mode in Discord:
   - User Settings → Advanced → Developer Mode (enable)
2. Right-click on the channel where you want notifications
3. Click **Copy ID**

### Add Bot to Your Server

1. In Discord Developer Portal, go to **OAuth2** → **URL Generator**
2. Select scopes:
   - `bot`
3. Select bot permissions:
   - Send Messages
   - Read Messages/View Channels
4. Copy the generated URL and open it in your browser
5. Select your server and authorize the bot

## Monitoring

### View Deployment Status

```bash
vercel ls
```

### View Recent Logs

```bash
vercel logs --follow
```

### Check Function Metrics

Visit Vercel Dashboard → Your Project → Analytics to see:
- Function invocations
- Execution duration
- Error rates

## Updating

To deploy updates:

1. Make changes to your code
2. Run tests: `npm test`
3. Verify structure: `npm run verify`
4. Deploy: `vercel --prod`

## Rollback

If something goes wrong, you can rollback to a previous deployment:

1. Visit Vercel Dashboard → Your Project → Deployments
2. Find the working deployment
3. Click the three dots menu → **Promote to Production**

## Security Best Practices

- ✅ Never commit `.env` files
- ✅ Rotate secrets regularly
- ✅ Use different secrets for different environments
- ✅ Monitor Vercel logs for suspicious activity
- ✅ Keep dependencies updated

## Support

For issues:
- Check the [README.md](README.md) for general information
- Check the [TESTING.md](TESTING.md) for testing guides
- Review Vercel logs for errors
- Check GitHub webhook delivery logs

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Discord.js Guide](https://discordjs.guide/)
- [GitHub Webhooks Documentation](https://docs.github.com/en/webhooks)
