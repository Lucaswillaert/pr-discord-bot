require('dotenv').config();

const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');
const bodyParser = require('body-parser');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

if (!DISCORD_TOKEN || !CHANNEL_ID) {
  console.error('Missing DISCORD_TOKEN or CHANNEL_ID environment variables.');
  process.exit(1);
}

const app = express();

app.use(bodyParser.json());

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.once('clientReady', () => {
  console.log('Discord bot is online!');
});

// Helper to handle PR notifications
async function handlePullRequestOpened(req) {
  const pr = req.body.pull_request;
  const repo = req.body.repository?.full_name;
  const author = pr?.user?.login;
  const baseBranch = pr?.base?.ref;
  const headBranch = pr?.head?.ref;

  const message =
    `Nieuwe pull request in **${repo}**\n` +
    `Titel: ${pr?.title}\n` +
    `Auteur: ${author}\n` +
    `Branches: ${headBranch} → ${baseBranch}\n` +
    `${pr?.html_url}`;

  const channel = await client.channels.fetch(CHANNEL_ID);
  await channel.send(message);

  console.log(`PR notified: ${repo} - ${pr?.title}`);
}

// Core webhook handler (mounted on both "/" and "/github-webhook")
async function githubWebhookHandler(req, res) {
  try {
    const event = req.headers['x-github-event'];
    const action = req.body?.action; // FIX: define action from payload

    // Only notify on newly opened PRs
    if (event === 'pull_request' && action === 'opened') {
      await handlePullRequestOpened(req);
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook handler error:', err);
    // Still return 200 to prevent GitHub retries storm; log for debugging
    res.status(200).send('Received');
  }
}

// Mount routes to match your GitHub settings and your code
app.post('/', githubWebhookHandler); // matches current GitHub payload URL (root)
app.post('/github-webhook', githubWebhookHandler); // matches your original endpoint

// Simple healthcheck (useful for Railway Healthcheck Path)
app.get('/', (_req, res) => {
  res.status(200).send('Alive');
});

// Basic error handler to avoid crashing the process
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).send('Internal Server Error');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Webhook server draait op poort ${PORT}`);
});

client.login(DISCORD_TOKEN);
