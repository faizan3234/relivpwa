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
  } catch (err) { }
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

const SERVER_START = Date.now();

app.get('/api/ping', (req, res) => {
  const uptimeSec = Math.round((Date.now() - SERVER_START) / 1000);
  const mins = Math.floor(uptimeSec / 60);
  const secs = uptimeSec % 60;
  res.json({
    status: 'awake',
    uptime: `${mins}m ${secs}s`,
    subscribers: subscriptions.size,
    vibeLoopActive: testInterval !== null,
    waterLoopActive: waterInterval !== null
  });
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

app.get('/api/push/debug', (req, res) => {
  res.json({
    subscriberCount: subscriptions.size,
    hasEnvVapidKeys: Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
    vapidPublicKey: vapidKeys.publicKey
  });
});

app.get('/api/push/test-now', async (req, res) => {
  const results = [];
  for (const subStr of [...subscriptions]) {
    try {
      await webpush.sendNotification(
        JSON.parse(subStr),
        JSON.stringify({ title: '🔔 Test Push', body: 'This push was sent RIGHT NOW. If you see this, it works!', reminderKey: 'test' }),
        { TTL: 86400, urgency: 'high' }
      );
      results.push({ status: 'SUCCESS' });
    } catch (err) {
      results.push({ status: 'FAILED', code: err.statusCode, message: err.body || err.message });
      if (err.statusCode === 404 || err.statusCode === 410) {
        subscriptions.delete(subStr);
      }
    }
  }
  saveSubscriptions();
  res.json({ sent: results.length, results });
});

app.post('/api/push/remind', (req, res) => {
  const { message = "💧 Reminding you: Time to check in!", delayMs = 300000 } = req.body || {};
  setTimeout(() => {
    broadcast({ title: 'Reliv Reminder', body: message });
  }, delayMs);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// KEYED, PERSISTENT REMINDER SCHEDULER
// ---------------------------------------------------------------------------
// Used for the recurring water/skin/diet reminders. Two problems this fixes
// vs. plain setTimeout:
//   1. Duplicate pushes: the app re-syncs every time it's opened/focused. A
//      bare setTimeout per call would stack N pending timers for the same
//      reminder. Keying by `key` means a new call REPLACES the old timer.
//   2. Missed pushes: if the server restarts (Render free tier sleeping)
//      between "schedule" and "due", a plain in-memory timer is lost forever.
//      Persisting to disk lets us recover on boot - firing immediately if the
//      due time already passed, or re-arming with the remaining delay.
// ---------------------------------------------------------------------------
const SCHEDULE_FILE = path.join(__dirname, 'schedules.json');
const scheduledTimers = {}; // key -> Node timeout handle (in-memory, not persisted)

function loadSchedules() {
  try {
    if (fs.existsSync(SCHEDULE_FILE)) return JSON.parse(fs.readFileSync(SCHEDULE_FILE, 'utf8'));
  } catch (err) { }
  return {};
}

function saveSchedules() {
  try {
    fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(schedules, null, 2));
  } catch (err) {
    console.log('[schedule] WARNING: could not persist schedules.json.');
  }
}

const schedules = loadSchedules();

function armSchedule(key, title, body, dueAt) {
  if (scheduledTimers[key]) clearTimeout(scheduledTimers[key]);
  const delay = Math.max(0, dueAt - Date.now());
  scheduledTimers[key] = setTimeout(() => {
    broadcast({ title, body, reminderKey: key });
    delete scheduledTimers[key];
    delete schedules[key];
    saveSchedules();
  }, delay);
}

// Recover anything that was still pending when the server last stopped.
const recoveredKeys = Object.keys(schedules);
recoveredKeys.forEach((key) => {
  const job = schedules[key];
  if (job && job.dueAt) armSchedule(key, job.title, job.body, job.dueAt);
});
if (recoveredKeys.length) console.log(`[schedule] Recovered ${recoveredKeys.length} pending reminder(s) after restart.`);

app.post('/api/push/schedule', (req, res) => {
  const { key, title = 'Reliv Reminder', body, dueAt } = req.body || {};
  if (!key || !body || !dueAt) return res.status(400).json({ ok: false });
  schedules[key] = { title, body, dueAt };
  saveSchedules();
  armSchedule(key, title, body, dueAt);
  res.json({ ok: true });
});

app.post('/api/push/cancel', (req, res) => {
  const { key } = req.body || {};
  if (key) {
    if (scheduledTimers[key]) { clearTimeout(scheduledTimers[key]); delete scheduledTimers[key]; }
    if (schedules[key]) { delete schedules[key]; saveSchedules(); }
  }
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
  const msgs = [
    '🍛 Ate something good today?',
    '💧 Quick water check!',
    '🔔 Just checking in!',
    '💪 How are you feeling?',
    '🥗 Log a quick meal?',
    '☀️ Take a stretch break!'
  ];
  broadcast({ title: 'Coach Relix', body: msgs[Math.floor(Math.random() * msgs.length)], reminderKey: 'test-loop' });
  testInterval = setInterval(() => {
    broadcast({ title: 'Coach Relix', body: msgs[Math.floor(Math.random() * msgs.length)], reminderKey: 'test-loop' });
  }, 5000); // 5 seconds for testing
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
    testLoopActive: Boolean(testInterval),
    scheduledReminders: Object.keys(schedules).length
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Reliv backend running on port ${PORT}`);
});