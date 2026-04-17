// ════════════════════════════════════════════════════════
//  Eliitoze Jewelz — AI Chat Widget v1
//  Usage: <script src="chat-widget.js"></script>
//  Place before </body> in index.html
//  Requires: window.WORKER_URL already defined (from supabase.js)
// ════════════════════════════════════════════════════════

(function() {
  'use strict';

  const WORKER_URL = (window.WORKER_URL || 'https://eliitoze-worker.bhkmanish.workers.dev').replace(/\/$/, '');
  const WA_NUMBER  = window.WA_NUMBER || '919227096270';

  // ── Inject styles ──
  const style = document.createElement('style');
  style.textContent = `
    /* ── Chat bubble ── */
    #ej-chat-bubble {
      position: fixed;
      bottom: 24px;
      right: 20px;
      width: 52px;
      height: 52px;
      background: #C9A84C;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 9998;
      box-shadow: 0 4px 16px rgba(0,0,0,0.35);
      transition: transform 0.2s, background 0.2s;
    }
    #ej-chat-bubble:hover { transform: scale(1.08); background: #b8941f; }
    #ej-chat-bubble svg { width: 26px; height: 26px; fill: #000; }
    #ej-chat-bubble .ej-notif {
      position: absolute;
      top: -2px; right: -2px;
      width: 14px; height: 14px;
      background: #e05050;
      border-radius: 50%;
      border: 2px solid #fff;
      display: none;
    }
    #ej-chat-bubble .ej-notif.show { display: block; }

    /* ── Chat window ── */
    #ej-chat-window {
      position: fixed;
      bottom: 86px;
      right: 20px;
      width: 340px;
      max-width: calc(100vw - 24px);
      height: 520px;
      max-height: calc(100vh - 120px);
      background: #111;
      border: 1px solid #2a2a2a;
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      z-index: 9999;
      overflow: hidden;
      transform: scale(0.92) translateY(12px);
      opacity: 0;
      pointer-events: none;
      transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1), opacity 0.18s;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    }
    #ej-chat-window.open {
      transform: scale(1) translateY(0);
      opacity: 1;
      pointer-events: all;
    }

    /* ── Header ── */
    .ej-chat-header {
      background: #C9A84C;
      padding: 12px 14px;
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }
    .ej-chat-avatar {
      width: 36px; height: 36px;
      background: rgba(0,0,0,0.25);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; flex-shrink: 0;
    }
    .ej-chat-header-info { flex: 1; }
    .ej-chat-header-name {
      font-family: 'Montserrat', sans-serif;
      font-size: 13px; font-weight: 600;
      color: #000; letter-spacing: 1px;
    }
    .ej-chat-header-sub {
      font-size: 10px; color: rgba(0,0,0,0.6);
      letter-spacing: 0.5px; margin-top: 1px;
    }
    .ej-chat-close {
      background: none; border: none;
      color: rgba(0,0,0,0.6); font-size: 20px;
      cursor: pointer; line-height: 1; padding: 4px;
    }
    .ej-chat-close:hover { color: #000; }

    /* ── Messages area ── */
    .ej-messages {
      flex: 1;
      overflow-y: auto;
      padding: 14px 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      scroll-behavior: smooth;
    }
    .ej-messages::-webkit-scrollbar { width: 4px; }
    .ej-messages::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 2px; }

    /* ── Message bubbles ── */
    .ej-msg {
      max-width: 85%;
      font-size: 13px;
      line-height: 1.5;
      padding: 9px 12px;
      border-radius: 12px;
      word-break: break-word;
    }
    .ej-msg.bot {
      background: #1e1e1e;
      color: #e8e0d0;
      align-self: flex-start;
      border-bottom-left-radius: 3px;
    }
    .ej-msg.user {
      background: #C9A84C;
      color: #000;
      align-self: flex-end;
      border-bottom-right-radius: 3px;
      font-weight: 500;
    }
    .ej-msg.typing {
      background: #1e1e1e;
      align-self: flex-start;
      padding: 12px 16px;
    }
    .ej-typing-dots { display: flex; gap: 4px; align-items: center; }
    .ej-typing-dots span {
      width: 6px; height: 6px;
      background: #C9A84C;
      border-radius: 50%;
      animation: ejDot 1.2s infinite;
    }
    .ej-typing-dots span:nth-child(2) { animation-delay: 0.2s; }
    .ej-typing-dots span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes ejDot {
      0%,60%,100% { transform: translateY(0); opacity: 0.4; }
      30% { transform: translateY(-5px); opacity: 1; }
    }

    /* ── Product cards ── */
    .ej-products {
      display: flex;
      flex-direction: column;
      gap: 8px;
      align-self: flex-start;
      width: 100%;
      max-width: 280px;
    }
    .ej-product-card {
      background: #1a1a1a;
      border: 1px solid #2a2a2a;
      border-radius: 10px;
      overflow: hidden;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px;
      cursor: pointer;
      transition: border-color 0.2s;
    }
    .ej-product-card:hover { border-color: #C9A84C; }
    .ej-product-card img {
      width: 52px; height: 52px;
      object-fit: cover;
      border-radius: 6px;
      flex-shrink: 0;
      background: #222;
    }
    .ej-product-info { flex: 1; min-width: 0; }
    .ej-product-name {
      font-size: 11px;
      color: #e8e0d0;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      letter-spacing: 0.3px;
    }
    .ej-product-price {
      font-size: 12px;
      color: #C9A84C;
      font-weight: 600;
      margin-top: 2px;
    }
    .ej-product-orig {
      font-size: 10px;
      color: #666;
      text-decoration: line-through;
      margin-left: 4px;
    }
    .ej-product-wa {
      background: #25D366;
      border: none;
      border-radius: 6px;
      padding: 5px 8px;
      font-size: 10px;
      color: #fff;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      flex-shrink: 0;
      letter-spacing: 0.5px;
    }
    .ej-product-wa:hover { background: #1db954; }

    /* ── Quick replies ── */
    .ej-quick-replies {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-self: flex-start;
    }
    .ej-qr-btn {
      background: transparent;
      border: 1px solid #C9A84C;
      color: #C9A84C;
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 11px;
      cursor: pointer;
      letter-spacing: 0.5px;
      transition: all 0.15s;
    }
    .ej-qr-btn:hover { background: #C9A84C; color: #000; }

    /* ── Input area ── */
    .ej-chat-input-wrap {
      padding: 10px 12px;
      border-top: 1px solid #1e1e1e;
      display: flex;
      gap: 8px;
      align-items: flex-end;
      flex-shrink: 0;
      background: #111;
    }
    .ej-chat-input {
      flex: 1;
      background: #1a1a1a;
      border: 1px solid #2a2a2a;
      border-radius: 20px;
      padding: 9px 14px;
      font-size: 13px;
      color: #e8e0d0;
      outline: none;
      resize: none;
      min-height: 36px;
      max-height: 90px;
      line-height: 1.4;
      font-family: inherit;
    }
    .ej-chat-input::placeholder { color: #555; }
    .ej-chat-input:focus { border-color: #C9A84C; }
    .ej-chat-send {
      width: 36px; height: 36px;
      background: #C9A84C;
      border: none;
      border-radius: 50%;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      transition: background 0.15s, transform 0.1s;
    }
    .ej-chat-send:hover { background: #b8941f; }
    .ej-chat-send:active { transform: scale(0.93); }
    .ej-chat-send svg { width: 16px; height: 16px; fill: #000; }
    .ej-chat-send:disabled { opacity: 0.4; cursor: not-allowed; }

    /* ── Powered by ── */
    .ej-powered {
      text-align: center;
      font-size: 9px;
      color: #333;
      padding: 4px 0 8px;
      letter-spacing: 1px;
    }
  `;
  document.head.appendChild(style);

  // ── Build HTML ──
  const bubble = document.createElement('div');
  bubble.id = 'ej-chat-bubble';
  bubble.innerHTML = `
    <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>
    <div class="ej-notif" id="ej-notif"></div>
  `;

  const win = document.createElement('div');
  win.id = 'ej-chat-window';
  win.innerHTML = `
    <div class="ej-chat-header">
      <div class="ej-chat-avatar">💎</div>
      <div class="ej-chat-header-info">
        <div class="ej-chat-header-name">ELIITOZE JEWELZ</div>
        <div class="ej-chat-header-sub">AI Assistant · Typically replies instantly</div>
      </div>
      <button class="ej-chat-close" id="ej-close">✕</button>
    </div>
    <div class="ej-messages" id="ej-messages"></div>
    <div class="ej-chat-input-wrap">
      <textarea class="ej-chat-input" id="ej-input" placeholder="Ask about jewellery..." rows="1"></textarea>
      <button class="ej-chat-send" id="ej-send">
        <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
      </button>
    </div>
    <div class="ej-powered">Powered by Claude AI</div>
  `;

  document.body.appendChild(bubble);
  document.body.appendChild(win);

  // ── State ──
  let isOpen    = false;
  let isTyping  = false;
  let history   = [];
  let hasOpened = false;

  const messagesEl = document.getElementById('ej-messages');
  const inputEl    = document.getElementById('ej-input');
  const sendBtn    = document.getElementById('ej-send');
  const notifDot   = document.getElementById('ej-notif');

  // ── Welcome message ──
  function showWelcome() {
    addBotMessage('નમસ્તે! 🙏 Eliitoze Jewelz ma swagat chhe!\n\nHun tamne jewellery dhundhvama, product ni mahiti aapvama, ne order karvama madad kari shakis.\n\nShu joiye chhe aapne?');
    setTimeout(() => {
      addQuickReplies([
        '925 Silver jwellery',
        'Imitation jwellery',
        'Delivery info',
        'Price range jova'
      ]);
    }, 400);
  }

  // ── Toggle window ──
  bubble.addEventListener('click', () => {
    isOpen = !isOpen;
    win.classList.toggle('open', isOpen);
    if (isOpen) {
      notifDot.classList.remove('show');
      if (!hasOpened) { hasOpened = true; showWelcome(); }
      setTimeout(() => inputEl.focus(), 250);
    }
  });

  document.getElementById('ej-close').addEventListener('click', () => {
    isOpen = false;
    win.classList.remove('open');
  });

  // ── Add messages ──
  function addUserMessage(text) {
    const div = document.createElement('div');
    div.className = 'ej-msg user';
    div.textContent = text;
    messagesEl.appendChild(div);
    scrollBottom();
  }

  function addBotMessage(text) {
    const div = document.createElement('div');
    div.className = 'ej-msg bot';
    div.textContent = text;
    messagesEl.appendChild(div);
    scrollBottom();
    return div;
  }

  function addTypingIndicator() {
    const div = document.createElement('div');
    div.className = 'ej-msg typing';
    div.id = 'ej-typing';
    div.innerHTML = '<div class="ej-typing-dots"><span></span><span></span><span></span></div>';
    messagesEl.appendChild(div);
    scrollBottom();
  }

  function removeTypingIndicator() {
    const t = document.getElementById('ej-typing');
    if (t) t.remove();
  }

  function addProductCards(products) {
    if (!products?.length) return;
    const wrap = document.createElement('div');
    wrap.className = 'ej-products';
    products.forEach(p => {
      const price = (p.discount_price && p.discount_price < p.price) ? p.discount_price : p.price;
      const hasDisc = p.discount_price && p.discount_price < p.price;
      const card = document.createElement('div');
      card.className = 'ej-product-card';
      card.innerHTML = `
        <img src="${p.image_url || ''}" alt="${p.name}" onerror="this.style.display='none'" />
        <div class="ej-product-info">
          <div class="ej-product-name">${p.name}</div>
          <div class="ej-product-price">
            ₹${price.toLocaleString('en-IN')}
            ${hasDisc ? `<span class="ej-product-orig">₹${p.price.toLocaleString('en-IN')}</span>` : ''}
          </div>
        </div>
        <button class="ej-product-wa" data-pid="${p.id}" data-name="${p.name.replace(/"/g, '')}">Order</button>
      `;
      // Click card → open product on main site
      card.addEventListener('click', e => {
        if (e.target.classList.contains('ej-product-wa')) return;
        window.location.href = `index.html?product=${p.id}`;
      });
      // WhatsApp order button
      card.querySelector('.ej-product-wa').addEventListener('click', e => {
        e.stopPropagation();
        const msg = encodeURIComponent(`Hello Eliitoze Jewelz,\nMane aa product ma interest chhe:\n\n${p.name} — ₹${price}\nhttps://eliitoze.github.io/website/?product=${p.id}\n\nPlease details aapso.`);
        window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, '_blank');
      });
      wrap.appendChild(card);
    });
    messagesEl.appendChild(wrap);
    scrollBottom();
  }

  function addQuickReplies(options) {
    const wrap = document.createElement('div');
    wrap.className = 'ej-quick-replies';
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'ej-qr-btn';
      btn.textContent = opt;
      btn.addEventListener('click', () => {
        wrap.remove();
        sendMessage(opt);
      });
      wrap.appendChild(btn);
    });
    messagesEl.appendChild(wrap);
    scrollBottom();
  }

  function scrollBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  // ── Send message ──
  async function sendMessage(text) {
    text = text.trim();
    if (!text || isTyping) return;

    addUserMessage(text);
    history.push({ role: 'user', content: text });

    inputEl.value = '';
    inputEl.style.height = 'auto';
    isTyping = true;
    sendBtn.disabled = true;

    addTypingIndicator();

    try {
      const res = await fetch(`${WORKER_URL}/ai-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: history.slice(-8) }),
      });

      removeTypingIndicator();

      if (!res.ok) throw new Error('Server error ' + res.status);
      const data = await res.json();

      const reply = data.reply || 'Sorry, please try again.';
      addBotMessage(reply);
      history.push({ role: 'assistant', content: reply });

      if (data.products?.length) {
        setTimeout(() => addProductCards(data.products), 300);
      }

      // Show notification if window is closed
      if (!isOpen) {
        notifDot.classList.add('show');
      }

    } catch(err) {
      removeTypingIndicator();
      addBotMessage('Maafi chahu, abhi connection problem chhe. Please WhatsApp par contact karo: wa.me/' + WA_NUMBER);
    }

    isTyping = false;
    sendBtn.disabled = false;
    setTimeout(() => inputEl.focus(), 100);
  }

  // ── Input handlers ──
  sendBtn.addEventListener('click', () => sendMessage(inputEl.value));

  inputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputEl.value);
    }
  });

  // Auto-resize textarea
  inputEl.addEventListener('input', () => {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 90) + 'px';
  });

  // Show notif dot after 45s if user hasn't opened
  setTimeout(() => {
    if (!hasOpened) {
      notifDot.classList.add('show');
    }
  }, 45000);

})();
