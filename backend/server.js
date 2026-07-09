import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import webpush from 'web-push';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// VAPID KEYS
// ---------------------------------------------------------------------------
// Priority:
//   1. Real env vars (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY) - survives every
//      restart AND every redeploy. THIS IS THE FIX for "key resets on refresh".
//   2. A local vapid-keys.json file - survives sleep/wake restarts on Render's
//      free tier (same container), but NOT a fresh deploy.
//   3. Freshly generated keys as a last resort (will change on every restart -
//      you'll see a loud warning telling you to fix this).
// ---------------------------------------------------------------------------
const KEYS_FILE = path.join(__dirname, 'vapid-keys.json');

function loadOrCreateVapidKeys() {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    console.log('[vapid] Using VAPID keys from environment variables (persistent). Good.');
    return {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY
    };
  }

  if (fs.existsSync(KEYS_FILE)) {
    try {
      const saved = JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8'));
      if (saved.publicKey && saved.privateKey) {
        console.log('[vapid] Loaded previously generated keys from vapid-keys.json.');
        console.log('[vapid] IMPORTANT: set these as real env vars on your host so they');
        console.log('[vapid] survive a redeploy too, not just a restart:');
        console.log(`VAPID_PUBLIC_KEY=${saved.publicKey}`);
        console.log(`VAPID_PRIVATE_KEY=${saved.privateKey}`);
        return saved;
      }
    } catch (err) {
      console.log('[vapid] vapid-keys.json was unreadable, generating new keys.');
    }
  }

  const fresh = webpush.generateVAPIDKeys();
  try {
    fs.writeFileSync(KEYS_FILE, JSON.stringify(fresh, null, 2));
  } catch (err) {
    console.log('[vapid] WARNING: could not write vapid-keys.json (read-only filesystem?).');
    console.log('[vapid] Your keys WILL change on next restart until you set env vars below.');
  }
  console.log('[vapid] Generated NEW VAPID keys. Set these as env vars on your host');
  console.log('[vapid] (e.g. Render > Environment) to stop them from ever changing again:');
  console.log(`VAPID_PUBLIC_KEY=${fresh.publicKey}`);
  console.log(`VAPID_PRIVATE_KEY=${fresh.privateKey}`);
  return fresh;
}

const vapidKeys = loadOrCreateVapidKeys();
process.env.VAPID_PUBLIC_KEY = vapidKeys.publicKey;
process.env.VAPID_PRIVATE_KEY = vapidKeys.privateKey;

webpush.setVapidDetails('mailto:test@reliv.local', vapidKeys.publicKey, vapidKeys.privateKey);

// ---------------------------------------------------------------------------
// SUBSCRIPTIONS - persisted to disk so a restart doesn't silently drop every
// device (which is why "it only works while the app is open" happened: after
// any restart the in-memory Set was empty, so /water/start and /test/start
// had nobody to actually push to, even though the app looked "subscribed").
// ---------------------------------------------------------------------------
const SUBS_FILE = path.join(__dirname, 'subscriptions.json');

function loadSubscriptions() {
  try {
    if (fs.existsSync(SUBS_FILE)) {
      const arr = JSON.parse(fs.readFileSync(SUBS_FILE, 'utf8'));
      return new Set(arr);
    }
  } catch (err) {}
  return new Set();
}

function saveSubscriptions() {
  try {
    fs.writeFileSync(SUBS_FILE, JSON.stringify([...subscriptions], null, 2));
  } catch (err) {
    console.log('[subs] WARNING: could not persist subscriptions.json.');
  }
}

const subscriptions = loadSubscriptions();
console.log(`[subs] Loaded ${subscriptions.size} saved subscription(s).`);

async function broadcast(payloadObj) {
  const payload = JSON.stringify(payloadObj);
  let removed = 0;
  for (const subStr of [...subscriptions]) {
    try {
      await webpush.sendNotification(JSON.parse(subStr), payload, { TTL: 86400, urgency: 'high' });
    } catch (err) {
      // 404/410 = the subscription is dead (user uninstalled, permission revoked, etc).
      if (err.statusCode === 404 || err.statusCode === 410) {
        subscriptions.delete(subStr);
        removed++;
      }
    }
  }
  if (removed) saveSubscriptions();
}

// Ping route for UptimeRobot / cron-job.org - hit this every 5-10 min to stop
// Render's free tier from spinning the server down (which is the other big
// reason pushes silently stop arriving when the phone/app is closed).
app.get('/api/ping', (req, res) => {
  res.send('pong');
});

app.get('/api/push/vapid-public-key', (req, res) => {
  res.send(vapidKeys.publicKey);
});

app.post('/api/push/subscribe', (req, res) => {
  const { subscription } = req.body;
  if (!subscription) return res.status(400).json({ ok: false });
  subscriptions.add(JSON.stringify(subscription));
  saveSubscriptions();
  res.json({ ok: true });
});

app.post('/api/push/unsubscribe', (req, res) => {
  const { subscription } = req.body;
  if (subscription) {
    subscriptions.delete(JSON.stringify(subscription));
    saveSubscriptions();
  }
  res.json({ ok: true });
});

app.post('/api/push/remind', (req, res) => {
  const { message = "💧 Reminding you: Time to check in!", delayMs = 300000 } = req.body || {};
  setTimeout(() => {
    broadcast({ title: 'Reliv Reminder', body: message });
  }, delayMs);
  res.json({ ok: true });
});

// Dynamic Background Timers
let waterInterval = null;
let testInterval = null;

app.post('/api/push/water/start', (req, res) => {
  if (waterInterval) clearInterval(waterInterval);
  broadcast({ title: 'Reliv Coach', body: '💧 Drink Water! Stay hydrated.' });
  waterInterval = setInterval(() => {
    broadcast({ title: 'Reliv Coach', body: '💧 Drink Water! Stay hydrated.' });
  }, 45 * 60 * 1000); // 45 minutes
  res.json({ ok: true, status: 'started' });
});

app.post('/api/push/water/stop', (req, res) => {
  if (waterInterval) clearInterval(waterInterval);
  waterInterval = null;
  res.json({ ok: true, status: 'stopped' });
});

app.post('/api/push/test/start', (req, res) => {
  if (testInterval) clearInterval(testInterval);
  broadcast({ title: 'Reliv Test', body: '🔔 5-second test notification!' });
  testInterval = setInterval(() => {
    broadcast({ title: 'Reliv Test', body: '🔔 5-second test notification!' });
  }, 5000); // 5 seconds
  res.json({ ok: true, status: 'started' });
});

app.post('/api/push/test/stop', (req, res) => {
  if (testInterval) clearInterval(testInterval);
  testInterval = null;
  res.json({ ok: true, status: 'stopped' });
});

app.get('/api/push/status', (req, res) => {
  res.json({
    subscriptions: subscriptions.size,
    waterLoopActive: Boolean(waterInterval),
    testLoopActive: Boolean(testInterval)
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Reliv backend running on port ${PORT}`);
});
