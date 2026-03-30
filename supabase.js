// ════════════════════════════════════════════════
//  SUPABASE CONFIG
// ════════════════════════════════════════════════
const SUPABASE_URL      = 'https://gyocbotkhoymkjbegkqz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5b2Nib3RraG95bWtqYmVna3F6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NjM3NTYsImV4cCI6MjA5MDAzOTc1Nn0.4awJdWrrZGtH2b6_Wfv2RsLkqJK6WvN26D6YJHVrwKA';

const { createClient } = window.supabase;
const sbClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── WhatsApp number ──
const WA_NUMBER = '919227096270';

// ════════════════════════════════════════════════
//  CLOUDFLARE WORKER CONFIG
//  Worker 2 kaam kare:
//    1. /upload-media  → GitHub Pages par file upload (PAT server-side safe)
//    2. /send-push     → Web Push notification (VAPID private key safe)
//
//  SETUP:
//  1. workers.cloudflare.com → New Worker → cloudflare-worker.js paste → Deploy
//  2. Worker Settings → Variables → Add:
//       GITHUB_TOKEN      = ghp_xxxx  (PAT: eliitoze/website Contents read+write)
//       VAPID_PRIVATE_KEY = MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQg_BV4o8mdbv32ck5xjLehG623t6tSwAc1Sjz-W8tbbxyhRANCAAQh9_2WhdYe4vPPe6m-MM85s4fQbIOv8j3wSifmG7bDgj50iv0xxv9WKbzhw-2Dk3FZ_RJKlKwvKoHOrEw0QXlo
//       VAPID_PUBLIC_KEY  = BCH3_ZaF1h7i8897qb4wzzmzh9Bsg6_yPfBKJ-YbtsOCPnSK_THG_1YpvOHD7YOTcVn9EkqUrC8qgc6sTDRBeWg
//       ADMIN_SECRET      = Eliitoze@2025
//  3. Worker URL + same password niche paste karo
// ════════════════════════════════════════════════
const WORKER_URL   = 'https://eliitoze-worker.bhkmanish.workers.dev';
const ADMIN_SECRET = 'Eliitoze@2025';

// ── VAPID Public Key (push-handler.js / sw.js ma pan same key use karvo) ──
const VAPID_PUBLIC_KEY = 'BCH3_ZaF1h7i8897qb4wzzmzh9Bsg6_yPfBKJ-YbtsOCPnSK_THG_1YpvOHD7YOTcVn9EkqUrC8qgc6sTDRBeWg';

// ── Export ──
window.sb                = sbClient;
window.WA_NUMBER         = WA_NUMBER;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
window.SUPABASE_JWT_KEY  = SUPABASE_ANON_KEY;
window.WORKER_URL        = WORKER_URL;
window.ADMIN_SECRET      = ADMIN_SECRET;
window.VAPID_PUBLIC_KEY  = VAPID_PUBLIC_KEY;
window.MEDIA_BUCKET      = 'product-media'; // legacy — no longer used for upload
