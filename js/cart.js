const CART_KEY = 'ceq-rfq-cart';

function _readCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

function _writeCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

function _dispatch() {
  window.dispatchEvent(new CustomEvent('cart:updated'));
}

export function getCart() {
  return _readCart();
}

export function getCartItem(id) {
  return _readCart().find(item => item.id === id);
}

export function getCartCount() {
  return _readCart().length;
}

export function addToCart(item) {
  const cart = _readCart();
  const idx = cart.findIndex(i => i.id === item.id);
  if (idx >= 0) {
    cart[idx] = { ...cart[idx], ...item };
  } else {
    cart.push(item);
  }
  _writeCart(cart);
  syncBadge();
  _dispatch();
}

export function removeFromCart(id) {
  const cart = _readCart().filter(i => i.id !== id);
  _writeCart(cart);
  syncBadge();
  _dispatch();
}

export function updateQuantity(id, quantity) {
  const cart = _readCart();
  const idx = cart.findIndex(i => i.id === id);
  if (idx >= 0) {
    cart[idx].quantity = Math.max(1, quantity);
    _writeCart(cart);
    syncBadge();
    _dispatch();
  }
}

export function clearCart() {
  _writeCart([]);
  syncBadge();
  _dispatch();
}

export function syncBadge() {
  const count = _readCart().length;
  document.querySelectorAll('[data-rfq-badge]').forEach(el => {
    el.textContent = count;
    el.style.opacity = count > 0 ? '1' : '0';
  });
}
