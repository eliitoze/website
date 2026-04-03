// ════════════════════════════════════════════════
//  SUPABASE CONFIG — Eliitoze Jewelz
// ════════════════════════════════════════════════
const SUPABASE_URL      = 'https://gyocbotkhoymkjbegkqz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5b2Nib3RraG95bWtqYmVna3F6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NjM3NTYsImV4cCI6MjA5MDAzOTc1Nn0.4awJdWrrZGtH2b6_Wfv2RsLkqJK6WvN26D6YJHVrwKA';
const WORKER_URL        = 'https://eliitoze-worker.bhkmanish.workers.dev';
const ADMIN_SECRET      = 'Eliitoze@2025';
const WA_NUMBER         = '919227096270';

// Supabase client — CDN loads before this file on all pages
const sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Globals
window.sb                = sbClient;
window.WA_NUMBER         = WA_NUMBER;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
window.SUPABASE_JWT_KEY  = SUPABASE_ANON_KEY;
window.WORKER_URL        = WORKER_URL;
window.ADMIN_SECRET      = ADMIN_SECRET;
window.MEDIA_BUCKET      = 'product-media';
