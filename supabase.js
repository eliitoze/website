// ════════════════════════════════════════════════
//  SUPABASE CONFIG
// ════════════════════════════════════════════════

const SUPABASE_URL = 'https://gyocbotkhoymkjbegkqz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_qTbtpHsIErfEty4dDEZrog_Hxw6cUmv';

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