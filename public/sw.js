/* Meowdoku Offline-First Service Worker (Zero-Server PWA) */
const CACHE_VERSION = 'v5';
const SHELL_CACHE = `meowdoku-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `meowdoku-runtime-${CACHE_VERSION}`;
const FONT_CACHE = `meowdoku-fonts-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/cat-icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-192.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon-180.png',
  '/icons/favicon-32.png',
  '/icons/favicon-16.png',
  '/media/images/intro-hero.webp',
  '/media/images/victory-celebration.webp',
  '/media/images/chapter-easy.webp',
  '/media/images/world-candy-garden.webp',
  '/media/images/chapter-medium.webp',
  '/media/images/chapter-hard.webp',
  '/media/audio/sfx-select.mp3',
  '/media/audio/sfx-place-cat.mp3',
  '/media/audio/sfx-remove-cat.mp3',
  '/media/audio/sfx-mark-x.mp3',
  '/media/audio/sfx-error.mp3',
  '/media/audio/sfx-hint.mp3',
  '/media/audio/sfx-victory.mp3',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => undefined)
        )
      )
    )
  );
  // IMPORTANT: Do NOT call skipWaiting() unconditionally here so active puzzles are never interrupted!
  // The app triggers SKIP_WAITING safely when the user confirms or is outside an active puzzle.
});

self.addEventListener('activate', (event) => {
  const validCaches = new Set([SHELL_CACHE, RUNTIME_CACHE, FONT_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => !validCaches.has(k)).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (data.type === 'PRECACHE_URLS' && Array.isArray(data.urls)) {
    event.waitUntil(
      caches.open(RUNTIME_CACHE).then((cache) =>
        Promise.allSettled(
          data.urls
            .filter((u) => typeof u === 'string' && u.startsWith('/'))
            .map((u) =>
              cache.match(u).then((hit) => (hit ? undefined : cache.add(u).catch(() => undefined)))
            )
        )
      )
    );
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never pre-cache or block large video/range streams; load on demand
  if (
    req.headers.has('range') ||
    url.pathname.endsWith('.mp4') ||
    url.pathname.includes('/media/videos/')
  ) {
    return;
  }

  // Google Fonts: Stale-While-Revalidate (never resolve respondWith to undefined offline)
  if (
    url.origin === 'https://fonts.googleapis.com' ||
    url.origin === 'https://fonts.gstatic.com'
  ) {
    event.respondWith(
      caches.open(FONT_CACHE).then((cache) =>
        cache.match(req).then((cached) => {
          const network = fetch(req)
            .then((res) => {
              if (res && (res.status === 200 || res.type === 'opaque')) {
                cache.put(req, res.clone());
              }
              return res;
            })
            .catch(() => cached || new Response('', { status: 204 }));
          return cached || network;
        })
      )
    );
    return;
  }

  // Only handle same-origin requests beyond fonts
  if (url.origin !== self.location.origin) return;

  // Navigation requests (HTML): Network-First with instant offline shell fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(SHELL_CACHE).then((c) => c.put('/index.html', copy));
          }
          return res;
        })
        .catch(() =>
          caches
            .match('/index.html')
            .then((cached) => cached || caches.match('/'))
            .then((hit) => hit || new Response('Offline', { status: 503 }))
        )
    );
    return;
  }

  // Immutable hashed Vite build assets (/assets/*): Cache-First with pathname fallback
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then((cache) =>
        cache
          .match(req)
          .then((hit) => hit || cache.match(url.pathname))
          .then((cached) => {
            if (cached) return cached;
            return fetch(req)
              .then((res) => {
                if (res && res.status === 200) {
                  cache.put(url.pathname, res.clone());
                }
                return res;
              })
              .catch(() => new Response('', { status: 503 }));
          })
      )
    );
    return;
  }

  // Essential images, icons, SFX, manifest: Cache-First with background refresh
  event.respondWith(
    caches
      .match(req)
      .then((hit) => hit || caches.match(url.pathname))
      .then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res && res.status === 200 && res.type === 'basic') {
              const copy = res.clone();
              caches.open(SHELL_CACHE).then((cache) => cache.put(url.pathname, copy));
            }
            return res;
          })
          .catch(() => cached || new Response('', { status: 503 }));
        return cached || network;
      })
  );
});

