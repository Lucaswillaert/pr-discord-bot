// File: gitbot.js
import http from 'http';
import https from 'https';
import crypto from 'crypto';
import { Client, GatewayIntentBits } from 'discord.js';

const {
  PORT = 3000,
  DISCORD_TOKEN,
  CHANNEL_ID,
  GITHUB_WEBHOOK_SECRET,
  RAILWAY_PUBLIC_DOMAIN, // Railway sets this automatically
} = process.env;

if (!GITHUB_WEBHOOK_SECRET) {
  console.warn(
    'GITHUB_WEBHOOK_SECRET ontbreekt — signature verificatie zal falen.'
  );
}
if (!DISCORD_TOKEN || !CHANNEL_ID) {
  console.warn(
    'DISCORD_TOKEN of CHANNEL_ID ontbreekt — Discord notificaties worden overgeslagen.'
  );
}

let discordClient = null;
let discordLoginPromise = null;

function getDiscordClient() {
  if (!DISCORD_TOKEN || !CHANNEL_ID) {
    throw new Error('Missing DISCORD_TOKEN or CHANNEL_ID');
  }
  if (!discordClient) {
    discordClient = new Client({ intents: [GatewayIntentBits.Guilds] });
    discordLoginPromise = discordClient.login(DISCORD_TOKEN).catch((err) => {
      console.error('Discord login failed:', err);
      discordClient = null;
      discordLoginPromise = null;
      throw err;
    });
  }
  return discordLoginPromise.then(() => discordClient);
}

function verifySignatureRaw(signatureHeader, rawBody, secret) {
  if (!signatureHeader || !secret) return false;
  const hmac = crypto.createHmac('sha256', secret);
  const expected = 'sha256=' + hmac.update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signatureHeader)
    );
  } catch {
    return false;
  }
}

async function notifyPullRequestOpened(payload) {
  const pr = payload.pull_request;
  const repo = payload.repository?.full_name ?? 'unknown repo';
  const author = pr?.user?.login ?? 'unknown author';
  const baseBranch = pr?.base?.ref ?? 'unknown base';
  const headBranch = pr?.head?.ref ?? 'unknown head';

  const message =
    `Nieuwe pull request in **${repo}**\n` +
    `Titel: ${pr?.title ?? 'zonder titel'}\n` +
    `Auteur: ${author}\n` +
    `Branches: ${headBranch} → ${baseBranch}\n` +
    `${pr?.html_url ?? ''}`;

  const client = await getDiscordClient();
  const channel = await client.channels.fetch(CHANNEL_ID);
  await channel.send(message);
  console.log(`PR notified: ${repo} - ${pr?.title}`);
}

function sendJson(res, status, obj) {
  const body = Buffer.from(JSON.stringify(obj));
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': body.length,
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const start = Date.now();
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  console.log(
    `[${new Date().toISOString()}] ${req.method} ${path} from ${
      req.socket.remoteAddress
    }`
  );

  if (req.method === 'GET' && path === '/') {
    return sendJson(res, 200, {
      ok: true,
      service: 'pr-discord-bot',
      time: new Date().toISOString(),
      uptime: process.uptime(),
    });
  }
  if (req.method === 'GET' && path === '/health') {
    return sendJson(res, 200, {
      ok: true,
      status: 'healthy',
      time: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
  }
  if (req.method === 'GET' && path === '/github-webhooks') {
    return sendJson(res, 200, {
      ok: true,
      route: '/github-webhooks',
      time: new Date().toISOString(),
    });
  }

  if (req.method !== 'POST' || path !== '/github-webhooks') {
    return sendJson(res, 404, { error: 'Not Found', path });
  }

  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const rawBody = Buffer.concat(chunks);
    const signature = req.headers['x-hub-signature-256'];
    const event = req.headers['x-github-event'];
    const deliveryId = req.headers['x-github-delivery'];

    if (!verifySignatureRaw(signature, rawBody, GITHUB_WEBHOOK_SECRET)) {
      console.warn(`Signature mismatch. delivery=${deliveryId}`);
      return sendJson(res, 401, { error: 'invalid signature' });
    }

    let payload;
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch (e) {
      console.warn(`Invalid JSON. delivery=${deliveryId}`, e);
      return sendJson(res, 400, { error: 'invalid json' });
    }

    // Quick ACK
    sendJson(res, 202, { received: true, delivery: deliveryId });

    (async () => {
      try {
        console.log(
          `GitHub event=${event} action=${
            payload?.action
          } delivery=${deliveryId} (${Date.now() - start}ms to ACK)`
        );
        if (event === 'pull_request' && payload?.action === 'opened') {
          await notifyPullRequestOpened(payload);
        } else {
          console.log(`Unhandled event/action: ${event}/${payload?.action}`);
        }
      } catch (err) {
        console.error('Async handler error:', err);
      }
    })();
  });

  req.on('error', (err) => {
    console.error('Request stream error:', err);
    if (!res.writableEnded)
      sendJson(res, 400, { error: 'request stream error' });
  });
});

// Keep-alive mechanism for Railway free tier
function keepAlive() {
  if (!RAILWAY_PUBLIC_DOMAIN) {
    console.log('RAILWAY_PUBLIC_DOMAIN not set, skipping keep-alive');
    return;
  }

  const url = `https://${RAILWAY_PUBLIC_DOMAIN}/`;
  console.log(`Keep-alive ping to: ${url}`);

  https
    .get(url, (res) => {
      console.log(`Keep-alive response: ${res.statusCode}`);
    })
    .on('error', (err) => {
      console.log(`Keep-alive error: ${err.message}`);
    });
}

// Ping every 14 minutes (Railway sleeps after 15 minutes of inactivity)
setInterval(keepAlive, 14 * 60 * 1000);

// Belangrijk: bind op 0.0.0.0 zodat Railway/edge kan connecteren
server.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server listening on :${PORT} — POST /github-webhooks`);

  // Initial keep-alive ping after 1 minute
  setTimeout(keepAlive, 60 * 1000);
});
