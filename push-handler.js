(function () {
  'use strict';

  // ── Config ────────────────────────────────────────────────────────
  const VAPID_PUBLIC_KEY = 'BF1UCKQsbyW9V3QysGCO41U-AtPvyyKGMWSN3-Oc0GLzX4VlUguz7q89tapldmI7CYE6HCkBGEOOz5ctu-ouxSc';
  const WORKER_URL       = 'https://eliitoze-worker.bhkmanish.workers.dev';
  const SW_SCOPE         = './'; 
  const SW_PATH          = 'sw.js';
  const PROMPT_DELAY     = 3500;

  function urlBase64ToUint8Array(b64) {
    const pad = '='.repeat((4 - b64.length % 4) % 4);
    const base64 = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
  }

  async function initPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
      const reg = await navigator.serviceWorker.register(SW_PATH, { scope: SW_SCOPE });
      let sub = await reg.pushManager.getSubscription();

      if (!sub) {
        setTimeout(async () => {
          const res = await Notification.requestPermission();
          if (res === 'granted') {
            sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });
            saveSubscription(sub);
          }
        }, PROMPT_DELAY);
      } else {
        saveSubscription(sub);
      }
    } catch (e) { console.error('[Push] Registration failed:', e); }
  }

  async function saveSubscription(sub) {
    const key = sub.getKey('p256dh');
    const auth = sub.getKey('auth');
    const data = {
      endpoint: sub.endpoint,
      p256dh: btoa(String.fromCharCode(...new Uint8Array(key))),
      auth: btoa(String.fromCharCode(...new Uint8Array(auth))),
      user_agent: navigator.userAgent
    };

    fetch(`${WORKER_URL}/db-write`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operation: 'upsert', table: 'push_subscriptions', data: data })
    }).then(r => r.json()).then(d => console.log('[Push] Saved:', d));
  }

  initPush();
})();
