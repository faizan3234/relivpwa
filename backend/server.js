import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import webpush from 'web-push';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import https from 'https';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// ---------------------------------------------------------------------------
// ENV VALIDATION
// ---------------------------------------------------------------------------
// Fail loudly at boot so a misconfigured deploy is caught immediately instead
// of silently returning 500s on every AI/payment request.
// ---------------------------------------------------------------------------
const REQUIRED_WARNINGS = [];
const ENV_CHECKS = [
  { key: 'GROQ_API_KEY',          label: 'AI chat (Groq)',        required: false },
  { key: 'GEMINI_API_KEY',        label: 'AI vision (Gemini)',    required: false },
  { key: 'RAZORPAY_KEY_ID',       label: 'Streak restore pay',    required: false },
  { key: 'RAZORPAY_KEY_SECRET',   label: 'Streak restore verify', required: false },
];
for (const { key, label, required } of ENV_CHECKS) {
  if (!process.env[key]) {
    const msg = `[env] ${required ? 'FATAL' : 'WARNING'}: ${key} is not set — ${label} will not work.`;
    console.log(msg);
    REQUIRED_WARNINGS.push(msg);
    if (required) { console.error(msg); process.exit(1); }
  }
}
if (REQUIRED_WARNINGS.length === 0) console.log('[env] All optional keys present. Good.');

// ---------------------------------------------------------------------------
// GLOBAL ERROR HANDLERS
// ---------------------------------------------------------------------------
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err.message, err.stack);
  // Don't exit — keep serving. Log for monitoring.
});
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled rejection:', reason);
});

const ALLOWED_ORIGINS = [
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https?:\/\/161\.118\.169\.29(:\d+)?$/,
  /\.netlify\.app$/,
];

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, server-to-server, mobile apps)
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.some(re => re.test(origin))) return cb(null, true);
    cb(null, true); // Permissive for now; tighten after deploy
  },
  credentials: true
}));
app.use(express.json({ limit: '12mb' })); // meal photos arrive as base64

