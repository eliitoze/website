// ── Config ────────────────────────────────────────────────────────
const VAPID_PUBLIC_KEY = 'BF1UCKQsbyW9V3QysGCO41U-AtPvyyKGMWSN3-Oc0GLzX4VlUguz7q89tapldmI7CYE6HCkBGEOOz5ctu-ouxSc';
const WORKER_URL       = 'https://eliitoze-worker.bhkmanish.workers.dev';
const SW_SCOPE = './';
const SW_PATH  = 'sw.js';

// આ ઓબ્જેક્ટ હોવો જરૂરી છે કારણ કે admin.html આને શોધે છે
const PushHandler = {
    async fetchStats() {
        try {
            const r = await fetch(`${WORKER_URL}/db-write`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ operation: 'select', table: 'push_subscriptions' })
            });
            const d = await r.json();
            const count = Array.isArray(d) ? d.length : 0;
            const el = document.getElementById('sub-count');
            if (el) el.innerText = count + ' subscribers';
            const statusEl = document.getElementById('push-status-text');
            if (statusEl) statusEl.innerText = '';
        } catch (e) {
            console.error('Fetch error:', e);
        }
    }
};

function urlBase64ToUint8Array(b64) {
    const pad = '='.repeat((4 - b64.length % 4) % 4);
    const base64 = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

async function initPush() {
    if (!('serviceWorker' in navigator)) return;
    try {
        const reg = await navigator.serviceWorker.register(SW_PATH, { scope: SW_SCOPE });
        PushHandler.fetchStats(); // આંકડો લોડ કરવા માટે
    } catch (e) { console.error('[Push] failed:', e); }
}

initPush();
