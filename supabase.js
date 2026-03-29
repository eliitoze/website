// ════════════════════════════════════════════════
//  SUPABASE CONFIG
// ════════════════════════════════════════════════

const SUPABASE_URL = 'https://gyocbotkhoymkjbegkqz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5b2Nib3RraG95bWtqYmVna3F6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NjM3NTYsImV4cCI6MjA5MDAzOTc1Nn0.4awJdWrrZGtH2b6_Wfv2RsLkqJK6WvN26D6YJHVrwKA';

// ── Supabase client ──
const { createClient } = window.supabase;
const sbClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Storage bucket name ──
const MEDIA_BUCKET = 'product-media';

// ── WhatsApp number ──
const WA_NUMBER = '919227096270';

// ── Export for other files ──
window.sb = sbClient;
window.MEDIA_BUCKET = MEDIA_BUCKET;
window.WA_NUMBER = WA_NUMBER;
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
window.SUPABASE_JWT_KEY = SUPABASE_ANON_KEY;
