// =============================================
// ELIITOZE JEWELZ - Main JavaScript
// =============================================

// ── Cart Utilities ──
function getCart() {
  try { return JSON.parse(localStorage.getItem('eliitoze_cart')) || []; }
  catch(e) { return []; }
}
function saveCart(cart) {
  localStorage.setItem('eliitoze_cart', JSON.stringify(cart));
}
function getCartCount() {
  return getCart().reduce((sum, i) => sum + i.qty, 0);
}
function updateCartBadge() {
  const badges = document.querySelectorAll('.cart-count');
  const count = getCartCount();
  badges.forEach(b => {
    b.textContent = count;
    b.style.display = count > 0 ? 'flex' : 'none';
  });
}

// ── Add to Cart ──
function addToCart(productId) {
  const product = products.find(p => p.id === productId);
  if (!product || product.qty <= 0) return;
  const cart = getCart();
  const existing = cart.find(i => i.id === productId);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.discountPrice > 0 ? product.discountPrice : product.price,
      image: product.image,
      qty: 1
    });
  }
  saveCart(cart);
  updateCartBadge();
  showToast('✨ Added to cart!', 'gold');
}

// ── Toast ──
function showToast(msg, type) {
  let toast = document.getElementById('site-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'site-toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = 'toast' + (type === 'gold' ? ' gold' : '');
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2500);
}

// ── Format Price ──
function formatPrice(n) {
  return '₹' + Number(n).toLocaleString('en-IN');
}

// ── Price HTML ──
function priceHTML(product) {
  if (product.discountPrice > 0) {
    return `<span class="price-original">${formatPrice(product.price)}</span>
            <span class="price-discount">${formatPrice(product.discountPrice)}</span>`;
  }
  return `<span class="price-only">${formatPrice(product.price)}</span>`;
}

// ── Discount % ──
function discountPct(product) {
  if (!product.discountPrice) return 0;
  return Math.round((1 - product.discountPrice / product.price) * 100);
}

// ── Render Shop Products ──
function renderProducts() {
  const grid = document.getElementById('product-grid');
  if (!grid) return;

  if (!products || products.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:#888;">
      <div style="font-size:50px;margin-bottom:16px;">💍</div>
      <h3 style="font-family:'Playfair Display',serif;color:#555;">Products coming soon...</h3>
      <p>Owner will add products shortly.</p>
    </div>`;
    return;
  }

  grid.innerHTML = products.map(p => {
    const finalPrice = p.discountPrice > 0 ? p.discountPrice : p.price;
    const pct = discountPct(p);
    const outOfStock = p.qty <= 0;
    const hasVideo = p.video && p.video !== '';
    const siteUrl = window.location.href.replace(/\/[^/]*$/, '/');

    return `
      <div class="product-card">
        <div class="product-media" onclick="${hasVideo ? `openVideo('${p.video}','${p.name.replace(/'/g, "\\'")}')` : ''}">
          <img src="${p.image}" alt="${p.name}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22300%22><rect fill=%22%23FDF8EE%22 width=%22300%22 height=%22300%22/><text x=%22150%22 y=%22160%22 text-anchor=%22middle%22 font-size=%2260%22>💍</text></svg>'">
          ${hasVideo ? `<div class="play-icon"><div class="play-circle"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div></div>` : ''}
          ${outOfStock ? '<div class="out-of-stock-badge">Out of Stock</div>' : ''}
          ${pct > 0 && !outOfStock ? `<div class="discount-badge">${pct}% OFF</div>` : ''}
        </div>
        <div class="product-info">
          <div class="product-name">${p.name}</div>
          ${p.description ? `<div class="product-desc">${p.description}</div>` : ''}
          <div class="price-row">${priceHTML(p)}</div>
          <button class="add-to-cart-btn" ${outOfStock ? 'disabled' : ''} onclick="addToCart(${p.id})">
            ${outOfStock ? '❌ Out of Stock' : '🛒 Add to Cart'}
          </button>
        </div>
      </div>`;
  }).join('');
}

// ── Video Modal ──
function openVideo(src, name) {
  const modal = document.getElementById('video-modal');
  const video = document.getElementById('modal-video');
  const title = document.getElementById('modal-product-name');
  if (!modal || !video) return;
  video.src = src;
  if (title) title.textContent = name;
  modal.classList.add('active');
  video.play().catch(() => {});
  document.body.style.overflow = 'hidden';
}
function closeVideo() {
  const modal = document.getElementById('video-modal');
  const video = document.getElementById('modal-video');
  if (modal) modal.classList.remove('active');
  if (video) { video.pause(); video.src = ''; }
  document.body.style.overflow = '';
}

// ── Cart Page Logic ──
const FREE_SHIPPING_THRESHOLD = 2000;

