const CACHE_NAME = 'relix-v5';
const CORE_ASSETS = ['./', './index.html', './style.css', './app.js', './manifest.json', './file.jpg', './icons/favicon.svg', './icons/icon-192.svg', './icons/icon-512.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html'))));
});

self.addEventListener('push', (event) => {
  let data = { title: 'Reliv Reminder', body: 'Time to check in!' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch(err) {
      data.body = event.data.text();
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: './icons/icon-192.svg',
      badge: './icons/icon-192.svg',
      vibrate: [200, 100, 200],
      data: { reminderKey: data.reminderKey || 'push', originalBody: data.body },
      actions: [
        { action: 'done', title: '✅ Yes' },
        { action: 'later', title: '⏱️ 5m' },
        { action: 'skip', title: '❌ No' }
      ]
    }).then(() => {
      if ('setAppBadge' in navigator) {
        return navigator.setAppBadge(1).catch(() => {});
      }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  // Instantly close the notification to make it "very very responsive"
  event.notification.close();
  if ('clearAppBadge' in navigator) {
    navigator.clearAppBadge().catch(() => {});
  }
  
  const reminderKey = event.notification.data?.reminderKey || event.notification.tag;
  const action = event.action || 'open';
  
  if (action === 'skip') {
    return; // Just dismissed, do nothing else
  }
  
  // Handle "yes", "later" or normal click: focus the app and postMessage
  // (app.js handles rescheduling the 5m alarm locally)
  event.waitUntil(
    caches.open('reliv-actions').then(cache => {
      return cache.put('/action/' + reminderKey + '/' + Date.now(), new Response(action));
    }).then(() => {
      return clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        const appClient = clientList.find((client) => client.url.includes(self.location.origin)) || clientList[0];
        
        if (appClient) {
          appClient.postMessage({ type: 'reminder-action', reminderKey, action: action === 'open' ? 'done' : action });
          return appClient.focus();
        }
        
        return clients.openWindow('./');
      });
    })
  );
});

