// ════════════════════════════════════════════════════════════════════
//  Cloudflare Worker — Eliitoze Jewelz
//  Routes:
//    POST /upload-media  → GitHub Pages par file upload
//    POST /send-push     → Web Push notification send
//    POST /db-write      → GitHub JSON (products/settings) + Supabase (push only)
//
//  Environment Variables (Worker Settings → Variables):
//    GITHUB_TOKEN         = ghp_xxxx (PAT: Contents read+write on eliitoze/website)
//    VAPID_PRIVATE_KEY    = (your VAPID private key)
//    VAPID_PUBLIC_KEY     = BM9NNO-...
//    ADMIN_SECRET         = (strong password — same in supabase.js)
//    SUPABASE_URL         = https://gyocbotkhoymkjbegkqz.supabase.co
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

    const url      = new URL(request.url);
    const pathname = url.pathname;

    // ── Push subscription upsert — no auth needed (public browsers) ──
    if (pathname.endsWith('/db-write')) {
      let peek;
      try { peek = await request.clone().json(); } catch { peek = {}; }
      if (peek.table === 'push_subscriptions' && peek.operation === 'upsert') {
        return handleDbWrite(request, env);
      }
      if (peek.table === 'likes') {
        return handleDbWrite(request, env);
      }
    }

    // Auth for all other routes
    const secret = request.headers.get('X-Admin-Secret');
    if (!secret || secret !== env.ADMIN_SECRET) return json({ error: 'Unauthorized' }, 401);

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

  // Auto-detect VAPID private key format: pkcs8 (~138 bytes) or raw (32 bytes)
  const keyBytes = b64ToBytes(privB64);
  let privKey;
  if (keyBytes.length > 40) {
    // PKCS8 format — import directly
    privKey = await crypto.subtle.importKey(
      'pkcs8', keyBytes.buffer,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false, ['sign']
    );
  } else {
    // Raw 32-byte scalar — build JWK
    const rawPub = b64ToBytes(pubB64);
    const jwk = {
      kty: 'EC', crv: 'P-256',
      d:   bytesToB64url(keyBytes),
      x:   bytesToB64url(rawPub.slice(1, 33)),
      y:   bytesToB64url(rawPub.slice(33, 65)),
    };
    privKey = await crypto.subtle.importKey(
      'jwk', jwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false, ['sign']
    );
  }

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
//  DB WRITE — GitHub JSON files (products + settings) + Supabase (push only)
//
//  products / settings → GitHub JSON file read+write (zero Supabase egress)
//  push_subscriptions  → Supabase REST (tiny text data only)
//
//  Supported operations:
//    insert / update / delete / upsert  on table: products
//    upsert                             on table: settings
//    upsert / select                    on table: push_subscriptions (Supabase)
// ═══════════════════════════════════════════════════════════════════

async function handleDbWrite(request, env) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const { operation, table, data, match } = body;

  // ── push_subscriptions → Supabase ────────────────────────────────
  if (table === 'push_subscriptions') {
    return handlePushSubscription(operation, data, env);
  }

  // ── products / settings → GitHub JSON ────────────────────────────
  if (table === 'products') {
    return handleProductsWrite(operation, data, match, env);
  }

  if (table === 'settings') {
    return handleSettingsWrite(data, env);
  }

  if (table === 'likes') {
    return handleLikesWrite(operation, data, env);
  }

  return json({ error: 'Unknown table: ' + table }, 400);
}

