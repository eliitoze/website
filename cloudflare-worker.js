// ════════════════════════════════════════════════════════════════════
//  Cloudflare Worker — Eliitoze Jewelz
//  Routes:
//    POST /upload-media  → GitHub Pages par file upload
//    POST /send-push     → Web Push notification send
//    POST /db-write      → Supabase products INSERT / UPDATE / DELETE
//
//  Environment Variables (Worker Settings → Variables):
//    GITHUB_TOKEN        = ghp_xxxx (PAT: Contents read+write on eliitoze/website)
//    VAPID_PRIVATE_KEY   = (your VAPID private key)
//    VAPID_PUBLIC_KEY    = BM9NNO-kYPRNB_9SC35EG1EYD4hkCVufYHlcF2F51pFxcbnjWwpUQnU9O4BfVMS4zwDAYefDfkidEP1mF39QXTE
//    ADMIN_SECRET        = (strong password — same in supabase.js)
//    SUPABASE_URL        = https://gyocbotkhoymkjbegkqz.supabase.co
//    SUPABASE_SERVICE_KEY = (Supabase Dashboard → Settings → API → service_role key)
// ════════════════════════════════════════════════════════════════════

const GITHUB_OWNER  = 'eliitoze';
const GITHUB_REPO   = 'website';
const GITHUB_BRANCH = 'main';
const GITHUB_BASE   = 'https://eliitoze.github.io/website/media/';

// ── CORS ──────────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Secret',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' }
  });
}

