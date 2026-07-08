import express from 'express';
import cors from 'cors';
import webpush from 'web-push';
import fs from 'fs';
import 'dotenv/config';

const app = express();
app.use(cors());
app.use(express.json());

// Initialize VAPID Keys if missing
if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
  const vapidKeys = webpush.generateVAPIDKeys();
  fs.appendFileSync('.env', `VAPID_PUBLIC_KEY=${vapidKeys.publicKey}\nVAPID_PRIVATE_KEY=${vapidKeys.privateKey}\n`);
  process.env.VAPID_PUBLIC_KEY = vapidKeys.publicKey;
  process.env.VAPID_PRIVATE_KEY = vapidKeys.privateKey;
  console.log('Generated new VAPID keys and saved to .env');
}

webpush.setVapidDetails('mailto:test@reliv.local', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

// Simple file-based subscription store
const DB_FILE = './subs.json';
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify([]));

function getSubscriptions() {
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}
function addSubscription(sub) {
  const subs = getSubscriptions();
  // Prevent exact duplicates
  if (!subs.find(s => s.endpoint === sub.endpoint)) {
    subs.push(sub);
    fs.writeFileSync(DB_FILE, JSON.stringify(subs, null, 2));
  }
}

// Routes
app.get('/api/push/vapid-public-key', (req, res) => {
  res.send(process.env.VAPID_PUBLIC_KEY);
});

app.post('/api/push/subscribe', (req, res) => {
  const { subscription } = req.body;
  if (!subscription) return res.status(400).json({ ok: false });
  addSubscription(subscription);
  res.json({ ok: true });
});

// Triggered by the "5m" snooze button
app.post('/api/push/remind', (req, res) => {
  const { message = "💧 Reminding you: Time to check in!", delayMs = 300000, endpoint } = req.body || {};
  
  setTimeout(async () => {
    const subs = getSubscriptions();
    // find the specific subscription that requested the snooze, or send to all if not specified
    const targets = endpoint ? subs.filter(s => s.endpoint === endpoint) : subs;
    
    const payload = JSON.stringify({ title: 'Reliv Reminder', body: message });
    for (const sub of targets) {
      try { await webpush.sendNotification(sub, payload, { TTL: 86400, urgency: 'high' }); } catch(e) { console.log(e); }
    }
  }, delayMs);
  
  res.json({ ok: true });
});

// For testing
app.post('/api/push/test', async (req, res) => {
  const { message = "💧 Drink water!" } = req.body || {};
  const subs = getSubscriptions();
  const payload = JSON.stringify({ title: 'Reliv Reminder', body: message });
  
  for (const sub of subs) {
    try { await webpush.sendNotification(sub, payload, { TTL: 86400, urgency: 'high' }); } catch(e) { console.log(e); }
  }
  res.json({ ok: true, sent: subs.length });
});

app.listen(4000, () => {
  console.log('Reliv-Test backend running on http://localhost:4000');
});
