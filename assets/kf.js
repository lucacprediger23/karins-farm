/* Karin's Farm — shop behaviour: buying, the cart count, header menu, the farm hero, characters.
   Everything still works without this file: the buy forms post to Shopify's cart and go to checkout. */
(() => {
const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(pointer: fine)').matches;
const $ = id => document.getElementById(id);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const CFG = (() => { try { return JSON.parse($('kf-config').textContent); } catch (e) { return {}; } })();
const T = CFG.t || {};
const PREVIEW = CFG.platform === 'preview';

/* ---------- money, the way the store formats it ("{{amount_no_decimals}} lei") ---------- */
function money(cents) {
  const fmt = CFG.money || '{{amount}} lei';
  const n = cents / 100;
  const group = (s, sep) => s.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  const fix = (d, thou, dec) => { const [a, b] = n.toFixed(d).split('.'); return group(a, thou) + (b ? dec + b : ''); };
  return fmt.replace(/\{\{\s*(\w+)\s*\}\}/, (_, k) => ({
    amount: fix(2, ',', '.'), amount_no_decimals: fix(0, ',', '.'),
    amount_with_comma_separator: fix(2, '.', ','), amount_no_decimals_with_comma_separator: fix(0, '.', ','),
    amount_with_apostrophe_separator: fix(2, "'", '.'), amount_with_space_separator: fix(2, ' ', ',')
  }[k] || fix(2, ',', '.')));
}

/* ---------- the cart: Shopify's cart API, or (preview site) this browser ---------- */
const Cart = {
  get() { try { return JSON.parse(localStorage.getItem('kf-cart')) || { qty: 0 }; } catch (e) { return { qty: 0 }; } },
  setLocal(c) { try { localStorage.setItem('kf-cart', JSON.stringify(c)); } catch (e) {} },
  async set(variant, qty, price) {
    if (PREVIEW) { this.setLocal({ variant, qty, price }); return; }
    const r = await fetch('/cart/update.js', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ updates: { [variant]: qty } }) });
    if (!r.ok) throw new Error(r.status);
  }
};
function showCount(n) {
  $$('[data-cart-count]').forEach(el => { el.textContent = n; el.hidden = !n; });
  $$('[data-cart-link]').forEach(a => { if (T.cart_count) a.setAttribute('aria-label', T.cart_count.replace(/\{\{\s*count\s*\}\}/, n)); });
}
if (PREVIEW) showCount(Cart.get().qty || 0);

/* ---------- buy boxes: quantity, total with delivery, straight to checkout ---------- */
$$('[data-buy]').forEach(box => {
  const form = box.querySelector('form'); if (!form) return;
  const price = +box.dataset.price, fee = +box.dataset.fee, freeFrom = +box.dataset.free, variant = box.dataset.variant;
  const input = form.querySelector('.qty-input'), minus = form.querySelector('[data-step="-1"]'), plus = form.querySelector('[data-step="1"]');
  const max = +input.max || 10;
  const totalEl = box.querySelector('[data-total]'), shipEl = box.querySelector('[data-ship]'), freeMsg = box.querySelector('[data-free-msg]');
  const btn = form.querySelector('button[type=submit]');
  const qty = () => clamp(Math.round(+input.value) || 1, 1, max);
  function update() {
    const q = qty(), sub = price * q;
    const free = fee === 0 || (freeFrom > 0 && sub >= freeFrom);
    totalEl.textContent = money(sub + (free ? 0 : fee));
    shipEl.textContent = `${T.shipping || 'Livrare'} ${free ? (T.free || 'gratuită') : money(fee)}`;
    if (freeMsg) {
      freeMsg.classList.toggle('on', free);
      const nextFree = !free && freeFrom > 0 && price * (q + 1) >= freeFrom && q < max;
      freeMsg.hidden = !free && !nextFree;
      freeMsg.querySelector('span').textContent = free ? freeMsg.dataset.got : freeMsg.dataset.more;
    }
    minus.disabled = q <= 1; plus.disabled = q >= max;
  }
  minus.addEventListener('click', () => { input.value = qty() - 1; update(); });
  plus.addEventListener('click', () => { input.value = qty() + 1; update(); });
  input.addEventListener('input', () => { if (input.value !== '') update(); });
  input.addEventListener('change', () => { input.value = qty(); update(); });
  update();
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const q = qty(); input.value = q;
    btn.disabled = true; btn.classList.add('busy');
    try {
      await Cart.set(variant, q, price);
      showCount(q);
      location.href = '/checkout';
    } catch (err) {
      form.submit(); // let Shopify's normal form take over
    }
  });
  addEventListener('pageshow', () => { btn.disabled = false; btn.classList.remove('busy'); });
});

