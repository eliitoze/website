// ════════════════════════════════════════════════════════════════════
//  sw.js  —  Eliitoze Jewelz Service Worker
//  Handles: caching, push notifications, notification clicks
// ════════════════════════════════════════════════════════════════════

const CACHE     = 'eliitoze-v4';
// Use absolute paths for GitHub Pages /website/ subfolder
const ICON_PATH = '/website/icon-192.png';

// ── Install: skip waiting so new SW activates immediately ────────
self.addEventListener('install', e => {
  self.skipWaiting();
});

// ── Activate: clear old caches ───────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: network-first for API calls, cache-first for static assets ────
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Always network-first for API/Worker calls — never serve stale data
  if (
    url.includes('supabase.co') ||
    url.includes('workers.dev') ||
    url.includes('eliitoze-worker')
  ) {
    e.respondWith(
      fetch(e.request).catch(() => new Response('{}', { headers: { 'Content-Type': 'application/json' } }))
    );
    return;
  }

  // Cache-first for static assets (images, icons, fonts, etc.)
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      if (res && res.status === 200 && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    }))
  );
});

// ════════════════════════════════════════
//  PUSH NOTIFICATION HANDLER
// ════════════════════════════════════════
self.addEventListener('push', e => {
  // Default fallback data
  let data = {
    title: 'Eliitoze Jewelz',
    body:  'New update available!',
    url:   'https://eliitoze.github.io/website/'
  };

  if (e.data) {
    try { data = Object.assign({}, data, e.data.json()); } catch (_) {}
  }

  const options = {
    body:     data.body,
    icon:     ICON_PATH,
    badge:    ICON_PATH,
    vibrate:  [200, 100, 200],
    tag:      'eliitoze-push',
    renotify: true,
    data:     { url: data.url }
  };

  e.waitUntil(self.registration.showNotification(data.title, options));
});

// ── Notification click: open/focus the site ──────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url)
    ? e.notification.data.url
    : 'https://eliitoze.github.io/website/';

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // If site is already open, focus it
      for (const client of clientList) {
        if (client.url.includes('eliitoze.github.io') && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