/* ============================================================================
   BROWSER-ONLY LOCAL NOTIFICATIONS (ZERO SERVER)
   Handles notification clicks + optional Periodic Background Sync where supported
   ============================================================================ */

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const route =
    (event.notification.data && event.notification.data.route) || 'daily';
  const targetUrl = `/?action=${encodeURIComponent(route)}`;

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.postMessage({ type: 'OPEN_ROUTE', route });
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
        return undefined;
      })
  );
});

function parseHHMM(hhmm) {
  const parts = String(hhmm || '19:00').split(':');
  return Number(parts[0] || 19) * 60 + Number(parts[1] || 0);
}

function isInsideQuietHours(nowMin, startMin, endMin) {
  if (startMin === endMin) return false;
  if (startMin < endMin) {
    return nowMin >= startMin && nowMin < endMin;
  }
  return nowMin >= startMin || nowMin < endMin;
}

function getTodayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function readNotificationPrefsFromIDB() {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open('meowdoku_offline_db', 1);
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('notification_prefs')) {
          resolve(null);
          return;
        }
        const tx = db.transaction('notification_prefs', 'readonly');
        const getReq = tx.objectStore('notification_prefs').get('prefs');
        getReq.onsuccess = () => resolve(getReq.result || null);
        getReq.onerror = () => resolve(null);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function writeNotificationPrefsToIDB(prefs) {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open('meowdoku_offline_db', 1);
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('notification_prefs')) {
          resolve(false);
          return;
        }
        const tx = db.transaction('notification_prefs', 'readwrite');
        tx.objectStore('notification_prefs').put(prefs, 'prefs');
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      };
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

/*
 * The page builds a localized day-by-day reminder plan on-device (automatic timing, no
 * reminder on days already played, event-based messages, back-off when ignored) and stores
 * it here. The worker only delivers today's entry — it never invents its own message.
 */
self.addEventListener('periodicsync', (event) => {
  if (event.tag !== 'meowdoku-daily-reminder') return;

  event.waitUntil(
    (async () => {
      const prefs = await readNotificationPrefsFromIDB();
      if (!prefs || !prefs.enabled) return;

      const now = new Date();
      const today = getTodayKey();
      const plan = Array.isArray(prefs.plan) ? prefs.plan : [];
      const entry = plan.find((e) => e && e.dateKey === today);
      if (!entry || typeof entry.body !== 'string') return;

      const nowMin = now.getHours() * 60 + now.getMinutes();
      if (nowMin < Number(entry.notBeforeMinutes)) return;

      if (
        prefs.quietHoursEnabled &&
        isInsideQuietHours(nowMin, parseHHMM(prefs.quietStart), parseHHMM(prefs.quietEnd))
      ) {
        return;
      }

      // At most ONE reminder per day, whoever (page or worker) sent it
      const lastSent = prefs.lastSentDateByCategory || {};
      const sentLog = Array.isArray(prefs.sentLog) ? prefs.sentLog : [];
      if (Object.values(lastSent).includes(today) || sentLog.some((x) => x && x.dateKey === today)) {
        return;
      }

      await self.registration.showNotification(entry.title || 'Meowdoku 🐱', {
        body: entry.body,
        icon: '/icons/icon-192.png',
        badge: '/icons/favicon-32.png',
        tag: `meowdoku-${today}`,
        data: { route: entry.route || 'daily', category: entry.kind, dateKey: today },
      });

      prefs.lastSentDateByCategory = { ...lastSent, [entry.kind]: today };
      prefs.sentLog = [...sentLog, { dateKey: today, sentAt: Date.now(), kind: entry.kind }].slice(-20);
      await writeNotificationPrefsToIDB(prefs);
    })()
  );
});