// ── Main handler ──────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (request.method !== 'POST')   return json({ error: 'POST only' }, 405);

    // Auth
    const secret = request.headers.get('X-Admin-Secret');
    if (!secret || secret !== env.ADMIN_SECRET) return json({ error: 'Unauthorized' }, 401);

    const url      = new URL(request.url);
    const pathname = url.pathname;

    // ── Route: /upload-media ────────────────────────────────────────
    if (pathname.endsWith('/upload-media')) {
      let body;
      try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

      const { filename, base64, contentType } = body;
      if (!filename || !base64 || !contentType) {
        return json({ error: 'filename, base64, contentType required' }, 400);
      }

      // Sanitize filename — no path traversal
      const safeName = filename.replace(/[^a-zA-Z0-9._\-\/]/g, '_').replace(/\.\./, '');
      const repoPath = 'media/' + safeName;

      // GitHub Contents API
      const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${repoPath}`;

      // Check if file already exists — need SHA for update
      let existingSha = undefined;
      const checkResp = await fetch(apiUrl, {
        headers: {
          'Authorization': 'token ' + env.GITHUB_TOKEN,
          'Accept':        'application/vnd.github.v3+json',
          'User-Agent':    'Eliitoze-Worker'
        }
      });
      if (checkResp.ok) {
        const existing = await checkResp.json().catch(() => ({}));
        existingSha = existing.sha;
      }

      const uploadBody = {
        message: 'Upload media: ' + safeName,
        content: base64,
        branch:  GITHUB_BRANCH
      };
      if (existingSha) uploadBody.sha = existingSha;

      const ghResp = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': 'token ' + env.GITHUB_TOKEN,
          'Content-Type':  'application/json',
          'Accept':        'application/vnd.github.v3+json',
          'User-Agent':    'Eliitoze-Worker'
        },
        body: JSON.stringify(uploadBody)
      });

      if (!ghResp.ok) {
        const err = await ghResp.json().catch(() => ({}));
        return json({ error: 'GitHub upload failed: ' + (err.message || ghResp.status) }, 502);
      }

      const publicUrl = GITHUB_BASE + safeName;
      return json({ url: publicUrl });
    }

    // ── Route: /send-push ───────────────────────────────────────────
    if (pathname.endsWith('/send-push')) {
      let body;
      try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

      const { subscriptions, payload } = body;
      if (!subscriptions || !payload) {
        return json({ error: 'subscriptions and payload required' }, 400);
      }

      const results = await Promise.allSettled(
        subscriptions.map(sub => sendWebPush(sub, payload, env))
      );

      const sent   = results.filter(r => r.status === 'fulfilled' && r.value).length;
      const failed = results.length - sent;
      return json({ sent, failed, total: results.length });
    }

    // ── Route: /db-write ────────────────────────────────────────────
    if (pathname.endsWith('/db-write')) {
      return handleDbWrite(request, env);
    }

    return json({ error: 'Unknown route. Use /upload-media, /send-push or /db-write' }, 404);
  }
};

// ═══════════════════════════════════════════════════════════════════
//  WEB PUSH (RFC 8291 / RFC 8188 / VAPID)
// ═══════════════════════════════════════════════════════════════════

async function sendWebPush(subscription, payload, env) {
  const { endpoint, p256dh, auth } = subscription;

  try {
    // 1. Encrypt payload
    const encrypted = await encryptPayload(JSON.stringify(payload), p256dh, auth);

    // 2. Build VAPID JWT
    const vapidJwt = await buildVapidJWT(endpoint, env.VAPID_PRIVATE_KEY, env.VAPID_PUBLIC_KEY);

    // 3. Send
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization':   `vapid t=${vapidJwt}, k=${env.VAPID_PUBLIC_KEY}`,
        'Content-Type':    'application/octet-stream',
        'Content-Encoding':'aes128gcm',
        'TTL':             '86400',
      },
      body: encrypted
    });

    // 410/404 = expired subscription (treat as success — caller can clean up)
    return res.status < 400 || res.status === 410 || res.status === 404;
  } catch {
    return false;
  }
}

// ── VAPID JWT (ES256) ─────────────────────────────────────────────
async function buildVapidJWT(endpoint, privB64, pubB64) {
  const origin = new URL(endpoint).origin;
  const exp    = Math.floor(Date.now() / 1000) + 43200; // 12h

  const header = b64url(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const claims = b64url(JSON.stringify({
    aud: origin,
    exp,
    sub: 'mailto:admin@eliitoze.com'
  }));
  const unsigned = `${header}.${claims}`;

  // Import raw VAPID private key (32-byte P-256 scalar)
  const rawPriv = b64ToBytes(privB64);

  // Build JWK from raw private key + public key
  const rawPub = b64ToBytes(pubB64);
  const jwk = {
    kty: 'EC', crv: 'P-256',
    d:   bytesToB64url(rawPriv),
    x:   bytesToB64url(rawPub.slice(1, 33)),
    y:   bytesToB64url(rawPub.slice(33, 65)),
  };

  const privKey = await crypto.subtle.importKey(
    'jwk', jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign']
  );

  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privKey,
    new TextEncoder().encode(unsigned)
  );

  return `${unsigned}.${bytesToB64url(new Uint8Array(sig))}`;
}

// ── AES-128-GCM Payload Encryption (RFC 8291 + RFC 8188) ─────────
async function encryptPayload(plaintext, p256dhB64, authB64) {
  const recipientPubRaw = b64ToBytes(p256dhB64);
  const authSecret      = b64ToBytes(authB64);

  // Generate ephemeral ECDH key pair
  const ephPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']
  );
  const ephPubRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', ephPair.publicKey)
  );

  // Import recipient public key
  const recipientKey = await crypto.subtle.importKey(
    'raw', recipientPubRaw,
    { name: 'ECDH', namedCurve: 'P-256' }, false, []
  );

  // ECDH → shared secret (32 bytes)
  const ecdhBits = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: recipientKey },
      ephPair.privateKey, 256
    )
  );

  // Random 16-byte salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // ── HKDF-SHA-256 key material (RFC 8291 §3.3) ──
  // PRK = HKDF-Extract(auth_secret, ecdh_secret)  info = "WebPush: info\x00" || ua_pub || as_pub
  const keyInfo = concat(
    enc('WebPush: info\x00'),
    recipientPubRaw,
    ephPubRaw
  );
  const prk = await hkdfExtractExpand(authSecret, ecdhBits, keyInfo, 32);

  // CEK = HKDF-Expand(PRK, salt, "Content-Encoding: aes128gcm\x00", 16)
  const cek   = await hkdfExtractExpand(salt, prk, enc('Content-Encoding: aes128gcm\x00'), 16);
  // Nonce = HKDF-Expand(PRK, salt, "Content-Encoding: nonce\x00", 12)
  const nonce = await hkdfExtractExpand(salt, prk, enc('Content-Encoding: nonce\x00'), 12);

  // Encrypt: plaintext + pad delimiter byte (0x02)
  const plainBytes = enc(plaintext);
  const padded = new Uint8Array(plainBytes.length + 1);
  padded.set(plainBytes);
  padded[plainBytes.length] = 2;

  const cekKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, cekKey, padded)
  );

  // ── aes128gcm content (RFC 8188 §2.1) ──
  // Header: salt(16) + rs(4 BE uint32) + idlen(1) + keyid(ephPub 65 bytes)
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096, false);

  return concat(salt, rs, new Uint8Array([65]), ephPubRaw, ciphertext);
}

// ── HKDF helper (Extract+Expand in one step) ─────────────────────
async function hkdfExtractExpand(salt, ikm, info, length) {
  // Extract
  const saltKey = await crypto.subtle.importKey(
    'raw', salt, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const prk = new Uint8Array(await crypto.subtle.sign('HMAC', saltKey, ikm));

  // Expand
  const prkKey = await crypto.subtle.importKey(
    'raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  // T(1) only needed since length ≤ 32
  const t1Input = concat(info, new Uint8Array([1]));
  const t1 = new Uint8Array(await crypto.subtle.sign('HMAC', prkKey, t1Input));
  return t1.slice(0, length);
}

// ── Byte helpers ──────────────────────────────────────────────────
function enc(str)              { return new TextEncoder().encode(str); }
function concat(...arrs)       {
  const out = new Uint8Array(arrs.reduce((s,a)=>s+a.length,0));
  let off = 0; for (const a of arrs) { out.set(a, off); off += a.length; }
  return out;
}
function b64url(str)           { return btoa(str).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,''); }
function bytesToB64url(bytes)  { return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,''); }
function b64ToBytes(b64)       {
  const pad = '='.repeat((4 - b64.length%4)%4);
  const raw = atob(b64.replace(/-/g,'+').replace(/_/g,'/') + pad);
  return new Uint8Array([...raw].map(c=>c.charCodeAt(0)));
}

// ═══════════════════════════════════════════════════════════════════
//  DB WRITE — Supabase REST API (service_role key — RLS bypass)
//  Supports: insert / update / delete on 'products' table
// ═══════════════════════════════════════════════════════════════════

async function handleDbWrite(request, env) {
  const sbUrl = env.SUPABASE_URL;
  const sbKey = env.SUPABASE_SERVICE_KEY;

  if (!sbUrl || !sbKey) {
    return json({ error: 'SUPABASE_URL or SUPABASE_SERVICE_KEY not set in Worker env' }, 500);
  }

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const { operation, table, data, match } = body;
  // operation: 'insert' | 'update' | 'delete'
  // table: 'products' (whitelist only)
  // data: row object (for insert/update)
  // match: { id: 123 } (for update/delete)

  const ALLOWED_TABLES = ['products'];
  if (!ALLOWED_TABLES.includes(table)) {
    return json({ error: 'Table not allowed: ' + table }, 400);
  }

  const baseUrl = sbUrl.replace(/\/$/, '') + '/rest/v1/' + table;
  const headers = {
    'apikey':        sbKey,
    'Authorization': 'Bearer ' + sbKey,
    'Content-Type':  'application/json',
    'Prefer':        'return=representation'
  };

  let apiUrl = baseUrl;
  let method;
  let bodyStr;

  if (operation === 'insert') {
    method  = 'POST';
    bodyStr = JSON.stringify(data);

  } else if (operation === 'update') {
    if (!match || !match.id) return json({ error: 'match.id required for update' }, 400);
    apiUrl  = baseUrl + '?id=eq.' + match.id;
    method  = 'PATCH';
    bodyStr = JSON.stringify(data);

  } else if (operation === 'delete') {
    if (!match || !match.id) return json({ error: 'match.id required for delete' }, 400);
    apiUrl  = baseUrl + '?id=eq.' + match.id;
    method  = 'DELETE';
    headers['Prefer'] = 'return=minimal';

  } else {
    return json({ error: 'operation must be insert | update | delete' }, 400);
  }

  const resp = await fetch(apiUrl, { method, headers, body: bodyStr });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    return json({ error: err.message || 'Supabase error: ' + resp.status }, resp.status);
  }

  const result = operation === 'delete' ? { success: true } : await resp.json().catch(() => ({}));
  return json({ success: true, data: result });
}
