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

client.once('ready', () => {
  console.log('Discord bot is online!');
});

app.post('/github-webhook', async (req, res) => {
  const event = req.headers['x-github-event'];
  // Only notify on newly opened PRs
  if (event === 'pull_request' && action === 'opened') {
    const pr = req.body.pull_request;
    const repo = req.body.repository.full_name;
    const author = pr.user?.login;
    const baseBranch = pr.base?.ref;
    const headBranch = pr.head?.ref;

    const message =
      `Nieuwe pull request in **${repo}**\n` +
      `Titel: ${pr.title}\n` +
      `Auteur: ${author}\n` +
      `Branches: ${headBranch} → ${baseBranch}\n` +
      `${pr.html_url}`;

    try {
      const channel = await client.channels.fetch(CHANNEL_ID);
      await channel.send(message);
      console.log(`PR notified: ${repo} - ${pr.title}`);
    } catch (err) {
      console.error('Error sending to Discord:', err);
    }
  }

  res.status(200).send('OK');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('Webhook server draait op poort ${PORT}');
});

client.login(DISCORD_TOKEN);