// ── GitHub JSON helper: read file ────────────────────────────────
async function ghReadJson(path, env) {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`;
  const res = await fetch(url, {
    headers: {
      'Authorization': 'token ' + env.GITHUB_TOKEN,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Eliitoze-Worker'
    }
  });
  if (!res.ok) {
    if (res.status === 404) return { data: null, sha: null };
    throw new Error('GitHub read failed: ' + res.status);
  }
  const file = await res.json();
  const content = atob(file.content.replace(/\n/g, ''));
  return { data: JSON.parse(content), sha: file.sha };
}

// ── GitHub JSON helper: write file ───────────────────────────────
async function ghWriteJson(path, data, sha, env) {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;
  const body = {
    message: 'Update ' + path,
    content: btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2)))),
    branch: GITHUB_BRANCH
  };
  if (sha) body.sha = sha;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': 'token ' + env.GITHUB_TOKEN,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'Eliitoze-Worker'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error('GitHub write failed: ' + (err.message || res.status));
  }
  return await res.json();
}

// ── Products JSON write ──────────────────────────────────────────
async function handleProductsWrite(operation, data, match, env) {
  try {
    const PATH = 'data/products.json';
    const { data: products, sha } = await ghReadJson(PATH, env);
    let list = Array.isArray(products) ? products : [];

    if (operation === '_init_products') {
      // Bulk init from migration — write entire array as-is
      const initList = Array.isArray(data) ? data : [];
      await ghWriteJson(PATH, initList, sha, env);
      return json({ success: true, count: initList.length });
    }

    if (operation === 'insert') {
      // Auto-generate id
      const maxId = list.reduce((m, p) => Math.max(m, p.id || 0), 0);
      const newProduct = { id: maxId + 1, ...data };
      list.unshift(newProduct); // newest first
      await ghWriteJson(PATH, list, sha, env);
      return json({ success: true, data: newProduct });

    } else if (operation === 'update') {
      if (!match || !match.id) return json({ error: 'match.id required' }, 400);
      const idx = list.findIndex(p => p.id === match.id);
      if (idx === -1) return json({ error: 'Product not found: ' + match.id }, 404);
      list[idx] = { ...list[idx], ...data };
      await ghWriteJson(PATH, list, sha, env);
      return json({ success: true, data: list[idx] });

    } else if (operation === 'delete') {
      if (!match || !match.id) return json({ error: 'match.id required' }, 400);
      const before = list.length;
      list = list.filter(p => p.id !== match.id);
      if (list.length === before) return json({ error: 'Product not found: ' + match.id }, 404);
      await ghWriteJson(PATH, list, sha, env);
      return json({ success: true });

    } else {
      return json({ error: 'operation must be insert | update | delete' }, 400);
    }
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

// ── Settings JSON write ──────────────────────────────────────────
async function handleSettingsWrite(data, env) {
  try {
    const PATH = 'data/settings.json';
    const { data: existing, sha } = await ghReadJson(PATH, env);
    const settings = existing || {};
    const updated = { ...settings, ...data };
    await ghWriteJson(PATH, updated, sha, env);
    return json({ success: true });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

// ── Likes → GitHub JSON ─────────────────────────────────────────
async function handleLikesWrite(operation, data, env) {
  try {
    const PATH = 'data/likes.json';
    const { data: existing, sha } = await ghReadJson(PATH, env);
    const likes = (existing && typeof existing === 'object') ? existing : {};

    if (operation === 'like' || operation === 'unlike') {
      const id = String(data.id);
      const delta = data.delta || (operation === 'like' ? 1 : -1);
      likes[id] = Math.max(0, (likes[id] || 0) + delta);
      await ghWriteJson(PATH, likes, sha, env);
      return json({ success: true, count: likes[id] });
    }

    if (operation === 'select') {
      return json({ success: true, data: likes });
    }

    return json({ error: 'likes supports like | unlike | select' }, 400);
  } catch(err) {
    return json({ error: err.message }, 500);
  }
}

// ── Push subscriptions → Supabase ───────────────────────────────
async function handlePushSubscription(operation, data, env) {
  const sbUrl = env.SUPABASE_URL;
  const sbKey = env.SUPABASE_SERVICE_KEY;
  if (!sbUrl || !sbKey) return json({ error: 'Supabase env not configured' }, 500);

  const baseUrl = sbUrl.replace(/\/$/, '') + '/rest/v1/push_subscriptions';
  const headers = {
    'apikey': sbKey,
    'Authorization': 'Bearer ' + sbKey,
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates,return=minimal'
  };

  if (operation === 'upsert') {
    const res = await fetch(baseUrl + '?on_conflict=endpoint', {
      method: 'POST', headers, body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return json({ error: err.message || 'Supabase upsert failed' }, res.status);
    }
    return json({ success: true });

  } else if (operation === 'select') {
    const res = await fetch(baseUrl + '?select=endpoint,p256dh,auth', {
      headers: { ...headers, 'Prefer': 'return=representation' }
    });
    if (!res.ok) return json({ error: 'Supabase select failed: ' + res.status }, res.status);
    const rows = await res.json();
    return json({ success: true, data: rows });

  } else {
    return json({ error: 'push_subscriptions supports upsert | select' }, 400);
  }
}
