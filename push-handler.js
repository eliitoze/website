// ════════════════════════════════════════════════════════════════════
//  push-handler.js  —  Eliitoze Jewelz
//  Handles push notification permission, subscription creation,
//  and saving to Supabase push_subscriptions table.
//
//  Include this file on every page, AFTER supabase.js:
//    <script src="supabase.js"></script>
//    <script src="push-handler.js"></script>
// ════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── Config ────────────────────────────────────────────────────────
  const VAPID_PUBLIC_KEY = 'BM9NNO-kYPRNB_9SC35EG1EYD4hkCVufYHlcF2F51pFxcbnjWwpUQnU9O4BfVMS4zwDAYefDfkidEP1mF39QXTE';
  // SW path must match your GitHub Pages path (scope /website/)
  const SW_SCOPE    = '/website/';
  const SW_PATH     = '/website/sw.js';
  // Delay before showing permission prompt on first open (ms)
  const PROMPT_DELAY = 3500;
  // localStorage key — prevents showing prompt more than once
  const PROMPTED_KEY = 'eliitoze_push_prompted';

  // ── Utility: convert VAPID key ────────────────────────────────────
  function urlBase64ToUint8Array(b64) {
    const pad    = '='.repeat((4 - b64.length % 4) % 4);
    const base64 = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/');
    const raw    = atob(base64);
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
  }

  // ── Check browser support ─────────────────────────────────────────
  function isPushSupported() {
    return (
      'Notification'  in window &&
      'serviceWorker' in navigator &&
      'PushManager'   in window
    );
  }

  // ── Register Service Worker ───────────────────────────────────────
  async function registerSW() {
    try {
      const reg = await navigator.serviceWorker.register(SW_PATH, { scope: SW_SCOPE });
      await navigator.serviceWorker.ready;
      return reg;
    } catch (err) {
      // SW already registered under this scope — just get the existing one
      try {
        return await navigator.serviceWorker.ready;
      } catch (e) {
        throw new Error('[Push] SW registration failed: ' + err.message);
      }
    }
  }

  // ── Save subscription via Cloudflare Worker (service_role — bypasses RLS) ──
  async function saveToSupabase(subscription) {
    try {
      const subJson = subscription.toJSON();

      if (!subJson.keys || !subJson.keys.p256dh || !subJson.keys.auth) {
        console.warn('[Push] Subscription missing keys — cannot save.');
        return false;
      }

      const workerUrl = window.WORKER_URL;
      if (!workerUrl) {
        console.warn('[Push] WORKER_URL not set — cannot save subscription.');
        return false;
      }

      const resp = await fetch(workerUrl.replace(/\/$/, '') + '/db-write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'upsert',
          table: 'push_subscriptions',
          data: {
            endpoint:      subJson.endpoint,
            p256dh:        subJson.keys.p256dh,
            auth:          subJson.keys.auth,
            user_agent:    navigator.userAgent.slice(0, 200),
            subscribed_at: new Date().toISOString()
          }
        })
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        console.warn('[Push] Save failed:', err.error || resp.status);
        return false;
      }

      console.log('[Push] Subscription saved via Worker ✓');
      return true;
    } catch (err) {
      console.warn('[Push] saveToSupabase error:', err.message);
      return false;
    }
  }

  // ── Create a new push subscription (or reuse existing) ───────────
  async function createOrReuseSubscription(reg) {
    // Check if a subscription already exists for this browser
    let sub = await reg.pushManager.getSubscription();

    if (sub) {
      // Subscription exists — ensure it's stored in DB (handles case where
      // user cleared DB rows but browser still has subscription)
      console.log('[Push] Existing subscription found — syncing to DB...');
      await saveToSupabase(sub);
      return sub;
    }

    // Create fresh subscription
    sub = await reg.pushManager.subscribe({
      userVisibleOnly:      true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    console.log('[Push] New subscription created ✓');
    await saveToSupabase(sub);
    return sub;
  }

  // ── Full subscribe flow (register SW + subscribe + save) ─────────
  async function subscribeDevice() {
    if (!isPushSupported()) return null;
    if (Notification.permission !== 'granted') return null;

    try {
      const reg = await registerSW();
      return await createOrReuseSubscription(reg);
    } catch (err) {
      console.warn('[Push] subscribeDevice error:', err.message);
      return null;
    }
  }

  // ── Ask permission, then subscribe ───────────────────────────────
  async function requestPermissionAndSubscribe() {
    if (!isPushSupported()) return;

    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      await subscribeDevice();
    }
    return perm;
  }

  // ── Auto-prompt logic (called on page load) ───────────────────────
  //   • Permission already granted → silently ensure subscription exists
  //   • Permission default + never prompted → show prompt after delay
  //   • Permission denied → do nothing
  async function autoPushInit() {
    if (!isPushSupported()) return;

    const perm = Notification.permission;

    if (perm === 'granted') {
      // Already allowed — silently ensure subscription is fresh in DB
      await subscribeDevice();
      return;
    }

    if (perm === 'denied') return;

    // perm === 'default'
    // Only prompt once per browser (localStorage flag)
    if (localStorage.getItem(PROMPTED_KEY)) return;

    // Pre-register SW quietly so it's ready when user accepts
    try { await navigator.serviceWorker.register(SW_PATH, { scope: SW_SCOPE }); } catch (_) {}

    // Wait a few seconds so the page feels loaded before showing system dialog
    setTimeout(async () => {
      localStorage.setItem(PROMPTED_KEY, '1');
      await requestPermissionAndSubscribe();
    }, PROMPT_DELAY);
  }

  // ── Run on DOMContentLoaded ───────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoPushInit);
  } else {
    autoPushInit();
  }

  // ── Public API (used by admin panel buttons) ──────────────────────
  window.PushHandler = {
    // Call this when admin clicks "Enable Notifications on This Device"
    subscribeDevice,
    requestPermissionAndSubscribe,
    saveToSupabase,
    isPushSupported
  };

})();