// ---------------------------------------------------------------------------
// CRASH-SAFE JSON WRITES
// ---------------------------------------------------------------------------
// A plain writeFileSync truncates the target before it writes. If the process
// dies in that window - OOM, redeploy, power cut - the file is left empty or
// half-written and EVERY push subscription (or payment record) is gone.
// Writing to a temp file and renaming makes the swap atomic: readers see either
// the old file or the new one, never a truncated one.
function writeJsonAtomic(filePath, value, label) {
  const tmp = `${filePath}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
    fs.renameSync(tmp, filePath);
    return true;
  } catch (err) {
    console.log(`[${label}] WARNING: could not persist ${path.basename(filePath)}: ${err.message}`);
    try { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch (cleanupErr) { }
    return false;
  }
}

// A JSON file that was corrupted by an old non-atomic write should not take the
// whole server down on boot - fall back to the default and keep the bad file
// around for inspection.
function readJsonSafe(filePath, fallback, label) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.log(`[${label}] WARNING: ${path.basename(filePath)} was unreadable (${err.message}).`);
    try {
      fs.renameSync(filePath, `${filePath}.corrupt.${Date.now()}`);
      console.log(`[${label}] Moved the bad file aside; starting from empty.`);
    } catch (renameErr) { }
    return fallback;
  }
}

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
      publicKey: process.env.VAPID_PUBLIC_KEY.trim(),
      privateKey: process.env.VAPID_PRIVATE_KEY.trim()
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
    writeJsonAtomic(KEYS_FILE, fresh, 'vapid');
  } catch (err) {
    console.log('[vapid] WARNING: could not write vapid-keys.json (read-only filesystem?).');
    console.log('[vapid] Your keys WILL change on next restart until you set env vars below.');
  }
  console.log('[vapid] Generated NEW VAPID keys. Set these as env vars on your host');
  console.log('[vapid] (e.g. Oracle Cloud / Host .env) to stop them from ever changing again:');
  console.log(`VAPID_PUBLIC_KEY=${fresh.publicKey}`);
  console.log(`VAPID_PRIVATE_KEY=${fresh.privateKey}`);
  return fresh;
}

const vapidKeys = loadOrCreateVapidKeys();
process.env.VAPID_PUBLIC_KEY = vapidKeys.publicKey;
process.env.VAPID_PRIVATE_KEY = vapidKeys.privateKey;

webpush.setVapidDetails('mailto:admin@reliv.app', vapidKeys.publicKey, vapidKeys.privateKey);

// ---------------------------------------------------------------------------
// SUBSCRIPTIONS - persisted to disk so a restart doesn't silently drop every
// device (which is why "it only works while the app is open" happened: after
// any restart the in-memory Set was empty, so /water/start and /test/start
// had nobody to actually push to, even though the app looked "subscribed").
// ---------------------------------------------------------------------------
const SUBS_FILE = path.join(__dirname, 'subscriptions.json');
const LEGACY_BUCKET = '_legacy';

// userId -> Set(subscription JSON string).
//
// This used to be one flat Set with no user identity, which meant every
// reminder went to EVERY device on the server. With more than one user that is
// not "a reminder", it's a broadcast: person A's 8am protein nudge lands on
// person B's phone. Keying by user is what makes per-user scheduling possible.
//
// One user intentionally maps to a SET of subscriptions, not a single one, so
// the same account can be installed on a phone, a tablet and a desktop and get
// the reminder on all of them.
function loadSubscriptions() {
  const raw = readJsonSafe(SUBS_FILE, null, 'subs');
  if (!raw) return new Map();
  // Legacy on-disk format was a flat array with no userId. Park those in a
  // shared bucket so already-installed devices keep receiving until they
  // next open the app and re-subscribe with a real userId.
  if (Array.isArray(raw)) {
    return raw.length ? new Map([[LEGACY_BUCKET, new Set(raw)]]) : new Map();
  }
  return new Map(Object.entries(raw).map(([uid, arr]) => [uid, new Set(arr)]));
}

function saveSubscriptions() {
  const plain = {};
  for (const [uid, set] of subscriptions) plain[uid] = [...set];
  writeJsonAtomic(SUBS_FILE, plain, 'subs');
}

const subscriptions = loadSubscriptions();

function deviceCount() {
  let n = 0;
  for (const set of subscriptions.values()) n += set.size;
  return n;
}

console.log(`[subs] Loaded ${deviceCount()} device(s) across ${subscriptions.size} user(s).`);

// Push to every device belonging to ONE user. Dead subscriptions (uninstalled
// app, revoked permission) are pruned as we discover them.
async function sendToUser(userId, payloadObj) {
  const devices = subscriptions.get(userId);
  if (!devices || devices.size === 0) return 0;

  const payload = JSON.stringify(payloadObj);
  let sent = 0;
  let removed = 0;

  for (const subStr of [...devices]) {
    try {
      await webpush.sendNotification(JSON.parse(subStr), payload, { TTL: 86400, urgency: 'high' });
      sent++;
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        devices.delete(subStr);
        removed++;
      }
    }
  }

  if (devices.size === 0) subscriptions.delete(userId);
  if (removed) saveSubscriptions();
  return sent;
}

// Genuine every-user announcement. Kept for admin/test endpoints only - normal
// reminders must go through sendToUser.
async function broadcast(payloadObj) {
  let sent = 0;
  for (const userId of [...subscriptions.keys()]) {
    sent += await sendToUser(userId, payloadObj);
  }
  return sent;
}

const SERVER_START = Date.now();
const SERVER_VERSION = '2.0.0';

// Health check for monitoring. Uptime alerts hit this endpoint.
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    uptime: Math.round((Date.now() - SERVER_START) / 1000),
    version: SERVER_VERSION,
    env: {
      hasGemini: Boolean(process.env.GEMINI_API_KEY),
      hasGroq: Boolean(process.env.GROQ_API_KEY),
      hasRazorpay: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
      hasVapid: Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
    }
  });
});

app.get('/api/ping', (req, res) => {
  const uptimeSec = Math.round((Date.now() - SERVER_START) / 1000);
  const mins = Math.floor(uptimeSec / 60);
  const secs = uptimeSec % 60;
  res.json({
    status: 'awake',
    uptime: `${mins}m ${secs}s`,
    version: SERVER_VERSION,
    users: subscriptions.size,
    devices: deviceCount(),
    waterLoopsActive: waterIntervals.size
  });
});

app.get('/api/push/vapid-public-key', (req, res) => {
  res.send(vapidKeys.publicKey);
});

app.post('/api/push/subscribe', (req, res) => {
  const { subscription, userId } = req.body;
  if (!subscription || !userId) return res.status(400).json({ ok: false, error: 'subscription and userId are required' });

  const subStr = JSON.stringify(subscription);

  // This device may have been sitting in the legacy no-identity bucket, or
  // registered under a previous userId. Drop those copies so the user does not
  // receive the same reminder two or three times on one phone.
  for (const [uid, set] of subscriptions) {
    if (uid !== userId && set.delete(subStr) && set.size === 0) subscriptions.delete(uid);
  }

  if (!subscriptions.has(userId)) subscriptions.set(userId, new Set());
  subscriptions.get(userId).add(subStr);
  saveSubscriptions();
  res.json({ ok: true, devices: subscriptions.get(userId).size });
});

app.post('/api/push/unsubscribe', (req, res) => {
  const { subscription, userId } = req.body;
  if (subscription) {
    const subStr = JSON.stringify(subscription);
    if (userId && subscriptions.has(userId)) {
      const set = subscriptions.get(userId);
      set.delete(subStr);
      if (set.size === 0) subscriptions.delete(userId);
    } else {
      for (const [uid, set] of subscriptions) {
        if (set.delete(subStr) && set.size === 0) subscriptions.delete(uid);
      }
    }
    saveSubscriptions();
  }
  res.json({ ok: true });
});

app.get('/api/push/debug', (req, res) => {
  const { userId } = req.query;
  res.json({
    userCount: subscriptions.size,
    deviceCount: deviceCount(),
    yourDevices: userId ? (subscriptions.get(userId)?.size || 0) : null,
    yourScheduled: userId ? Object.keys(schedules).filter((k) => k.startsWith(`${userId}::`)).length : null,
    hasEnvVapidKeys: Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
    vapidPublicKey: vapidKeys.publicKey
  });
});

// Test push. With a userId it hits only that user's devices, which is what you
// want when debugging one phone on a server that has other people on it.
app.get('/api/push/test-now', async (req, res) => {
  const { userId } = req.query;
  const payload = { title: '🔔 Test Push', body: 'This push was sent RIGHT NOW. If you see this, it works!', reminderKey: 'test' };
  const sent = userId ? await sendToUser(userId, payload) : await broadcast(payload);
  res.json({ sent, scope: userId ? 'user' : 'all' });
});

app.post('/api/push/remind', (req, res) => {
  const { message = "💧 Reminding you: Time to check in!", delayMs = 300000, userId } = req.body || {};
  if (!userId) return res.status(400).json({ ok: false, error: 'userId is required' });
  setTimeout(() => {
    sendToUser(userId, { title: 'Reliv Reminder', body: message });
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
  return readJsonSafe(SCHEDULE_FILE, {}, 'schedule');
}

function saveSchedules() {
  writeJsonAtomic(SCHEDULE_FILE, schedules, 'schedule');
}

const schedules = loadSchedules();

let selfPingInterval = null;
let serverPublicUrl = null;

function pingUrl(urlStr) {
  try {
    const url = new URL(urlStr);
    const client = url.protocol === 'https:' ? https : http;
    client.get(urlStr, (res) => {
      console.log(`[ping] Self-ping response: ${res.statusCode}`);
    }).on('error', (err) => {
      console.error('[ping] Self-ping request error:', err.message);
    });
  } catch (err) {
    console.error('[ping] Invalid self-ping URL:', err.message);
  }
}

function startSelfPing(url) {
  serverPublicUrl = url;
  schedules['_serverPublicUrl'] = url;
  saveSchedules();
  
  if (selfPingInterval) return;

  console.log(`[ping] Starting self-ping keep-alive loop: ${url}`);
  pingUrl(url);

  selfPingInterval = setInterval(() => {
    const activeJobs = Object.keys(schedules).filter(k => k !== '_serverPublicUrl');
    if (activeJobs.length === 0) {
      console.log('[ping] No scheduled reminders. Stopping self-ping loop.');
      clearInterval(selfPingInterval);
      selfPingInterval = null;
      return;
    }
    if (serverPublicUrl) {
      pingUrl(serverPublicUrl);
    }
  }, 10 * 60 * 1000); // every 10 minutes
}

// setTimeout stores its delay in a signed 32-bit int. Anything longer than
// ~24.8 days silently wraps and fires IMMEDIATELY, so long-dated reminders get
// re-armed in chunks instead.
const MAX_TIMEOUT = 2147483647;

function armSchedule(scheduleId, job) {
  if (scheduledTimers[scheduleId]) clearTimeout(scheduledTimers[scheduleId]);
  const delay = Math.max(0, job.dueAt - Date.now());

  if (delay > MAX_TIMEOUT) {
    scheduledTimers[scheduleId] = setTimeout(() => armSchedule(scheduleId, job), MAX_TIMEOUT);
    return;
  }

  scheduledTimers[scheduleId] = setTimeout(() => {
    sendToUser(job.userId, { title: job.title, body: job.body, reminderKey: job.key });
    delete scheduledTimers[scheduleId];
    delete schedules[scheduleId];
    saveSchedules();
  }, delay);
}

// Recover anything that was still pending when the server last stopped.
let recovered = 0;
let droppedLegacy = 0;
Object.keys(schedules).forEach((scheduleId) => {
  if (scheduleId === '_serverPublicUrl') return;
  const job = schedules[scheduleId];
  if (!job || !job.dueAt) return;
  // Pre-userId jobs have no owner, and firing them would broadcast to everyone.
  if (!job.userId) { delete schedules[scheduleId]; droppedLegacy++; return; }
  armSchedule(scheduleId, job);
  recovered++;
});
if (droppedLegacy) { saveSchedules(); console.log(`[schedule] Dropped ${droppedLegacy} ownerless legacy reminder(s).`); }
if (recovered) console.log(`[schedule] Recovered ${recovered} pending reminder(s) after restart.`);

const savedUrl = schedules['_serverPublicUrl'];
if (savedUrl && Object.keys(schedules).filter(k => k !== '_serverPublicUrl').length > 0) {
  startSelfPing(savedUrl);
}

app.post('/api/push/schedule', (req, res) => {
  const { key, title = 'Reliv Reminder', body, dueAt, userId } = req.body || {};
  if (!key || !body || !dueAt || !userId) {
    return res.status(400).json({ ok: false, error: 'userId, key, body and dueAt are required' });
  }

  // Namespacing by user is what stops one person's "daily-reset-warning" from
  // overwriting everyone else's - they all used to collide on the same key.
  const scheduleId = `${userId}::${key}`;
  schedules[scheduleId] = { userId, key, title, body, dueAt };
  saveSchedules();
  armSchedule(scheduleId, schedules[scheduleId]);

  // Self-ping to keep server container awake during pending reminders
  const selfUrl = `${req.protocol}://${req.get('host')}`;
  startSelfPing(selfUrl);

  res.json({ ok: true });
});

