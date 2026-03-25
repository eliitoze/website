// ════════════════════════════════════════════════
//  SUPABASE CONFIG — eliitoze.netlify.app
//  Replace these values with your own Supabase project credentials
// ════════════════════════════════════════════════

const SUPABASE_URL = 'YOUR_SUPABASE_URL';        // e.g. https://xxxx.supabase.co
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// ── Supabase client (using CDN, no npm needed) ──
const supabase = window.supabase.createClient(https://gyocbotkhoymkjbegkqz.supabase.co, sb_publishable_qTbtpHsIErfEty4dDEZrog_Hxw6cUmv);

// ── Storage bucket name ──
const MEDIA_BUCKET = 'product-media';

// ── WhatsApp number (with country code, no + or spaces) ──
const WA_NUMBER = '919227096270'; // Replace with your WhatsApp number

// ── Export for use in other files ──
window.sb = supabase;
window.MEDIA_BUCKET = MEDIA_BUCKET;
window.WA_NUMBER = WA_NUMBER;
