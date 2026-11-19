/* Karin's Farm — shared page behaviour: header menu, sticky button, characters, waitlist forms. */
(() => {
const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(pointer: fine)').matches;
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const CFG = (() => { try { return JSON.parse($('kf-config').textContent); } catch (e) { return {}; } })();
const T = CFG.t || {};

/* ---------- header: mobile menu ---------- */
const menuBtn = $('menuBtn'), menu = $('menu');
if (menuBtn && menu) {
  const set = open => {
    menuBtn.setAttribute('aria-expanded', open); menu.classList.toggle('open', open);
    root.classList.toggle('menu-open', open);
  };
  menuBtn.addEventListener('click', () => set(menuBtn.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && menu.classList.contains('open')) { set(false); menuBtn.focus(); } });
  matchMedia('(min-width: 961px)').addEventListener('change', e => { if (e.matches) set(false); });
}
const head = $('siteHead');
if (head) {
  const onScroll = () => head.classList.toggle('scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
}

/* ---------- sticky buy/waitlist button: shows once the hero's button has scrolled away ---------- */
const sticky = $('stickyCta');
if (sticky && 'IntersectionObserver' in window) {
  const watch = [...document.querySelectorAll('[data-cta-zone]')];
  const seen = new Map();
  const update = () => { const any = [...seen.values()].some(Boolean); sticky.classList.toggle('on', !any && scrollY > 200); };
  const io = new IntersectionObserver(es => { es.forEach(e => seen.set(e.target, e.isIntersecting)); update(); }, { threshold: 0 });
  watch.forEach(w => io.observe(w));
  addEventListener('scroll', update, { passive: true });
}

/* ---------- characters: one big card at a time, the page takes its colour ---------- */
document.querySelectorAll('[data-chars]').forEach(chars => {
  let CHARS = [];
  try { CHARS = JSON.parse(chars.querySelector('.ch-data').textContent); } catch (e) { return; }
  if (!CHARS.length) return;
  const q = s => chars.querySelector(s);
  const chName = q('.ch-name'), chCard = q('.ch-card'), chImg = q('.ch-card img'), prev = q('.ch-side.prev'), next = q('.ch-side.next');
  let ci = 0, chBusy = false;
  function showChar(i, first) {
    ci = (i + CHARS.length) % CHARS.length;
    const c = CHARS[ci], p = CHARS[(ci - 1 + CHARS.length) % CHARS.length], n = CHARS[(ci + 1) % CHARS.length];
    const apply = () => {
      chars.style.setProperty('--c', c.c); chars.style.setProperty('--on', c.on || '#fff6e6');
      chName.innerHTML = ''; const sp = document.createElement('span'); sp.textContent = c.name; chName.appendChild(sp);
      chName.style.fontSize = Math.round(Math.min(innerWidth * .8 / (Math.max(c.name.length, 3) * .47), innerHeight * .56, 460)) + 'px';
      chImg.src = c.img; chImg.alt = `${c.name} card`;
      q('.ch-team').textContent = c.team; q('.ch-info').textContent = c.info;
      q('.ch-count').textContent = `${String(ci + 1).padStart(2, '0')} / ${String(CHARS.length).padStart(2, '0')}`;
      prev.querySelector('b').textContent = p.name; next.querySelector('b').textContent = n.name;
      prev.setAttribute('aria-label', `${T.prev || 'Previous character'}: ${p.name}`); next.setAttribute('aria-label', `${T.next || 'Next character'}: ${n.name}`);
    };
    if (first || reduce) { apply(); return; }
    if (chBusy) return; chBusy = true;
    chName.classList.add('out'); chCard.classList.add('swap');
    setTimeout(() => {
      apply();
      const done = () => { chName.classList.remove('out'); chCard.classList.remove('swap'); chBusy = false; };
      chImg.decode ? chImg.decode().then(done, done) : done();
    }, 300);
  }
  // warm the cache once the section is near
  const warm = () => CHARS.forEach(c => { const im = new Image(); im.src = c.img; });
  if ('IntersectionObserver' in window) { const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { warm(); io.disconnect(); } }, { rootMargin: '600px' }); io.observe(chars); } else warm();
  showChar(0, true);
  prev.addEventListener('click', () => showChar(ci - 1));
  next.addEventListener('click', () => showChar(ci + 1));
  addEventListener('keydown', e => {
    if (!root.classList.contains('m-game') && root.classList.contains('gl')) return;
    if (e.target.closest && e.target.closest('input, textarea, select')) return;
    const r = chars.getBoundingClientRect();
    if (r.top > innerHeight * .5 || r.bottom < innerHeight * .5) return;
    if (e.key === 'ArrowLeft') showChar(ci - 1); if (e.key === 'ArrowRight') showChar(ci + 1);
  });
  let sx = null;
  chars.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') sx = e.clientX; });
  chars.addEventListener('pointerup', e => { if (sx === null) return; const d = e.clientX - sx; sx = null; if (Math.abs(d) > 50) showChar(ci + (d < 0 ? 1 : -1)); });
  if (fine && !reduce) {
    chars.addEventListener('pointermove', e => {
      const r = chImg.getBoundingClientRect();
      chImg.style.setProperty('--ry', clamp(((e.clientX - r.left) / r.width - .5) * 22, -16, 16) + 'deg');
      chImg.style.setProperty('--rx', clamp(((e.clientY - r.top) / r.height - .5) * -16, -12, 12) + 'deg');
    });
    chars.addEventListener('pointerleave', () => { chImg.style.setProperty('--ry', '0deg'); chImg.style.setProperty('--rx', '0deg'); });
  }
});