app.post('/api/push/cancel', (req, res) => {
  const { key, userId } = req.body || {};
  if (key && userId) {
    const scheduleId = `${userId}::${key}`;
    if (scheduledTimers[scheduleId]) { clearTimeout(scheduledTimers[scheduleId]); delete scheduledTimers[scheduleId]; }
    if (schedules[scheduleId]) { delete schedules[scheduleId]; saveSchedules(); }
  }
  res.json({ ok: true });
});

// Recurring water nudge, one independent loop per user.
const waterIntervals = new Map(); // userId -> interval handle

app.post('/api/push/water/start', (req, res) => {
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ ok: false, error: 'userId is required' });

  if (waterIntervals.has(userId)) clearInterval(waterIntervals.get(userId));
  const nudge = () => sendToUser(userId, { title: 'Reliv Coach', body: '💧 Drink Water! Stay hydrated.', reminderKey: 'water' });
  nudge();
  waterIntervals.set(userId, setInterval(nudge, 45 * 60 * 1000));
  res.json({ ok: true, status: 'started' });
});

app.post('/api/push/water/stop', (req, res) => {
  const { userId } = req.body || {};
  if (userId && waterIntervals.has(userId)) {
    clearInterval(waterIntervals.get(userId));
    waterIntervals.delete(userId);
  }
  res.json({ ok: true, status: 'stopped' });
});

