import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import webpush from 'web-push';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import https from 'https';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ---------------------------------------------------------------------------
// GEMINI API KEY (Secure - kept on backend only)
// ---------------------------------------------------------------------------
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyABZ2LS-R-sFwg4QK41AIixraTKmmH5ed8';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

// ---------------------------------------------------------------------------
// VAPID KEYS
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
  }
  return fresh;
}

const vapidKeys = loadOrCreateVapidKeys();
process.env.VAPID_PUBLIC_KEY = vapidKeys.publicKey;
process.env.VAPID_PRIVATE_KEY = vapidKeys.privateKey;

webpush.setVapidDetails('mailto:admin@relivpwa.onrender.com', vapidKeys.publicKey, vapidKeys.privateKey);

// ---------------------------------------------------------------------------
// SUBSCRIPTIONS
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
const SCHEDULE_FILE = path.join(__dirname, 'schedules.json');
const scheduledTimers = {};

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

  console.log(`[ping] Starting self-ping loop to keep Render awake: ${url}`);
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
  }, 10 * 60 * 1000);
}

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

const recoveredKeys = Object.keys(schedules);
recoveredKeys.forEach((key) => {
  if (key === '_serverPublicUrl') return;
  const job = schedules[key];
  if (job && job.dueAt) armSchedule(key, job.title, job.body, job.dueAt);
});
if (recoveredKeys.length) console.log(`[schedule] Recovered pending reminder(s) after restart.`);

const savedUrl = schedules['_serverPublicUrl'];
if (savedUrl && Object.keys(schedules).filter(k => k !== '_serverPublicUrl').length > 0) {
  startSelfPing(savedUrl);
}

app.post('/api/push/schedule', (req, res) => {
  const { key, title = 'Reliv Reminder', body, dueAt } = req.body || {};
  if (!key || !body || !dueAt) return res.status(400).json({ ok: false });
  schedules[key] = { title, body, dueAt };
  saveSchedules();
  armSchedule(key, title, body, dueAt);

  const selfUrl = `${req.protocol}://${req.get('host')}`;
  startSelfPing(selfUrl);

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

let waterInterval = null;

app.post('/api/push/water/start', (req, res) => {
  if (waterInterval) clearInterval(waterInterval);
  broadcast({ title: 'Relix Coach', body: '💧 Drink Water! Stay hydrated.' });
  waterInterval = setInterval(() => {
    broadcast({ title: 'Relix Coach', body: '💧 Drink Water! Stay hydrated.' });
  }, 45 * 60 * 1000);
  res.json({ ok: true, status: 'started' });
});

app.post('/api/push/water/stop', (req, res) => {
  if (waterInterval) clearInterval(waterInterval);
  waterInterval = null;
  res.json({ ok: true, status: 'stopped' });
});

app.get('/api/push/status', (req, res) => {
  res.json({
    subscriptions: subscriptions.size,
    waterLoopActive: Boolean(waterInterval),
    scheduledReminders: Object.keys(schedules).length
  });
});

// ---------------------------------------------------------------------------
// AI API PROXIES - Secure (Backend holds API keys)
// ---------------------------------------------------------------------------

// POST /api/ai/chat - Proxy chat requests to Gemini or Groq
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { messages, useGroq } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages array' });
    }

    let response;
    if (useGroq && GROQ_API_KEY) {
      response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages,
          response_format: { type: 'json_object' }
        })
      });
    } else {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const payload = {
        contents: messages.map((m, i) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        })),
        generationConfig: { responseMimeType: 'application/json' }
      };
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('[ai/chat] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/analyze-image - Proxy meal/face image analysis to Gemini
app.post('/api/ai/analyze-image', async (req, res) => {
  try {
    const { imageBase64, prompt, mimeType } = req.body;
    if (!imageBase64 || !prompt) {
      return res.status(400).json({ error: 'Missing imageBase64 or prompt' });
    }

    let base64Data = imageBase64;
    let detectedMimeType = mimeType || 'image/jpeg';
    if (imageBase64.includes(',')) {
      const parts = imageBase64.split(',');
      detectedMimeType = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
      base64Data = parts[1];
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const payload = {
      contents: [{
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: detectedMimeType,
              data: base64Data
            }
          }
        ]
      }],
      generationConfig: { responseMimeType: 'application/json' }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('[ai/analyze-image] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/pdf-process - Extract and process PDF for AI knowledge base
app.post('/api/ai/pdf-process', async (req, res) => {
  try {
    const { pdfText, action } = req.body; // action: 'flashcards' | 'quiz' | 'lesson' | 'summary'
    if (!pdfText || !action) {
      return res.status(400).json({ error: 'Missing pdfText or action' });
    }

    let prompt = '';
    if (action === 'flashcards') {
      prompt = `Extract key concepts from this text and create a JSON array of flashcard objects. Each object should have 'front' (question) and 'back' (answer) fields. Return ONLY valid JSON.\n\nText:\n${pdfText}`;
    } else if (action === 'quiz') {
      prompt = `Create a JSON array of 5 multiple-choice quiz questions from this text. Each question should have 'question', 'options' (array of 4), and 'correct' (index of correct answer). Return ONLY valid JSON.\n\nText:\n${pdfText}`;
    } else if (action === 'lesson') {
      prompt = `Summarize this text as structured lesson with 'title', 'overview', 'keyPoints' (array), and 'summary'. Return ONLY valid JSON.\n\nText:\n${pdfText}`;
    } else {
      prompt = `Create a concise summary of this text. Return valid JSON with 'summary' and 'keyTakeaways' fields.\n\nText:\n${pdfText}`;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const payload = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: { responseMimeType: 'application/json' }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('[ai/pdf-process] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Reliv backend running on port ${PORT}`);
  console.log(`[ai] Gemini API configured: ${GEMINI_API_KEY ? 'Yes' : 'No'}`);
  console.log(`[ai] Groq API configured: ${GROQ_API_KEY ? 'Yes' : 'No'}`);
});