/* ---------- "Comandă" links go to the nearest buy box ---------- */
$$('[data-to-buy]').forEach(a => a.addEventListener('click', e => {
  const boxes = $$('[data-buy]').filter(b => b.offsetParent !== null);
  if (!boxes.length) return;
  e.preventDefault();
  const below = boxes.filter(b => b.getBoundingClientRect().top > 40);
  const best = below.length ? below[0] : boxes[boxes.length - 1];
  best.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  const inp = best.querySelector('.buy-btn'); if (inp) setTimeout(() => inp.focus({ preventScroll: true }), reduce ? 0 : 500);
}));

/* ---------- header: phone menu, solid when scrolled ---------- */
const menuBtn = $('menuBtn'), menu = $('menu');
if (menuBtn && menu) {
  const set = open => {
    menuBtn.setAttribute('aria-expanded', open); menu.classList.toggle('open', open);
    root.classList.toggle('menu-open', open);
    menuBtn.querySelector('.sr-only').textContent = open ? (T.close_menu || 'Close') : (T.menu || 'Menu');
  };
  menuBtn.addEventListener('click', () => set(menuBtn.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && menu.classList.contains('open')) { set(false); menuBtn.focus(); } });
  matchMedia('(min-width: 961px)').addEventListener('change', e => { if (e.matches) set(false); });
}
const head = $('siteHead');
if (head) { const on = () => head.classList.toggle('scrolled', scrollY > 8); addEventListener('scroll', on, { passive: true }); on(); }

/* ---------- sticky order bar on phones: shows once no buy box is on screen ---------- */
const sticky = $('stickyCta');
if (sticky && 'IntersectionObserver' in window) {
  const seen = new Map();
  const upd = () => sticky.classList.toggle('on', ![...seen.values()].some(Boolean) && scrollY > 240);
  const io = new IntersectionObserver(es => { es.forEach(e => seen.set(e.target, e.isIntersecting)); upd(); });
  $$('[data-cta-zone]').forEach(w => io.observe(w));
  addEventListener('scroll', upd, { passive: true });
}

/* ---------- the farm hero: depth, clouds, things to poke, day/night, the box ---------- */
const farm = document.querySelector('[data-farm]');
if (farm) {
  const hero = farm.closest('.farm-hero');
  let mx = 0, tmx = 0, my = 0, tmy = 0, sp = 0, raf = 0, visible = true;
  if (fine && !reduce) hero.addEventListener('pointermove', e => { tmx = (e.clientX / innerWidth - .5) * 2; tmy = (e.clientY / innerHeight - .5) * 2; }, { passive: true });
  // the box: drag to turn, and it sways a little on its own
  const box = farm.querySelector('.box3d'), boxZone = farm.querySelector('[data-box3d]');
  let drag = 0, vel = 0, startX = null, last = 0, base = 0, touched = false;
  if (boxZone) {
    boxZone.addEventListener('pointerdown', e => { startX = e.clientX; last = e.clientX; base = drag; vel = 0; touched = true; boxZone.setPointerCapture(e.pointerId); boxZone.classList.add('grab'); });
    boxZone.addEventListener('pointermove', e => { if (startX === null) return; drag = base + (e.clientX - startX) * .7; vel = (e.clientX - last) * .7; last = e.clientX; });
    const end = () => { startX = null; boxZone.classList.remove('grab'); };
    boxZone.addEventListener('pointerup', end); boxZone.addEventListener('pointercancel', end);
    boxZone.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') { drag -= 20; touched = true; } if (e.key === 'ArrowRight') { drag += 20; touched = true; } });
  }
  const frame = t => {
    raf = 0; if (!visible) return;
    mx += (tmx - mx) * .06; my += (tmy - my) * .06;
    const r = hero.getBoundingClientRect();
    sp = clamp(-r.top / Math.max(1, r.height), 0, 1);
    farm.style.setProperty('--mx', mx.toFixed(4)); farm.style.setProperty('--my', my.toFixed(4)); farm.style.setProperty('--sp', sp.toFixed(4));
    if (box) {
      if (startX === null) { drag += vel; vel *= .92; }
      const sway = reduce ? 0 : Math.sin(t / 1400) * (touched ? 4 : 14);
      box.style.setProperty('--ry', (-24 + sway + drag + mx * 10).toFixed(2) + 'deg');
      box.style.setProperty('--rx', (-6 + my * -4).toFixed(2) + 'deg');
    }
    raf = requestAnimationFrame(frame);
  };
  const go = () => { if (!raf) raf = requestAnimationFrame(frame); };
  if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) go(); }).observe(hero); else go();
  go();

  // the sun painted in the sky is the day/night button: put the button exactly over it
  const orbBtn = farm.querySelector('[data-sky]');
  const placeSun = () => {
    const W = farm.clientWidth, H = farm.clientHeight, k = Math.max(W / 2000, H / 858), S = 1.04;
    const x = W - (1 - .885) * 2000 * k, y = .187 * 858 * k;
    orbBtn.style.setProperty('--sunx', (W / 2 + S * (x - W / 2)).toFixed(1) + 'px');
    orbBtn.style.setProperty('--suny', (H / 2 + S * (y - H / 2)).toFixed(1) + 'px');
    orbBtn.style.setProperty('--sund', (.11 * 2000 * k * S * 1.25).toFixed(1) + 'px');
  };
  if (orbBtn) { placeSun(); addEventListener('resize', placeSun, { passive: true }); }
  if (boxZone) boxZone.addEventListener('pointerdown', () => boxZone.classList.add('turned'), { once: true });
  // things hiding on the farm
  const found = new Set(), foundEl = farm.querySelector('[data-found]'), foundBox = farm.querySelector('.farm-found');
  $$('[data-hide]', farm).forEach(btn => btn.addEventListener('click', () => {
    const prop = btn.closest('.prop'), open = !prop.classList.contains('open');
    prop.classList.toggle('open', open); btn.setAttribute('aria-pressed', open);
    if (btn.classList.contains('doors')) btn.setAttribute('aria-label', open ? (T.barn_close || '') : (T.barn_open || ''));
    if (open) { found.add(btn.dataset.hide); foundEl.textContent = found.size; foundBox.classList.add('counted'); if (found.size === 3) foundBox.classList.add('all'); }
  }));
  // the sun turns day into night (and back)
  const orb = farm.querySelector('[data-sky]');
  orb && orb.addEventListener('click', () => {
    const night = !farm.classList.contains('is-night');
    farm.classList.toggle('is-night', night); orb.setAttribute('aria-pressed', night);
    orb.setAttribute('aria-label', night ? (T.to_day || '') : (T.to_night || ''));
  });
}