app.get('/api/push/status', (req, res) => {
  const { userId } = req.query;
  res.json({
    users: subscriptions.size,
    devices: deviceCount(),
    yourWaterLoopActive: userId ? waterIntervals.has(userId) : null,
    yourScheduledReminders: userId ? Object.keys(schedules).filter((k) => k.startsWith(`${userId}::`)).length : null
  });
});

// ---------------------------------------------------------------------------
// AI PROXY ENDPOINTS (Secure from Client Inspection)
// ---------------------------------------------------------------------------
// Keys come from the environment ONLY. They used to have hardcoded fallbacks
// committed into this file, which published them to anyone who read the repo.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

// Model IDs live here so a provider deprecation is a one-line change.
// ---------------------------------------------------------------------------
// RATE LIMITING
// ---------------------------------------------------------------------------
// The AI routes proxy paid third-party APIs with no authentication in front of
// them. Unmetered, one script pointed at this host spends the entire Gemini and
// Groq budget. This is a per-IP token bucket - crude, in-memory, and vastly
// better than nothing. Anything serious needs real accounts and a shared store.
const RATE_LIMITS = {
  chat: { windowMs: 60_000, max: Number(process.env.RATE_LIMIT_CHAT || 20) },
  vision: { windowMs: 60_000, max: Number(process.env.RATE_LIMIT_VISION || 6) }
};

const rateBuckets = new Map(); // `${bucket}:${ip}` -> { count, resetAt }

// Without this the map grows forever - a slow memory leak on a long-lived box.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateBuckets) {
    if (entry.resetAt <= now) rateBuckets.delete(key);
  }
}, 5 * 60_000).unref();

function rateLimit(bucket) {
  const { windowMs, max } = RATE_LIMITS[bucket];
  return (req, res, next) => {
    // Behind a reverse proxy, req.ip is the proxy. Trust the first hop of
    // X-Forwarded-For when one is present.
    const fwd = req.headers['x-forwarded-for'];
    const ip = (typeof fwd === 'string' && fwd.split(',')[0].trim()) || req.ip || 'unknown';
    const key = `${bucket}:${ip}`;
    const now = Date.now();

    let entry = rateBuckets.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      rateBuckets.set(key, entry);
    }

    entry.count++;
    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ error: `Too many requests. Try again in ${retryAfter}s.` });
    }
    next();
  };
}

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const GROQ_TEXT_MODEL = process.env.GROQ_TEXT_MODEL || 'llama-3.3-70b-versatile';
const GROQ_VISION_MODEL = process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';

function geminiUrl() {
  return `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
}

app.post('/api/ai/chat', rateLimit('chat'), async (req, res) => {
  const { systemInstruction, messages = [], message, customGroqKey } = req.body || {};
  if (!message) return res.status(400).json({ error: 'Message is required' });

  try {
    if (customGroqKey) {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${customGroqKey}`
        },
        body: JSON.stringify({
          model: GROQ_TEXT_MODEL,
          messages: [
            { role: 'system', content: systemInstruction },
            ...messages,
            { role: 'user', content: message }
          ],
          response_format: { type: "json_object" }
        })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      return res.json({ text: data.choices[0].message.content });
    } else {
      const url = geminiUrl();
      const payload = {
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        contents: [
          ...messages.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content || m.parts?.[0]?.text || '' }]
          })),
          { role: 'user', parts: [{ text: message }] }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return res.json({ text });
    }
  } catch (err) {
    console.error('[AI Chat Error]:', err.message);
    res.status(500).json({ error: err.message });
  }
});

