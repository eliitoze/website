// ════════════════════════════════════════════════════════
//  Eliitoze Jewelz — Push Handler v2 (FIXED)
//  Fixes:
//    1. Added missing: isPushSupported(), subscribeDevice(),
//                      requestPermissionAndSubscribe()
//    2. fetchStats() — correct d.data parsing
//    3. sendNotification() — X-Admin-Secret header added
//    4. SW registration path fixed for GitHub Pages
//    5. VAPID public key updated (new keys)
// ════════════════════════════════════════════════════════

// ── Config (supabase.js/index.html ma declare chhe, duplicate avoid karo) ──
// VAPID public key — Worker ma pan same hovu joiye
const PUSH_VAPID_PUBLIC_KEY = 'BANeYiwLxUIG6nmokr2rcW6FK_d_e3wQnl0N7U6X34N783L0Xhn7H-JhjvE6Pv0cvcBc3k5M4DCAgK_0mH7mQB8';

// window.WORKER_URL & window.ADMIN_SECRET — supabase.js set kare chhe
const _WORKER_URL    = () => (window.WORKER_URL    || 'https://eliitoze-worker.bhkmanish.workers.dev').replace(/\/$/, '');
const _ADMIN_SECRET  = () => (window.ADMIN_SECRET  || 'Eliitoze@2025');

// ── Convert VAPID public key for pushManager.subscribe ──
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

// ── Get or register Service Worker ──────────────────────
async function getServiceWorkerRegistration() {
  if (!('serviceWorker' in navigator)) throw new Error('Service Worker not supported');
  // GitHub Pages path
  let reg = await navigator.serviceWorker.getRegistration('/website/');
  if (!reg) {
    reg = await navigator.serviceWorker.register('/website/sw.js', { scope: '/website/' });
    // Wait for it to be active
    await new Promise((resolve, reject) => {
      if (reg.active) return resolve();
      const sw = reg.installing || reg.waiting;
      if (!sw) return reject(new Error('SW install failed'));
      sw.addEventListener('statechange', () => {
        if (sw.state === 'activated') resolve();
        if (sw.state === 'redundant') reject(new Error('SW became redundant'));
      });
    });
  }
  return reg;
}

// ── Save subscription to Neon via Worker ────────────────
async function saveSubscriptionToWorker(subscription) {
  const json = subscription.toJSON();
  const body = {
    operation: 'upsert',
    table: 'push_subscriptions',
    data: {
      endpoint:       json.endpoint,
      p256dh:         json.keys.p256dh,
      auth:           json.keys.auth,
      user_agent:     navigator.userAgent.substring(0, 200),
      subscribed_at:  new Date().toISOString()
    }
  };
  const r = await fetch(`${_WORKER_URL()}/db-write`, {
    method: 'POST',
    headers: {
      'Content-Type':   'application/json',
      'X-Admin-Secret': _ADMIN_SECRET()
    },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error('Failed to save subscription: ' + r.status);
  return r.json();
}

// ════════════════════════════════════════════════════════
//  PushHandler — Public API (used by admin.html & index.html)
// ════════════════════════════════════════════════════════
const PushHandler = {

  // Check if push is supported in this browser
  isPushSupported() {
    return ('serviceWorker' in navigator) &&
           ('PushManager' in window) &&
           ('Notification' in window);
  },

  // Get current permission state: 'granted' | 'denied' | 'default'
  getPermissionState() {
    if (!('Notification' in window)) return 'denied';
    return Notification.permission;
  },

  // Subscribe this device (assumes permission already granted)
  async subscribeDevice() {
    const reg = await getServiceWorkerRegistration();
    // Check if already subscribed
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(PUSH_VAPID_PUBLIC_KEY)
      });
    }
    await saveSubscriptionToWorker(sub);
    return sub;
  },

  // Request permission, then subscribe — returns permission state string
  async requestPermissionAndSubscribe() {
    if (!PushHandler.isPushSupported()) throw new Error('Push not supported');

    let perm = Notification.permission;
    if (perm === 'default') {
      perm = await Notification.requestPermission();
    }
    if (perm !== 'granted') return perm;

    await PushHandler.subscribeDevice();
    return 'granted';
  },

  // Fetch subscriber count from Neon and update UI
  async fetchStats() {
    try {
      const r = await fetch(`${_WORKER_URL()}/db-write`, {
        method: 'POST',
        headers: {
          'Content-Type':   'application/json',
          'X-Admin-Secret': _ADMIN_SECRET()
        },
        body: JSON.stringify({ operation: 'select', table: 'push_subscriptions' })
      });
      const d = await r.json();
      // Worker returns { data: [...] }
      const count = Array.isArray(d.data) ? d.data.length : 0;

      const el = document.getElementById('sub-count');
      if (el) el.innerText = count + ' subscribers';
      const el2 = document.getElementById('notif-sub-count');
      if (el2) el2.textContent = count + ' subscribers';

      const statusEl = document.getElementById('push-status-text');
      if (statusEl) statusEl.innerText = '';
    } catch (e) {
      console.error('[Push] fetchStats error:', e);
    }
  },

  // Send push notification — called from admin panel
  async sendNotification(title, body, url) {
    const payload = {
      title: title || 'Eliitoze Jewelz',
      body:  body  || 'New update!',
      url:   url   || 'https://eliitoze.github.io/website/'
    };
    try {
      const r = await fetch(`${_WORKER_URL()}/send-push`, {
        method: 'POST',
        headers: {
          'Content-Type':   'application/json',
          'X-Admin-Secret': _ADMIN_SECRET()
        },
        body: JSON.stringify({ payload })
      });
      return await r.json();
    } catch (e) {
      console.error('[Push] sendNotification error:', e);
      throw e;
    }
  }
};

// ── Auto-init on page load (subscribe if already permitted) ─
async function initPush() {
  if (!PushHandler.isPushSupported()) return;
  try {
    // Register SW silently
    await getServiceWorkerRegistration();
    // If user already granted before, re-save subscription silently
    if (Notification.permission === 'granted') {
      PushHandler.subscribeDevice().catch(() => {});
    }
    // Update stats if on admin
    PushHandler.fetchStats().catch(() => {});
  } catch (e) {
    console.error('[Push] initPush error:', e);
  }
}

initPush();
