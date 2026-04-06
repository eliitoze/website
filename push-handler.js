// ── Config ────────────────────────────────────────────────────────
const VAPID_PUBLIC_KEY = 'BF1UCKQsbyW9V3QysGCO41U-AtPvyyKGMWSN3-Oc0GLzX4VlUguz7q89tapldmI7CYE6HCkBGEOOz5ctu-ouxSc';
const WORKER_URL       = 'https://eliitoze-worker.bhkmanish.workers.dev';
const SW_SCOPE = './';
const SW_PATH  = 'sw.js';

// Admin panel આ ઓબ્જેક્ટ શોધે છે
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
            
            // Checking permission લખાણ દૂર કરવા માટે
            const statusEl = document.getElementById('push-status-text');
            if (statusEl) statusEl.innerText = '';
        } catch (e) {
            console.error('Fetch error:', e);
        }
    },
    async sendNotification(title, message) {
        // આ ફંક્શન admin.html ના SEND બટન માટે છે
        try {
            const r = await fetch(`${WORKER_URL}/send-push`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, message })
            });
            return await r.json();
        } catch (e) { console.error('Send error:', e); }
    }
};

async function initPush() {
    if (!('serviceWorker' in navigator)) return;
    try {
        await navigator.serviceWorker.register(SW_PATH, { scope: SW_SCOPE });
        PushHandler.fetchStats(); 
    } catch (e) { console.error('[Push] failed:', e); }
}

initPush();