async function analyzeImageHandler(req, res) {
  const { prompt, mimeType, base64Data, customGroqKey, customGeminiKey } = req.body || {};
  if (!prompt || !base64Data) {
    return res.status(400).json({ error: 'Missing prompt or base64Data' });
  }

  const effectiveGeminiKey = customGeminiKey || GEMINI_API_KEY;
  const effectiveGroqKey = customGroqKey || GROQ_API_KEY;

  // Try Gemini first if key is present
  if (effectiveGeminiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${effectiveGeminiKey}`;
      const payload = {
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: mimeType || 'image/jpeg',
                  data: base64Data
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!data.error && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return res.json({ text: data.candidates[0].content.parts[0].text, provider: 'gemini' });
      }
      console.warn('[AI Vision] Gemini returned error or empty response, attempting Groq fallback...', data.error?.message || data);
    } catch (geminiErr) {
      console.warn('[AI Vision] Gemini exception, attempting Groq fallback...', geminiErr.message);
    }
  }

  // Fallback to Groq vision
  if (effectiveGroqKey) {
    try {
      const visionModels = [GROQ_VISION_MODEL, 'llama-3.2-11b-vision-preview', 'llama-3.2-90b-vision-preview'];
      let lastErr = null;
      for (const model of visionModels) {
        try {
          const payload = {
            model,
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: `${prompt}\nRespond ONLY in valid raw JSON with format: {"type":"food","foodName":"...","calories":0,"protein":0,"carbs":0,"fat":0,"healthScore":8,"analysis":"..."}` },
                  { type: "image_url", image_url: { url: `data:${mimeType || 'image/jpeg'};base64,${base64Data}` } }
                ]
              }
            ],
            temperature: 0.2
          };

          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${effectiveGroqKey}`
            },
            body: JSON.stringify(payload)
          });
          const data = await response.json();
          if (data.choices?.[0]?.message?.content) {
            return res.json({ text: data.choices[0].message.content, provider: 'groq', model });
          }
          lastErr = data.error?.message || 'Empty response from Groq vision';
        } catch (err) {
          lastErr = err.message;
        }
      }
      console.warn('[AI Vision] Groq vision models exhausted:', lastErr);
    } catch (groqErr) {
      console.error('[AI Vision] Groq error:', groqErr.message);
    }
  }

  // If neither succeeded
  if (!effectiveGeminiKey && !effectiveGroqKey) {
    return res.status(400).json({
      error: 'Image analysis requires a Gemini API key or Groq API key configured on the server or in app settings.'
    });
  }

  return res.status(502).json({
    error: 'Vision analysis service temporarily unavailable. Please try again or enter meal text manually.'
  });
}

app.post('/api/ai/analyze-image', rateLimit('vision'), analyzeImageHandler);
app.post('/api/analyze-image', rateLimit('vision'), analyzeImageHandler);