/* ---------- characters: one big card at a time, the section takes its colour ---------- */
$$('[data-chars]').forEach(chars => {
  let CHARS = [];
  try { CHARS = JSON.parse(chars.querySelector('.ch-data').textContent); } catch (e) { return; }
  if (!CHARS.length) return;
  const q = s => chars.querySelector(s);
  const chName = q('.ch-name'), chCard = q('.ch-card'), chImg = q('.ch-card img'), prev = q('.ch-side.prev'), next = q('.ch-side.next');
  let ci = 0, busy = false;
  function show(i, first) {
    ci = (i + CHARS.length) % CHARS.length;
    const c = CHARS[ci], p = CHARS[(ci - 1 + CHARS.length) % CHARS.length], n = CHARS[(ci + 1) % CHARS.length];
    const apply = () => {
      chars.style.setProperty('--c', c.c); chars.style.setProperty('--on', c.on || '#fff6e6');
      chName.innerHTML = ''; const s = document.createElement('span'); s.textContent = c.name; chName.appendChild(s);
      chName.style.fontSize = Math.round(Math.min(innerWidth * .8 / (Math.max(c.name.length, 3) * .47), innerHeight * .56, 460)) + 'px';
      chImg.src = c.img; chImg.alt = c.alt || c.name;
      q('.ch-team').textContent = c.team; q('.ch-info').textContent = c.info;
      q('.ch-count').textContent = `${String(ci + 1).padStart(2, '0')} / ${String(CHARS.length).padStart(2, '0')}`;
      prev.querySelector('b').textContent = p.name; next.querySelector('b').textContent = n.name;
      prev.setAttribute('aria-label', `${T.prev || 'Previous'}: ${p.name}`); next.setAttribute('aria-label', `${T.next || 'Next'}: ${n.name}`);
    };
    if (first || reduce) { apply(); return; }
    if (busy) return; busy = true;
    chName.classList.add('out'); chCard.classList.add('swap');
    setTimeout(() => { apply(); const done = () => { chName.classList.remove('out'); chCard.classList.remove('swap'); busy = false; }; chImg.decode ? chImg.decode().then(done, done) : done(); }, 300);
  }
  const warm = () => CHARS.forEach(c => { const im = new Image(); im.src = c.img; });
  if ('IntersectionObserver' in window) { const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { warm(); io.disconnect(); } }, { rootMargin: '600px' }); io.observe(chars); } else warm();
  show(0, true);
  prev.addEventListener('click', () => show(ci - 1)); next.addEventListener('click', () => show(ci + 1));
  addEventListener('keydown', e => {
    if (!root.classList.contains('m-game') && root.classList.contains('gl')) return;
    if (e.target.closest && e.target.closest('input, textarea, select, [data-box3d]')) return;
    const r = chars.getBoundingClientRect(); if (r.top > innerHeight * .5 || r.bottom < innerHeight * .5) return;
    if (e.key === 'ArrowLeft') show(ci - 1); if (e.key === 'ArrowRight') show(ci + 1);
  });
  let sx = null;
  chars.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') sx = e.clientX; });
  chars.addEventListener('pointerup', e => { if (sx === null) return; const d = e.clientX - sx; sx = null; if (Math.abs(d) > 50) show(ci + (d < 0 ? 1 : -1)); });
  if (fine && !reduce) {
    chars.addEventListener('pointermove', e => { const r = chImg.getBoundingClientRect(); chImg.style.setProperty('--ry', clamp(((e.clientX - r.left) / r.width - .5) * 22, -16, 16) + 'deg'); chImg.style.setProperty('--rx', clamp(((e.clientY - r.top) / r.height - .5) * -16, -12, 12) + 'deg'); });
    chars.addEventListener('pointerleave', () => { chImg.style.setProperty('--ry', '0deg'); chImg.style.setProperty('--rx', '0deg'); });
  }
});