/* ---------- the box (and the hero's box) leans toward the pointer ---------- */
if (fine && !reduce) document.querySelectorAll('[data-tilt]').forEach(zone => {
  const el = zone.querySelector('[data-tilt-target]') || zone.querySelector('img');
  if (!el) return;
  zone.addEventListener('pointermove', e => {
    const r = zone.getBoundingClientRect();
    el.style.setProperty('--ry', ((e.clientX - r.left) / r.width - .5) * 18 + 'deg');
    el.style.setProperty('--rx', ((e.clientY - r.top) / r.height - .5) * -10 + 'deg');
  });
  zone.addEventListener('pointerleave', () => { el.style.removeProperty('--ry'); el.style.removeProperty('--rx'); });
});

/* ---------- waitlist forms ----------
   On Shopify the form posts to Shopify's own newsletter list (customer form, tagged "waitlist").
   On the preview site it posts to /api/subscribe. Either way: email + consent only. */
document.querySelectorAll('form.signup').forEach(form => {
  form.noValidate = true;
  const email = form.querySelector('input[type=email]'), consent = form.querySelector('input[name=consent]'), msg = form.querySelector('.form-msg'), btn = form.querySelector('button[type=submit]');
  const say = (text, ok) => { msg.textContent = text; msg.classList.toggle('ok', !!ok); };
  form.addEventListener('submit', async e => {
    const v = email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { e.preventDefault(); say(T.bad_email || 'That email doesn’t look right. Check it and try again.'); email.setAttribute('aria-invalid', 'true'); email.focus(); return; }
    email.removeAttribute('aria-invalid');
    if (consent && !consent.checked) { e.preventDefault(); say(T.need_consent || 'Please tick the box to confirm you agree, then try again.'); consent.focus(); return; }
    if (CFG.platform !== 'preview') { btn.disabled = true; btn.textContent = T.saving || 'Saving…'; return; } // Shopify takes it from here
    e.preventDefault();
    btn.disabled = true; const label = btn.textContent; btn.textContent = T.saving || 'Saving…';
    try {
      const hp = form.querySelector('input[name=website]');
      const r = await fetch('/api/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: v, consent: true, website: hp ? hp.value : '' }) });
      if (!r.ok) throw new Error(r.status);
      say(T.joined || 'You’re on the list. We’ll email you when Karin’s Farm is available.', true);
      form.reset();
      if (form.dataset.next) setTimeout(() => { location.href = form.dataset.next; }, 600);
    } catch (err) {
      say(T.failed || 'Something went wrong and your email wasn’t saved. Please try again in a moment.');
    } finally { btn.disabled = false; btn.textContent = label; }
  });
});

/* ---------- gentle reveal as sections come in (skipped with reduced motion) ---------- */
if (!reduce && 'IntersectionObserver' in window) {
  const els = document.querySelectorAll('[data-reveal]');
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -12% 0px' });
  els.forEach(el => { if (el.getBoundingClientRect().top > innerHeight) { el.classList.add('pre'); io.observe(el); } });
}
})();