app.post('/api/ai/analyze-image-groq', rateLimit('vision'), async (req, res) => {
  const { prompt, mimeType, base64Data } = req.body || {};
  if (!prompt || !base64Data) {
    return res.status(400).json({ error: 'Missing prompt or base64Data' });
  }

  const groqKey = GROQ_API_KEY;
  if (!groqKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY is not set on the server' });
  }

  try {
    const payload = {
      model: GROQ_VISION_MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:${mimeType || 'image/jpeg'};base64,${base64Data}` } }
          ]
        }
      ],
      response_format: { type: "json_object" }
    };

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    if (data.error) throw new Error(data.error.message || 'Groq API error');
    
    const text = data.choices?.[0]?.message?.content || '';
    return res.json({ text });
  } catch (err) {
    console.error('[Groq Analyze Image Error]:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// STREAK RESTORE PAYMENTS (Razorpay)
// ---------------------------------------------------------------------------
// Model: the user LOSES a streak, then chooses to pay to restore it - the same
// shape as a Snapchat streak restore. It is always a deliberate, user-initiated
// checkout with the price shown up front. There is no stored card and nothing
// is ever auto-debited, which is both what Razorpay's plain Orders API supports
// and what keeps this on the right side of RBI's recurring-payment rules.
//
// The PRICE IS DECIDED HERE, never by the browser - otherwise anyone could
// restore a 60-day streak for 1 paisa by editing the request.
// ---------------------------------------------------------------------------
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
const RESTORE_MIN_RUPEES = Number(process.env.RESTORE_MIN_RUPEES || 5);
const RESTORE_MAX_RUPEES = Number(process.env.RESTORE_MAX_RUPEES || 25);

// A 5-day streak costs Rs.5 to restore, a 12-day streak Rs.12, and so on -
// the longer the run you are buying back, the more it costs, capped so it never
// becomes a genuinely painful amount.
function restorePriceRupees(lostStreak) {
  const days = Number(lostStreak) || 0;
  if (days <= 5) return 5;
  if (days <= 12) return 10;
  if (days <= 20) return 15;
  if (days <= 30) return 20;
  return 25;
}

const RESTORES_FILE = path.join(__dirname, 'restores.json');

function loadRestores() {
  const raw = readJsonSafe(RESTORES_FILE, null, 'restore');
  if (!raw || typeof raw !== 'object') return { orders: {}, paid: [] };
  return { orders: raw.orders || {}, paid: raw.paid || [] };
}

const restores = loadRestores();

// This is a money ledger. If the write fails, say so loudly rather than letting
// a paid restore disappear silently.
function saveRestores() {
  const ok = writeJsonAtomic(RESTORES_FILE, restores, 'restore');
  if (!ok) console.error('[restore] CRITICAL: payment ledger was not persisted.');
  return ok;
}

app.get('/api/streak/restore/price', (req, res) => {
  const rupees = restorePriceRupees(req.query.lostStreak);
  res.json({
    rupees,
    configured: Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET)
  });
});

app.post('/api/streak/restore/order', async (req, res) => {
  const { userId, lostStreak } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    return res.status(503).json({ error: 'Payments are not configured on the server.' });
  }

  const rupees = restorePriceRupees(lostStreak);

  try {
    const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: rupees * 100, // paise
        currency: 'INR',
        receipt: `streak_${Date.now()}`,
        notes: { userId, lostStreak: String(lostStreak ?? '') }
      })
    });

    const order = await response.json();
    if (!response.ok || order.error) {
      throw new Error(order.error?.description || 'Razorpay order creation failed');
    }

    // Remember what we quoted so verify cannot be tricked into restoring a
    // different streak than the one that was actually paid for.
    restores.orders[order.id] = { userId, lostStreak, rupees, createdAt: Date.now() };
    saveRestores();

    res.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: RAZORPAY_KEY_ID, rupees });
  } catch (err) {
    console.error('[restore] order error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/streak/restore/verify', (req, res) => {
  const { orderId, paymentId, signature } = req.body || {};
  if (!orderId || !paymentId || !signature) {
    return res.status(400).json({ ok: false, error: 'orderId, paymentId and signature are required' });
  }

  const record = restores.orders[orderId];
  if (!record) return res.status(404).json({ ok: false, error: 'Unknown order' });
  if (record.paidAt) return res.json({ ok: true, alreadyPaid: true, restoreStreak: record.lostStreak });

  // Razorpay signs `${orderId}|${paymentId}` with the key secret. Verifying it
  // here is the only thing that proves the payment is real - a client saying
  // "trust me, I paid" is not evidence.
  const expected = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  const valid = a.length === b.length && crypto.timingSafeEqual(a, b);

  if (!valid) return res.status(400).json({ ok: false, error: 'Signature verification failed' });

  record.paidAt = Date.now();
  record.paymentId = paymentId;
  restores.paid.push({ userId: record.userId, orderId, paymentId, rupees: record.rupees, at: record.paidAt });
  saveRestores();

  res.json({ ok: true, restoreStreak: record.lostStreak, rupees: record.rupees });
});

// Hands back any restore this user has PAID for but not yet had applied, and
// marks it consumed. Two jobs:
//   1. Recovery - if the app was killed between payment and the streak being
//      written, the next launch picks it up. Nobody pays and gets nothing.
//   2. Consumption - a claimed restore cannot be replayed for a second free
//      streak later.
app.post('/api/streak/restore/claim', (req, res) => {
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ ok: false, error: 'userId is required' });

  const pending = Object.entries(restores.orders)
    .filter(([, r]) => r.userId === userId && r.paidAt && !r.claimedAt)
    .sort((a, b) => b[1].paidAt - a[1].paidAt);

  if (pending.length === 0) return res.json({ ok: false, restoreStreak: 0 });

  // Consume every outstanding one, but only restore the longest streak paid for.
  let best = 0;
  for (const [, record] of pending) {
    record.claimedAt = Date.now();
    best = Math.max(best, Number(record.lostStreak) || 0);
  }
  saveRestores();

  res.json({ ok: true, restoreStreak: best });
});

// ==========================================================================
// SERVER-AUTHORITATIVE GOAL & MEASUREMENT PERSISTENCE
// ==========================================================================
const MEASUREMENTS_FILE = path.join(__dirname, 'measurements.json');
const USER_PROFILES_FILE = path.join(__dirname, 'user_profiles.json');
const KIOSK_SECRET = process.env.RELIV_KIOSK_SECRET || 'reliv_kiosk_secure_2026';

function loadMeasurementsStore() {
  const raw = readJsonSafe(MEASUREMENTS_FILE, null, 'measurements');
  return (raw && typeof raw === 'object') ? raw : {};
}

function saveMeasurementsStore(data) {
  return writeJsonAtomic(MEASUREMENTS_FILE, data, 'measurements');
}

function loadProfilesStore() {
  const raw = readJsonSafe(USER_PROFILES_FILE, null, 'user_profiles');
  return (raw && typeof raw === 'object') ? raw : {};
}

function saveProfilesStore(data) {
  return writeJsonAtomic(USER_PROFILES_FILE, data, 'user_profiles');
}

const measurementsStore = loadMeasurementsStore();
const userProfilesStore = loadProfilesStore();

// Sync user target, goal & dietary profile to server
app.post('/api/user/profile', (req, res) => {
  const { userId, targetWeight, goalType, startWeight, dietType } = req.body || {};
  if (!userId) return res.status(400).json({ ok: false, error: 'userId is required' });

  userProfilesStore[userId] = {
    userId,
    targetWeight: Number(targetWeight) || null,
    goalType: goalType || 'weight_maintenance',
    startWeight: Number(startWeight) || null,
    dietType: dietType || 'pure_veg',
    updatedAt: Date.now()
  };
  saveProfilesStore(userProfilesStore);
  res.json({ ok: true, profile: userProfilesStore[userId] });
});

// Single unified measurement creation endpoint
app.post('/api/measurements', (req, res) => {
  const { userId, weight, waist, kioskToken } = req.body || {};
  const numWeight = Number(weight);

  if (!userId || isNaN(numWeight) || numWeight <= 0) {
    return res.status(400).json({ ok: false, error: 'Valid userId and weight (kg) required' });
  }

  if (!measurementsStore[userId]) measurementsStore[userId] = [];
  const userLogs = measurementsStore[userId];

  // 1. Kiosk attestation verification: genuine server-verified secret token
  const isKioskVerified = Boolean(kioskToken && kioskToken === KIOSK_SECRET);
  const source = isKioskVerified ? 'kiosk' : 'manual';

  // 2. Trend delta calculation
  const cleanLogs = userLogs.filter(l => l && !isNaN(Number(l.weight)));
  let delta = 0;
  let isLargeChange = false;
  let needsConfirmation = false;
  let verificationState = isKioskVerified ? 'verified' : 'verified';

  if (cleanLogs.length > 0 && !isKioskVerified) {
    const recent5 = cleanLogs.slice(-5).map(l => Number(l.weight)).sort((a, b) => a - b);
    const median = recent5[Math.floor(recent5.length / 2)];
    const prevWeight = Number(cleanLogs[cleanLogs.length - 1].weight);
    const deltaMedian = Math.abs(numWeight - median);
    const deltaPrev = Math.abs(numWeight - prevWeight);
    delta = Number(Math.max(deltaMedian, deltaPrev).toFixed(1));

    if (delta > 5.0) {
      isLargeChange = true;
      needsConfirmation = true;
      verificationState = 'needs_confirmation';
    } else if (delta > 2.0) {
      isLargeChange = false;
      needsConfirmation = true;
      verificationState = 'needs_confirmation';
    }

    // 3. Anomaly Resolution: If previous was needs_confirmation and this new entry on a different day is consistent
    const lastLog = cleanLogs[cleanLogs.length - 1];
    if (lastLog.verificationState === 'needs_confirmation' && !needsConfirmation) {
      const lastDay = new Date(lastLog.timestamp).toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];
      if (lastDay !== today) {
        lastLog.verificationState = 'trend_confirmed';
      }
    }
  }

  const newRecord = {
    id: `m_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    weight: numWeight,
    waist: Number(waist) || null,
    source,
    verificationState,
    timestamp: Date.now(),
    dateStr: new Date().toISOString().split('T')[0]
  };

  userLogs.push(newRecord);
  saveMeasurementsStore(measurementsStore);

  res.json({
    ok: true,
    measurement: newRecord,
    verification: {
      needsConfirmation,
      isLargeChange,
      delta,
      verificationState
    }
  });
});

// Fetch server-persisted measurement history
app.get('/api/measurements', (req, res) => {
  const { userId } = req.query || {};
  if (!userId) return res.status(400).json({ ok: false, error: 'userId is required' });
  res.json({ ok: true, measurements: measurementsStore[userId] || [] });
});

// Server-authoritative integrity evaluation helper
function evaluateGoalIntegrityServer(userId) {
  const profile = userProfilesStore[userId];
  const targetWeight = Number(profile?.targetWeight);
  const goalType = profile?.goalType;

  if (!profile || !targetWeight || isNaN(targetWeight)) {
    return { eligible: false, status: 'not_eligible', reason: 'Target goal not configured on server.' };
  }

  const rawLogs = (measurementsStore[userId] || []).filter(l => l && !isNaN(Number(l.weight)));
  if (rawLogs.length === 0) {
    return { eligible: false, status: 'not_eligible', reason: 'No measurement check-ins recorded on server.' };
  }

  // 1. Group measurements by distinct calendar days (YYYY-MM-DD)
  const now = Date.now();
  const cutoff = now - (14 * 24 * 60 * 60 * 1000); // 14-day evaluation window
  const distinctDaysMap = new Map();

  for (const m of rawLogs) {
    const ts = Number(m.timestamp || (m.date ? new Date(m.date).getTime() : 0));
    if (ts < cutoff) continue;
    const dayStr = m.dateStr || new Date(ts).toISOString().split('T')[0];
    if (!distinctDaysMap.has(dayStr) || m.source === 'kiosk') {
      distinctDaysMap.set(dayStr, m);
    }
  }

  const distinctDays = Array.from(distinctDaysMap.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  // Require at least 3 distinct calendar days
  if (distinctDays.length < 3) {
    return {
      eligible: false,
      status: 'needs_confirmation',
      reason: `Requires check-ins across at least 3 distinct calendar days within the last 14 days (found ${distinctDays.length}).`
    };
  }

  // 2. Check for unresolved anomalous measurements
  const hasUnconfirmed = distinctDays.some(m => m.verificationState === 'needs_confirmation');
  if (hasUnconfirmed) {
    return {
      eligible: false,
      status: 'needs_confirmation',
      reason: 'Recent measurements are marked "Needs confirmation". Log a few more check-ins to verify trend.'
    };
  }

  // 3. Direction & Target Tolerance Check: majority must be within target tolerance
  const startWeight = Number(profile.startWeight || rawLogs[0].weight);
  const isLoss = goalType === 'fat_loss' || targetWeight < startWeight;
  let qualifiedCount = 0;

  for (const m of distinctDays) {
    const w = Number(m.weight);
    if (isLoss && w <= targetWeight + 0.5) qualifiedCount++;
    else if (!isLoss && w >= targetWeight - 0.5) qualifiedCount++;
  }

  if (qualifiedCount >= Math.ceil(distinctDays.length / 2)) {
    return {
      eligible: true,
      status: 'eligible',
      reason: `Goal achievement verified across ${distinctDays.length} distinct check-in days.`
    };
  }

  return {
    eligible: false,
    status: 'not_eligible',
    reason: `Measurements do not yet reflect persistent target of ${targetWeight} kg across distinct check-ins.`
  };
}

// Server-authoritative refund status verification
app.post('/api/goal/verify-refund', (req, res) => {
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ ok: false, error: 'userId is required' });

  const refundable = restores.paid.filter(p => p.userId === userId && !p.refundedAt);
  const totalBalance = refundable.reduce((sum, p) => sum + (p.rupees || 0), 0);

  if (totalBalance <= 0) {
    return res.json({
      ok: true,
      eligible: false,
      status: 'not_eligible',
      commitmentBalance: 0,
      reason: 'No unrefunded commitment deposits found in your account.'
    });
  }

  const integrity = evaluateGoalIntegrityServer(userId);
  res.json({
    ok: true,
    eligible: integrity.eligible,
    status: integrity.status,
    commitmentBalance: totalBalance,
    reason: integrity.reason,
    depositCount: refundable.length
  });
});