function renderCart() {
  const cartContainer = document.getElementById('cart-items');
  const summaryContainer = document.getElementById('cart-summary');
  if (!cartContainer) return;

  const cart = getCart();

  if (cart.length === 0) {
    cartContainer.innerHTML = `
      <div class="cart-empty">
        <div class="empty-icon">🛒</div>
        <h3>Your cart is empty</h3>
        <p>Explore our beautiful jewellery collection</p>
        <a href="index.html">Browse Products</a>
      </div>`;
    if (summaryContainer) summaryContainer.style.display = 'none';
    return;
  }

  cartContainer.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img class="cart-item-img" src="${item.image}" alt="${item.name}"
        onerror="this.outerHTML='<div class=cart-item-img-placeholder>💍</div>'">
      <div>
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">${formatPrice(item.price)} each</div>
        <div style="font-size:13px;color:#888;margin-top:2px;">Subtotal: ${formatPrice(item.price * item.qty)}</div>
      </div>
      <div class="cart-item-actions">
        <div class="qty-control">
          <button class="qty-btn" onclick="changeQty(${item.id},-1)">−</button>
          <span class="qty-num">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty(${item.id},1)">+</button>
        </div>
        <button class="remove-btn" onclick="removeItem(${item.id})">🗑 Remove</button>
      </div>
    </div>`).join('');

  // Summary
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const remaining = FREE_SHIPPING_THRESHOLD - total;
  const pct = Math.min(100, (total / FREE_SHIPPING_THRESHOLD) * 100);

  let shippingMsg = '';
  if (remaining <= 0) {
    shippingMsg = `<div class="shipping-msg free">🎉 Congratulations! You get <strong>Free Shipping</strong></div>`;
  } else {
    shippingMsg = `
      <div class="shipping-msg progress">
        🚚 Add <strong>${formatPrice(remaining)}</strong> more to get <strong>Free Shipping</strong>
        <div class="shipping-progress-bar">
          <div class="shipping-progress-fill" style="width:${pct}%"></div>
        </div>
      </div>`;
  }

  if (summaryContainer) {
    summaryContainer.style.display = 'block';
    summaryContainer.innerHTML = `
      <div class="cart-summary">
        <div class="summary-row"><span>Items (${cart.reduce((s,i)=>s+i.qty,0)})</span><span>${formatPrice(total)}</span></div>
        <div class="summary-row"><span>Shipping</span><span>${remaining <= 0 ? '<span style="color:var(--green);font-weight:700;">FREE</span>' : '<span style="color:#888;">Calculated above</span>'}</span></div>
        <div class="summary-row total"><span>Total</span><span>${formatPrice(total)}</span></div>
        ${shippingMsg}
        <button class="whatsapp-btn" onclick="orderOnWhatsApp()">
          <svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          ORDER ON WHATSAPP
        </button>
      </div>`;
  }
}

function changeQty(id, delta) {
  const cart = getCart();
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    const idx = cart.indexOf(item);
    cart.splice(idx, 1);
  }
  saveCart(cart);
  updateCartBadge();
  renderCart();
}

function removeItem(id) {
  const cart = getCart().filter(i => i.id !== id);
  saveCart(cart);
  updateCartBadge();
  renderCart();
  showToast('Item removed from cart');
}

// ── WhatsApp Order ──
function orderOnWhatsApp() {
  const cart = getCart();
  if (cart.length === 0) { showToast('Cart is empty!'); return; }

  // Get WhatsApp number from localStorage (set by admin) or from products.js
  const waNum = localStorage.getItem('eliitoze_wa_number') || (typeof WHATSAPP_NUMBER !== 'undefined' ? WHATSAPP_NUMBER : '');
  if (!waNum) { alert('WhatsApp number not set. Please contact the shop owner.'); return; }

  const baseUrl = window.location.href.replace('cart.html', 'index.html');
  let msg = 'Hello ELIITOZE JEWELZ 💍\nI want to order these items:\n\n';

  cart.forEach((item, i) => {
    msg += `${i+1}. ${item.name}\n`;
    msg += `   Price: ${formatPrice(item.price)}\n`;
    msg += `   Qty: ${item.qty}\n`;
    msg += `   Subtotal: ${formatPrice(item.price * item.qty)}\n\n`;
  });

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  msg += `Total: ${formatPrice(total)}\n`;
  if (total >= FREE_SHIPPING_THRESHOLD) msg += '🎉 Free Shipping Applied!';

  const url = `https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}

// ── Init on Page Load ──
document.addEventListener('DOMContentLoaded', () => {
  updateCartBadge();

  // Shop page
  if (document.getElementById('product-grid')) renderProducts();

  // Cart page
  if (document.getElementById('cart-items')) renderCart();

  // Modal close on backdrop
  const modal = document.getElementById('video-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeVideo();
    });
  }

  // ESC key close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeVideo();
  });
});