/* ---------- product page pictures ---------- */
const pdpMain = $('pdpMain');
$$('.pdp-thumb').forEach(t => t.addEventListener('click', () => {
  if (!pdpMain) return;
  pdpMain.removeAttribute('srcset'); pdpMain.src = t.dataset.src;
  $$('.pdp-thumb').forEach(x => x.classList.toggle('on', x === t));
}));

/* ---------- pictures that lean toward the pointer ---------- */
if (fine && !reduce) $$('[data-tilt]').forEach(zone => {
  const el = zone.querySelector('[data-tilt-target]') || zone.querySelector('img'); if (!el) return;
  zone.addEventListener('pointermove', e => { const r = zone.getBoundingClientRect(); el.style.setProperty('--ry', ((e.clientX - r.left) / r.width - .5) * 18 + 'deg'); el.style.setProperty('--rx', ((e.clientY - r.top) / r.height - .5) * -10 + 'deg'); });
  zone.addEventListener('pointerleave', () => { el.style.removeProperty('--ry'); el.style.removeProperty('--rx'); });
});

/* ---------- preview site: the cart page and the checkout stand-in read this browser's cart ---------- */
if (PREVIEW) {
  const c = Cart.get();
  const cartPage = document.querySelector('[data-preview-cart]');
  if (cartPage) {
    const full = cartPage.querySelector('[data-full]'), empty = cartPage.querySelector('[data-empty]');
    const price = +cartPage.dataset.price, fee = +cartPage.dataset.fee, freeFrom = +cartPage.dataset.free;
    const render = () => {
      const q = Cart.get().qty || 0;
      full.hidden = !q; empty.hidden = !!q;
      if (!q) return;
      cartPage.querySelector('.ci-qty input').value = q;
      cartPage.querySelector('.ci-total').textContent = money(price * q);
      cartPage.querySelector('[data-subtotal]').textContent = money(price * q);
      showCount(q);
    };
    cartPage.querySelector('.ci-qty input').addEventListener('change', e => { const q = clamp(Math.round(+e.target.value) || 0, 0, 10); Cart.setLocal({ ...Cart.get(), qty: q }); render(); });
    cartPage.querySelector('.ci-remove').addEventListener('click', e => { e.preventDefault(); Cart.setLocal({ qty: 0 }); showCount(0); render(); });
    const form = cartPage.querySelector('form');
    form.addEventListener('submit', e => { e.preventDefault(); if (e.submitter && e.submitter.name === 'checkout') location.href = '/checkout'; else render(); });
    render();
  }
  const co = document.querySelector('[data-preview-checkout]');
  if (co) {
    const q = c.qty || 0, price = +co.dataset.price, fee = +co.dataset.fee, freeFrom = +co.dataset.free;
    const sub = price * q, free = fee === 0 || (freeFrom > 0 && sub >= freeFrom);
    co.querySelector('[data-q]').textContent = q;
    co.querySelector('[data-sub]').textContent = money(sub);
    co.querySelector('[data-ship]').textContent = free ? (T.free || 'gratuită') : money(fee);
    co.querySelector('[data-tot]').textContent = money(sub + (free ? 0 : fee));
    co.classList.toggle('is-empty', !q);
  }
}

/* ---------- footer: reopen Shopify's cookie choices ---------- */
$$('[data-cookie-prefs]').forEach(b => {
  const ready = () => window.privacyBanner && typeof window.privacyBanner.showPreferences === 'function';
  const check = () => { if (ready()) b.hidden = false; };
  check(); addEventListener('load', check);
  b.addEventListener('click', () => { if (ready()) window.privacyBanner.showPreferences(); });
});

/* ---------- gentle reveal as sections come in (not with reduced motion) ---------- */
if (!reduce && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -10% 0px' });
  $$('[data-reveal]').forEach(el => { if (el.getBoundingClientRect().top > innerHeight) { el.classList.add('pre'); io.observe(el); } });
}
})();
