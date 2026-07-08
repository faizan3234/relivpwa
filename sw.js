const CACHE_NAME = 'relix-v2';
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

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const reminderKey = event.notification.data?.reminderKey || event.notification.tag;
  const action = event.action || 'open';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const appClient = clientList.find((client) => client.url.includes(self.location.origin)) || clientList[0];
      if (action === 'open') {
        if (appClient) {
          return appClient.focus();
        }
        return clients.openWindow('./');
      }

      if (appClient) {
        appClient.postMessage({ type: 'reminder-action', reminderKey, action });
        return appClient.focus();
      }

      return clients.openWindow('./').then((newClient) => newClient.postMessage({ type: 'reminder-action', reminderKey, action }));
    })
  );
});
