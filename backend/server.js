import express from 'express';
import cors from 'cors';
import webpush from 'web-push';

const app = express();
app.use(cors());
app.use(express.json());

// For Render: It will use these if you set them in Render Environment Variables
if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
  console.log('WARNING: VAPID keys not found in environment variables!');
  console.log('Generating temporary keys. Note: Subscriptions will break when the server restarts unless you save these to Render!');
  const vapidKeys = webpush.generateVAPIDKeys();
  process.env.VAPID_PUBLIC_KEY = vapidKeys.publicKey;
  process.env.VAPID_PRIVATE_KEY = vapidKeys.privateKey;
  console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
  console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
}

webpush.setVapidDetails('mailto:test@reliv.local', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

// In-memory store (Since Render wipes files, we use memory. The PWA automatically resubscribes on open anyway).
const subscriptions = new Set();

// Ping route for UptimeRobot
app.get('/api/ping', (req, res) => {
  res.send('pong');
});

app.get('/api/push/vapid-public-key', (req, res) => {
  res.send(process.env.VAPID_PUBLIC_KEY);
});

app.post('/api/push/subscribe', (req, res) => {
  const { subscription } = req.body;
  if (!subscription) return res.status(400).json({ ok: false });
  // Store the subscription in memory
  subscriptions.add(JSON.stringify(subscription));
  res.json({ ok: true });
});

app.post('/api/push/remind', (req, res) => {
  const { message = "💧 Reminding you: Time to check in!", delayMs = 300000 } = req.body || {};
  setTimeout(async () => {
    const payload = JSON.stringify({ title: 'Reliv Reminder', body: message });
    for (const subStr of subscriptions) {
      try { await webpush.sendNotification(JSON.parse(subStr), payload, { TTL: 86400, urgency: 'high' }); } catch(e) {}
    }
  }, delayMs);
  res.json({ ok: true });
});

// Dynamic Background Timers
let waterInterval = null;
let testInterval = null;

app.post('/api/push/water/start', (req, res) => {
  if (waterInterval) clearInterval(waterInterval);
  // Send one immediately too
  const payload = JSON.stringify({ title: 'Reliv Coach', body: '💧 Drink Water! Stay hydrated.' });
  subscriptions.forEach(sub => webpush.sendNotification(JSON.parse(sub), payload).catch(()=>{}));
  
  waterInterval = setInterval(async () => {
    for (const subStr of subscriptions) {
      try { await webpush.sendNotification(JSON.parse(subStr), payload, { TTL: 86400, urgency: 'high' }); } catch(e) {}
    }
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
  const payload = JSON.stringify({ title: 'Reliv Test', body: '🔔 5-second test notification!' });
  subscriptions.forEach(sub => webpush.sendNotification(JSON.parse(sub), payload).catch(()=>{}));
  
  testInterval = setInterval(async () => {
    for (const subStr of subscriptions) {
      try { await webpush.sendNotification(JSON.parse(subStr), payload, { TTL: 86400, urgency: 'high' }); } catch(e) {}
    }
  }, 5000); // 5 seconds
  res.json({ ok: true, status: 'started' });
});

app.post('/api/push/test/stop', (req, res) => {
  if (testInterval) clearInterval(testInterval);
  testInterval = null;
  res.json({ ok: true, status: 'stopped' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Reliv backend running on port ${PORT}`);
});
