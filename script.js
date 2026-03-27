// ════════════════════════════════════════════════
//  CART UTILITIES — shared across all pages
// ════════════════════════════════════════════════

const CART_KEY = 'eliitoze_cart';

function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCount();
}

function addToCart(product) {
  const cart = getCart();
  const idx = cart.findIndex(i => i.id === product.id);
  if (idx > -1) {
    cart[idx].qty += 1;
  } else {
    cart.push({ ...product, qty: 1 });
  }
  saveCart(cart);
}

function updateCartCount() {
  const count = getCart().reduce((s, i) => s + i.qty, 0);
  document.querySelectorAll('.cart-count').forEach(el => {
    el.textContent = count;
    el.style.display = count > 0 ? 'flex' : 'none';
  });
}

function cartTotal() {
  return getCart().reduce((s, i) => s + (i.display_price * i.qty), 0);
}

function showToast(msg, duration = 2000) {
  let t = document.querySelector('.toast');
  if (!t) {
    t = document.createElement('div');
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), duration);
}

function formatPrice(n) {
  return '₹' + Number(n).toLocaleString('en-IN');
}

// Init count on page load
document.addEventListener('DOMContentLoaded', updateCartCount);
