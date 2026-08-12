const CACHE = 'notifier-v1';
const ASSETS = ['./', './index.html', './app.js', './manifest.json'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS).catch(() => {})));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((r) => r || fetch(e.request).catch(() => caches.match('./index.html')))
  );
});

// The page posts scheduled fire times; the SW shows notifications at those times.
let timers = [];

self.addEventListener('message', (e) => {
  const data = e.data || {};
  if (data.type === 'SCHEDULE') {
    timers.forEach((t) => clearTimeout(t));
    timers = [];
    const now = Date.now();
    data.fireTimes.forEach((ts, i) => {
      const delay = Math.max(0, ts - now);
      const t = setTimeout(() => {
        self.registration.showNotification(data.title || 'Notification', {
          body: data.message || '',
          icon: data.icon || './icon-192.png',
          badge: './icon-192.png',
          tag: 'notif-' + i + '-' + ts,
          renotify: true,
          data: { sound: data.sound || null }
        });
        // Ask any open page to play the chosen sound (iOS ignores custom notif sounds).
        clients.matchAll({ includeUncontrolled: true, type: 'window' }).then((cs) => {
          cs.forEach((c) => c.postMessage({ type: 'PLAY_SOUND', sound: data.sound || null }));
        });
      }, delay);
      timers.push(t);
    });
  }
  if (data.type === 'CANCEL') {
    timers.forEach((t) => clearTimeout(t));
    timers = [];
  }
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
      if (cs.length) return cs[0].focus();
      return clients.openWindow('./');
    })
  );
});
