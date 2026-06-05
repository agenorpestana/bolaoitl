const CACHE_NAME = 'cartola-itl-cache-v11';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('Assets caching warning during install:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Let's pass API requests directly to network immediately
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Network-First strategy with Cache fallback:
  // This ensures that when the app is updated (new compiled chunk hashes),
  // the user fetches the new index.html from network rather than served from stale cache.
  // Stale cache would request deleted chunk files and cause a blank screen on reload (F5).
  // If the user is offline, it falls back to the cache.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache valid static responses
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// Support receiving standard Web Push Notifications
self.addEventListener('push', (event) => {
  let data = { 
    title: 'Cartola ITL', 
    body: 'Não fique de fora faça seu palpite e concorra a prêmios!',
    url: '/'
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      if (parsed) {
        data.title = parsed.title || data.title;
        data.body = parsed.body || data.body;
        data.url = parsed.url || data.url;
      }
    } catch (e) {
       const text = event.data.text();
       if (text) data.body = text;
    }
  }

  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url
    },
    actions: [
      { action: 'open', title: 'Palpitar Agora ⚽' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle clicking on the push notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        const clientPath = new URL(client.url).pathname;
        if (clientPath === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new tab/window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

