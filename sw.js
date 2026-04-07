 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/sw.js b/sw.js
index 194f8b95dc9e80129e14467f253073f31c1a8ff9..1ae02bf1e8988fc146bc525968f6f06d13e4f6a0 100644
--- a/sw.js
+++ b/sw.js
@@ -1,50 +1,66 @@
 // ════════════════════════════════════════════════════════════════════
 //  sw.js  —  Eliitoze Jewelz Service Worker
 //  Handles: caching, push notifications, notification clicks
 // ════════════════════════════════════════════════════════════════════
 
-const CACHE     = 'eliitoze-v4';
+const CACHE     = 'eliitoze-v7';
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
 
 // ── Fetch: network-first for Supabase, cache-first for assets ────
 self.addEventListener('fetch', e => {
+  // For page navigations: network-first so latest HTML/UI changes appear quickly
+  if (e.request.mode === 'navigate') {
+    e.respondWith(
+      fetch(e.request)
+        .then(res => {
+          if (res && res.status === 200) {
+            const copy = res.clone();
+            caches.open(CACHE).then(c => c.put(e.request, copy));
+          }
+          return res;
+        })
+        .catch(() => caches.match(e.request))
+    );
+    return;
+  }
+
   // Always go to network for Supabase — never cache auth/API calls
   if (e.request.url.includes('supabase.co')) {
     e.respondWith(
       fetch(e.request).catch(() => new Response('{}', { headers: { 'Content-Type': 'application/json' } }))
     );
     return;
   }
   // Cache-first for same-origin assets
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
 
EOF
)
