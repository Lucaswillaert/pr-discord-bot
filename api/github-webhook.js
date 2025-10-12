// File: api/github-webhook.js
import crypto from 'crypto';
import { Client, GatewayIntentBits } from 'discord.js';

export const config = {
  api: {
    bodyParser: false, // raw body nodig voor HMAC
  },
};

let discordClient;
let loginPromise;

function getDiscordClient() {
  if (!discordClient) {
    discordClient = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
    });
    loginPromise = discordClient.login(process.env.DISCORD_TOKEN);
    loginPromise.catch((err) => {
      console.error('Discord login failed:', err);
    });
  }
  return loginPromise.then(() => discordClient);
}

function verifySignature(req, rawBody) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  const sig = req.headers['x-hub-signature-256'];
  if (!secret || !sig) return false;
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(sig));
  } catch {
    return false;
  }
}

async function handlePullRequestOpened(payload) {
  const pr = payload.pull_request;
  const repo = payload.repository?.full_name;
  const author = pr?.user?.login;
  const baseBranch = pr?.base?.ref;
  const headBranch = pr?.head?.ref;

  const message =
    `Nieuwe pull request in **${repo}**\n` +
    `Titel: ${pr?.title}\n` +
    `Auteur: ${author}\n` +
    `Branches: ${headBranch} → ${baseBranch}\n` +
    `${pr?.html_url}`;

  const client = await getDiscordClient();
  const channel = await client.channels.fetch(process.env.CHANNEL_ID);
  await channel.send(message);

  console.log(`PR notified: ${repo} - ${pr?.title}`);
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, route: '/api/github-webhook' });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Lees raw body
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const rawBody = Buffer.concat(chunks);

  // Verify HMAC
  if (!verifySignature(req, rawBody)) {
    return res.status(401).send('invalid signature');
  }

  let payload;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).send('invalid json');
  }

  try {
    const event = req.headers['x-github-event'];
    const action = payload?.action;

    if (event === 'pull_request' && action === 'opened') {
      await handlePullRequestOpened(payload);
    }

    return res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook handler error:', err);
    return res.status(200).send('Received');
  }
}