// Target completion refund endpoint: 100% SERVER-AUTHORITATIVE
app.post('/api/streak/restore/refund', async (req, res) => {
  const { userId, paymentId } = req.body || {};
  if (!userId) return res.status(400).json({ ok: false, error: 'userId is required' });

  // MANDATORY: Server verification must execute against server-persisted records
  const integrity = evaluateGoalIntegrityServer(userId);
  if (!integrity.eligible) {
    return res.status(400).json({
      ok: false,
      status: integrity.status,
      error: `Refund blocked by server goal verification engine: ${integrity.reason}`
    });
  }

  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    return res.status(503).json({ ok: false, error: 'Razorpay keys not configured on server' });
  }

  // Find refundable payments for this user
  const refundable = restores.paid.filter(p => p.userId === userId && !p.refundedAt && (!paymentId || p.paymentId === paymentId));

  if (refundable.length === 0) {
    return res.json({ ok: false, message: 'No eligible commitment deposits found for refund.' });
  }

  const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
  const results = [];

  for (const item of refundable) {
    try {
      const response = await fetch(`https://api.razorpay.com/v1/payments/${item.paymentId}/refund`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notes: {
            reason: 'Target completed streak deposit refund',
            userId: item.userId
          }
        })
      });

      const data = await response.json();
      if (response.ok && data.id) {
        item.refundId = data.id;
        item.refundedAt = Date.now();
        item.refundStatus = 'processed';
        results.push({ paymentId: item.paymentId, refundId: data.id, rupees: item.rupees, status: 'success' });
      } else {
        // Fallback for simulation / already processed
        item.refundStatus = data.error?.description || 'failed';
        results.push({ paymentId: item.paymentId, error: data.error?.description || 'Refund API failed', status: 'error' });
      }
    } catch (err) {
      results.push({ paymentId: item.paymentId, error: err.message, status: 'error' });
    }
  }

  saveRestores();
  const refundedCount = results.filter(r => r.status === 'success').length;
  res.json({
    ok: refundedCount > 0,
    refundedCount,
    details: results,
    message: refundedCount > 0
      ? `🎉 Successfully initiated refund of ₹${results.reduce((acc, r) => acc + (r.rupees || 0), 0)}! Consistency rewarded.`
      : 'Refund request processed.'
  });
});

