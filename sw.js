
const CACHE = 'notifier-v2';
const ASSETS = ['./', './index.html', './app.js', './manifest.json'];
 
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS).catch(() => {})));
});
 
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n)))
    ).then(() => clients.claim())
  );
});
 
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((r) => r || fetch(e.request).catch(() => caches.match('./index.html')))
  );
});
 
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
        const isSilent = data.sound === 'none';
        const notifOptions = {
          body: data.message || '',
          badge: data.icon || './icon-192.png',
          icon: data.icon || './icon-192.png',
          tag: 'n-' + i + '-' + ts,
          renotify: true,
          requireInteraction: false,
          silent: isSilent
        };
        self.registration.showNotification(data.title || 'Reminder', notifOptions);
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
