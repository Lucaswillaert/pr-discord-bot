const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');
const bodyParser = require('body-parser');
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

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
  if (event === 'pull_request' && req.body.action === 'opened') {
    const pr = req.body.pull_request;
    const repo = req.body.repository.full_name;
    try {
      const channel = await client.channels.fetch(CHANNEL_ID);
      await channel.send(
        'Nieuwe pull request in **${repo}**: [${pr.title}] ${pr.html_url}'
      );
      console.log('Melding verstuurd voor PR: ${pr.title}');
    } catch (err) {
      console.error('Fout bij versturen naar Discord:', err);
    }
  }
  res.status(200).send('OK');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('Webhook server draait op poort ${PORT}');
});

client.login(DISCORD_TOKEN);