// Public ledger of streak commitments and refunds for transparent audit
app.get('/api/streak/restore/ledger', (req, res) => {
  const { userId } = req.query;
  const userLogs = userId
    ? restores.paid.filter(p => p.userId === userId)
    : restores.paid.slice(-100);

  res.json({
    totalHeldRupees: restores.paid.filter(p => !p.refundedAt).reduce((sum, p) => sum + (p.rupees || 0), 0),
    totalRefundedRupees: restores.paid.filter(p => p.refundedAt).reduce((sum, p) => sum + (p.rupees || 0), 0),
    records: userLogs.map(r => ({
      userId: r.userId ? r.userId.slice(0, 8) + '...' : 'anon',
      orderId: r.orderId,
      paymentId: r.paymentId,
      rupees: r.rupees,
      paidAt: r.at,
      refundId: r.refundId || null,
      refundedAt: r.refundedAt || null,
      status: r.refundedAt ? 'Refunded to User' : 'Held in Trust'
    }))
  });
});

const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, () => {
  console.log(`Reliv backend v${SERVER_VERSION} running on port ${PORT}`);
  if (REQUIRED_WARNINGS.length) {
    console.log(`[env] ${REQUIRED_WARNINGS.length} warning(s) — some features disabled. See above.`);
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[FATAL] Port ${PORT} is already in use.`);
    console.error('  → Kill the other process: lsof -ti :' + PORT + ' | xargs kill');
    console.error('  → Or change PORT in .env\n');
    process.exit(1);
  }
  throw err;
});