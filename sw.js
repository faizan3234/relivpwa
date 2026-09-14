const CACHE_NAME = 'relix-v7';
const CORE_ASSETS = ['./', './index.html', './style.css', './app.js', './manifest.json', './file.jpg', './icons/favicon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME && key !== 'reliv-actions').map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // Don't cache API calls
  if (event.request.url.includes('/api/')) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
  );
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

  // Map reminder keys to notification actions
  const key = data.reminderKey || 'push';
  let actions = [];
  if (key === 'water' || key.includes('hydration')) {
    actions = [
      { action: 'log-water', title: '💧 Log 250ml' },
      { action: 'later', title: '⏱️ 5m' },
      { action: 'skip', title: '❌ Skip' }
    ];
  } else if (key.includes('meal') || key.includes('diet') || key.includes('shake') || key.includes('protein') || key.includes('portion')) {
    actions = [
      { action: 'log-meal', title: '🍽️ Log Meal' },
      { action: 'later', title: '⏱️ 5m' },
      { action: 'skip', title: '❌ Skip' }
    ];
  } else if (key === 'daily-reset-warning') {
    actions = [
      { action: 'open-coach', title: '🏋️ Open Coach' },
      { action: 'done', title: '✅ Done' }
    ];
  } else {
    actions = [
      { action: 'done', title: '✅ Yes' },
      { action: 'later', title: '⏱️ 5m' },
      { action: 'skip', title: '❌ No' }
    ];
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: './icons/icon-192.png',
      badge: './icons/icon-192.png',
      vibrate: [200, 100, 200],
      tag: key,
      renotify: true,
      data: { reminderKey: key, originalBody: data.body },
      actions
    }).then(() => {
      if ('setAppBadge' in navigator) {
        return navigator.setAppBadge(1).catch(() => {});
      }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if ('clearAppBadge' in navigator) {
    navigator.clearAppBadge().catch(() => {});
  }
  
  const reminderKey = event.notification.data?.reminderKey || event.notification.tag;
  const action = event.action || 'open';
  
  if (action === 'skip') return;
  
  // Determine which tab to open based on action
  let targetTab = null;
  if (action === 'log-water') targetTab = 'dashboard';
  else if (action === 'log-meal') targetTab = 'routine';
  else if (action === 'open-coach') targetTab = 'coach';

  event.waitUntil(
    caches.open('reliv-actions').then(cache => {
      return cache.put('/action/' + reminderKey + '/' + Date.now(), new Response(action));
    }).then(() => {
      return clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        const appClient = clientList.find((client) => client.url.includes(self.location.origin)) || clientList[0];
        
        if (appClient) {
          appClient.postMessage({ 
            type: 'reminder-action', 
            reminderKey, 
            action: action === 'open' ? 'done' : action,
            targetTab 
          });
          return appClient.focus();
        }
        
        const url = targetTab ? `./?tab=${targetTab}` : './';
        return clients.openWindow(url);
      });
    })
  );
});
