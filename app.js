/* Karin's Farm — the story as a film.
   One WebGL canvas: scrolling moves a camera through illustrated panels; panels dissolve in an
   ink wipe; a few moments wait for the reader to press and hold. Without WebGL (or with reduced
   motion) the same story reads as a plain illustrated page. */
(() => {
const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(pointer: fine)').matches;
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));

/* =================================================================== the game page */
const CHARS = [
  { id: 'fox', name: 'Fox', team: 'Wild Animal', c: '#c8402d', on: '#fff6e6', info: 'Wakes up at night with the other Wild Animals to choose who gets the trouble. By day, acts innocent.' },
  { id: 'hobbit', name: 'Hobbit', team: 'Healer', c: '#1d7a90', on: '#fff6e6', info: 'Each night he protects one player. If the Wild Animals chose them, they’re safe. Nobody knows his face.' },
  { id: 'blu', name: 'Blu', team: 'Detective', c: '#b8520c', on: '#fff6e6', info: 'Each night she investigates one player. The Narrator tells her if she found a Wild Animal.' },
  { id: 'karin', name: 'Karin', team: 'Narrator', c: '#b8327e', on: '#fff6e6', info: 'Runs the game. Each morning she tells the farm what happened in the night, with her Secret Cookbook.' },
  { id: 'raccoon', name: 'Raccoon', team: 'Prankster', c: '#8a6a00', on: '#fff6e6', info: 'Not a bad guy. Each night he pranks someone: the next day they can’t talk, or can’t vote.' },
  { id: 'chicken', name: 'Chicken', team: 'Farm animal', c: '#087a40', on: '#fff6e6', info: 'One of the good guys. No special power: watch, talk and vote to find the Wild Animals.' },
  { id: 'wolf', name: 'Wolf', team: 'Wild Animal', c: '#a8352b', on: '#fff6e6', info: 'A Wild Animal in disguise. When Blu investigates him, he always looks innocent.' }
];
const chars = $('characters');
let ci = 0, chBusy = false;
const chName = $('chName'), chCard = $('chCard'), chImg = $('chImg');
function showChar(i, first) {
  ci = (i + CHARS.length) % CHARS.length;
  const c = CHARS[ci], p = CHARS[(ci - 1 + CHARS.length) % CHARS.length], n = CHARS[(ci + 1) % CHARS.length];
  const apply = () => {
    chars.style.setProperty('--c', c.c); chars.style.setProperty('--on', c.on);
    chName.innerHTML = `<span>${c.name}</span>`;
    chName.style.fontSize = Math.round(Math.min(innerWidth * .8 / (c.name.length * .47), innerHeight * .56, 460)) + 'px';
    chImg.src = `img/cards/${c.id}.webp`; chImg.alt = `${c.name} card`;
    $('chTeam').textContent = c.team; $('chInfo').textContent = c.info;
    $('chCount').textContent = `${String(ci + 1).padStart(2, '0')} / ${String(CHARS.length).padStart(2, '0')}`;
    $('chPrev').querySelector('b').textContent = p.name; $('chNext').querySelector('b').textContent = n.name;
    $('chPrev').setAttribute('aria-label', `Previous character: ${p.name}`); $('chNext').setAttribute('aria-label', `Next character: ${n.name}`);
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
CHARS.forEach(c => { const im = new Image(); im.src = `img/cards/${c.id}.webp`; });
showChar(0, true);
$('chPrev').addEventListener('click', () => showChar(ci - 1));
$('chNext').addEventListener('click', () => showChar(ci + 1));
addEventListener('keydown', e => {
  if (!root.classList.contains('m-game') && root.classList.contains('gl')) return;
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
  const box = document.querySelector('#boxShot img');
  $('boxShot').addEventListener('pointermove', e => {
    const r = box.getBoundingClientRect();
    box.style.setProperty('--ry', ((e.clientX - r.left) / r.width - .5) * 18 + 'deg');
    box.style.setProperty('--rx', ((e.clientY - r.top) / r.height - .5) * -10 + 'deg');
  });
  $('boxShot').addEventListener('pointerleave', () => { box.style.removeProperty('--ry'); box.style.removeProperty('--rx'); });
}

/* waitlist: saved by /api/subscribe (email + consent only) */
const form = $('signup');
form.addEventListener('submit', async e => {
  e.preventDefault();
  const msg = $('formMsg'), btn = form.querySelector('button[type=submit]'), email = form.email.value.trim();
  msg.classList.remove('ok');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { msg.textContent = 'That email doesn’t look right. Check it and try again.'; form.email.setAttribute('aria-invalid', 'true'); form.email.focus(); return; }
  form.email.removeAttribute('aria-invalid');
  if (!form.consent.checked) { msg.textContent = 'Please tick the box to confirm you agree, then try again.'; form.consent.focus(); return; }
  btn.disabled = true; const label = btn.textContent; btn.textContent = 'Saving…';
  try {
    const r = await fetch('/api/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, consent: true, website: form.website.value }) });
    if (!r.ok) throw new Error(r.status);
    msg.textContent = 'You’re on the list. We’ll email you when Karin’s Farm is available.'; msg.classList.add('ok');
    form.reset();
  } catch (err) {
    msg.textContent = 'Something went wrong and your email wasn’t saved. Please try again in a moment.';
  } finally { btn.disabled = false; btn.textContent = label; }
});

/* =================================================================== the story */
const scenes = [...document.querySelectorAll('#story article')].map((a, i) => ({
  i, kind: a.dataset.kind || 'panel', key: a.dataset.img, src: a.querySelector('img').getAttribute('src'),
  bg: hex(a.dataset.bg || '#f3ead6'), tilt: +(a.dataset.tilt || 0), cap: a.dataset.cap || 'bl', rain: +(a.dataset.rain || 0), wind: +(a.dataset.wind || 0),
  hold: a.dataset.hold || null, holdLabel: a.dataset.holdLabel || 'Hold', doneText: a.dataset.done || '', big: a.dataset.big || '',
  size: +(a.dataset.size || 1), k: (a.querySelector('.k') || {}).textContent || '', t: (a.querySelector('.t') || {}).textContent || '',
  insets: (a.dataset.insets || '').split(',').filter(Boolean), pop: a.dataset.pop || null, video: a.dataset.video || null, world: !!a.dataset.world, photo: a.dataset.photo || null, photoLabel: a.dataset.photoLabel || '', photoPos: a.dataset.photoPos || 'br',
  finished: !a.dataset.hold, hp: 0, doneAt: -1, seed: Math.random() * 10
}));
const N = scenes.length;
// a page with close-ups stays put for longer while they float up over it
const IN_GAP = .55, IN_LEN = 1.15;
const inStart = s => s.hold ? .3 : -.25;
let acc = 0; scenes.forEach(s => {
  const n = s.insets.length;
  s.beats = 1 + (n ? Math.max(0, inStart(s) + (n - 1) * IN_GAP + IN_LEN - .35) : 0);
  s.t0 = acc; acc += s.beats;
});
const LAST = scenes[N - 1].t0;
const STOPS = []; scenes.forEach(s => { STOPS.push(s.t0); if (s.beats > 1.2) STOPS.push(s.t0 + (s.beats - 1) / 2, s.t0 + s.beats - 1); });
const dOf = (s, p) => { const u = p - s.t0; return u <= 0 ? u : Math.max(0, u - (s.beats - 1)); };
const sceneAt = p => { let r = scenes[0]; for (const s of scenes) if (s.t0 <= p + 1e-6) r = s; return r; };
const away = (s, p) => p < s.t0 ? s.t0 - p : Math.max(0, p - (s.t0 + s.beats - 1));

const canvas = $('gl');
const opts = { alpha: true, premultipliedAlpha: true, antialias: true, powerPreference: 'high-performance' };
let gl = null, isGL2 = false;
if (!reduce) { gl = canvas.getContext('webgl2', opts); isGL2 = !!gl; if (!gl) gl = canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts); }
if (!gl) return;  // the plain illustrated story stays

root.classList.add('gl', 'm-story');
const stage = $('stage'), bar = $('bar');
const navLinks = [...document.querySelectorAll('.nav a')];

/* ---------- tiny matrix kit (column-major) ---------- */
const M = {
  id() { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; },
  mul(a, b) { const o = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; },
  T(x, y, z) { const m = M.id(); m[12] = x; m[13] = y; m[14] = z; return m; },
  S(x, y) { const m = M.id(); m[0] = x; m[5] = y; return m; },
  RX(a) { const c = Math.cos(a), s = Math.sin(a), m = M.id(); m[5] = c; m[6] = s; m[9] = -s; m[10] = c; return m; },
  RY(a) { const c = Math.cos(a), s = Math.sin(a), m = M.id(); m[0] = c; m[2] = -s; m[8] = s; m[10] = c; return m; },
  RZ(a) { const c = Math.cos(a), s = Math.sin(a), m = M.id(); m[0] = c; m[1] = s; m[4] = -s; m[5] = c; return m; },
  persp(f, asp, n, fa) { const t = 1 / Math.tan(f / 2), m = new Float32Array(16); m[0] = t / asp; m[5] = t; m[10] = (fa + n) / (n - fa); m[11] = -1; m[14] = 2 * fa * n / (n - fa); return m; },
  look(e, c) {
    let z = [e[0] - c[0], e[1] - c[1], e[2] - c[2]]; let l = Math.hypot(...z); z = z.map(v => v / l);
    let x = [z[2], 0, -z[0]]; l = Math.hypot(...x); x = x.map(v => v / l);      // up = (0,1,0)
    const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
    const m = M.id();
    m[0] = x[0]; m[4] = x[1]; m[8] = x[2]; m[1] = y[0]; m[5] = y[1]; m[9] = y[2]; m[2] = z[0]; m[6] = z[1]; m[10] = z[2];
    m[12] = -(x[0] * e[0] + x[1] * e[1] + x[2] * e[2]); m[13] = -(y[0] * e[0] + y[1] * e[1] + y[2] * e[2]); m[14] = -(z[0] * e[0] + z[1] * e[1] + z[2] * e[2]);
    return m;
  },
  xf(m, v) { return [0, 1, 2, 3].map(r => m[r] * v[0] + m[4 + r] * v[1] + m[8 + r] * v[2] + m[12 + r] * v[3]); },
  inv(m) {
    const o = new Float32Array(16);
    const [a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, a30, a31, a32, a33] = m;
    const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11,
      b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12, b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30,
      b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
    let d = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06; if (!d) return o; d = 1 / d;
    o[0] = (a11 * b11 - a12 * b10 + a13 * b09) * d; o[1] = (a02 * b10 - a01 * b11 - a03 * b09) * d; o[2] = (a31 * b05 - a32 * b04 + a33 * b03) * d; o[3] = (a22 * b04 - a21 * b05 - a23 * b03) * d;
    o[4] = (a12 * b08 - a10 * b11 - a13 * b07) * d; o[5] = (a00 * b11 - a02 * b08 + a03 * b07) * d; o[6] = (a32 * b02 - a30 * b05 - a33 * b01) * d; o[7] = (a20 * b05 - a22 * b02 + a23 * b01) * d;
    o[8] = (a10 * b10 - a11 * b08 + a13 * b06) * d; o[9] = (a01 * b08 - a00 * b10 - a03 * b06) * d; o[10] = (a30 * b04 - a31 * b02 + a33 * b00) * d; o[11] = (a21 * b02 - a20 * b04 - a23 * b00) * d;
    o[12] = (a11 * b07 - a10 * b09 - a12 * b06) * d; o[13] = (a00 * b09 - a01 * b07 + a02 * b06) * d; o[14] = (a31 * b01 - a30 * b03 - a32 * b00) * d; o[15] = (a20 * b03 - a21 * b01 + a22 * b00) * d;
    return o;
  }
};

/* ---------- shader ---------- */
const VS = `attribute vec2 aP; uniform mat4 uM; varying vec2 vUv;
void main(){ vUv = vec2(aP.x + .5, .5 - aP.y); gl_Position = uM * vec4(aP, 0., 1.); }`;
const FS = `precision mediump float;
varying vec2 vUv;
uniform sampler2D uT; uniform float uMode, uA, uW, uB, uSeed, uTime, uC; uniform vec4 uL, uG, uIM; uniform vec3 uK;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h(i), h(i + vec2(1., 0.)), f.x), mix(h(i + vec2(0., 1.)), h(i + vec2(1., 1.)), f.x), f.y); }
const vec3 INK = vec3(.082, .071, .059);
void main(){
  vec2 uv = vUv;
  float e = min(min(uv.x, 1. - uv.x), min(uv.y, 1. - uv.y));
  if (uMode > 1.5 && uMode < 2.5) { float s = smoothstep(0., .07, e) * uA * .34; gl_FragColor = vec4(INK * s, s); return; }
  if (uMode > 3.5) {                      // soft shadow cast by a cut-out
    float sa = texture2D(uT, uv, 2.5).a * uA * .3;
    gl_FragColor = vec4(INK * sa, sa); return;
  }
  if (uMode > 2.5) {                      // the world behind a page: its own picture, soft and far away
    vec3 w = texture2D(uT, uv, 4.5).rgb;
    w = mix(w, uK, .3) * (.94 + .06 * n(uv * 3. + uTime * .05));
    float v = smoothstep(0., .3, e) * smoothstep(0., .3, e) * uA;
    gl_FragColor = vec4(w * v, v); return;
  }
  vec2 iu = uIM.xy + uv * uIM.zw;          // where this point of the window looks into the picture
  vec4 tx = texture2D(uT, iu);
  float a = 1.; vec3 c = tx.rgb;
  if (uMode > .5) { a = tx.a; c = tx.a > .001 ? tx.rgb / tx.a : vec3(0.); }
  if (uC < .999) {                        // colour floods into the ink drawing as the page arrives
    float lum = dot(c, vec3(.3, .59, .11));
    vec3 inked = mix(INK, vec3(.98, .95, .88), smoothstep(.16, .62, lum));
    float s = n(iu * 5. + uSeed) * .7 + n(iu * 19. - uSeed) * .3;
    float k = smoothstep(uC * 1.3 - .2, uC * 1.3 - .08, s);
    c = mix(c, inked, k);
  }
  if (uG.w > -.5) {                       // the light bulb: dark until the idea comes
    float d = distance(iu, uG.xy);
    c = mix(c, c * vec3(.38, .4, .5), (1. - uG.w) * smoothstep(uG.z * .55, uG.z * .2, d));
    c += vec3(1., .8, .4) * uG.w * smoothstep(uG.z * 2.6, 0., d) * .6;
  }
  if (uL.w > .001) {                      // the lantern
    float d = distance(iu, uL.xy) + (n(iu * 28. + uTime * .6) - .5) * .012;
    float l = smoothstep(uL.z, uL.z * .42, d);
    c = mix(c, c * vec3(.13, .15, .3), uL.w * (1. - l));
    c *= 1. + .16 * l * uL.w;
  }
  if (uMode < .5) {                       // hand-inked frame
    float b = uB * (1. + (n(uv * 24. + uSeed) - .5) * .7);
    c = mix(INK, c, smoothstep(b - .0015, b + .0015, e));
  }
  if (uW > 0.) {                          // ink wipe: engraved streaks eat the picture
    float s = n(vec2(uv.x * 72. + uSeed * 13., uv.y * 2.3 + uSeed)) * .6 + n(uv * 6.5 + uSeed) * .4;
    float th = uW * 1.3 - .14;
    a *= smoothstep(th - .012, th + .012, s);
    c = mix(INK, c, smoothstep(th, th + .08, s));
  }
  a *= uA;
  gl_FragColor = vec4(c * a, a);
}`;
function sh(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
let prog, U = {};
try {
  prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
} catch (err) { root.classList.remove('gl', 'm-story'); return; }
gl.useProgram(prog);
['uM', 'uT', 'uMode', 'uA', 'uW', 'uB', 'uSeed', 'uTime', 'uL', 'uG', 'uC', 'uK', 'uIM'].forEach(k => U[k] = gl.getUniformLocation(prog, k));
const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-.5, -.5, .5, -.5, -.5, .5, .5, .5]), gl.STATIC_DRAW);
const aP = gl.getAttribLocation(prog, 'aP'); gl.enableVertexAttribArray(aP); gl.vertexAttribPointer(aP, 2, gl.FLOAT, false, 0, 0);
gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.disable(gl.DEPTH_TEST);
gl.uniform1i(U.uT, 0);
canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); root.classList.remove('gl', 'm-story', 'm-game'); }, false);

/* ---------- textures ---------- */
const tex = {};
const want = [];
scenes.forEach(s => { if (s.kind !== 'box') want.push([s.key, s.src]); });
scenes.forEach(s => { s.insets.forEach(k => want.push(['inset-' + k, `img/i/${k}.webp`])); if (s.photo) want.push(['photo-' + s.key, s.photo, s.photoLabel]); });
want.push(['hobbit', 'img/s/hobbit.webp'], ['letter', 'img/s/letter.webp'], ['foxc', 'img/s/fox.webp'], ['box', 'img/game/box.webp']);
const FAN = ['fox', 'hobbit', 'blu', 'karin', 'raccoon', 'chicken', 'wolf'];
FAN.forEach(k => want.push(['card-' + k, `img/cards/${k}.webp`]));
let loaded = 0;
const loadPct = $('loadPct'), loader = $('loader');
// a real photo, printed as an instant photo with a label
function polaroid(img, label) {
  const pw = 620, pad = 30, iw = pw - pad * 2, ar = img.naturalHeight / img.naturalWidth;
  const ih = Math.round(iw * Math.min(ar, 1.25)), ph = pad + ih + 120;
  const cv = document.createElement('canvas'); cv.width = pw; cv.height = ph;
  const x = cv.getContext('2d');
  x.fillStyle = '#fffdf7'; x.fillRect(0, 0, pw, ph);
  const sh = Math.min(img.naturalHeight, img.naturalWidth * ih / iw);
  x.drawImage(img, 0, (img.naturalHeight - sh) / 2, img.naturalWidth, sh, pad, pad, iw, ih);
  x.fillStyle = 'rgba(0,0,0,.08)'; x.fillRect(pad, pad, iw, 2);
  x.fillStyle = '#b4470c'; x.font = '600 20px "Chakra Petch", sans-serif'; x.textBaseline = 'alphabetic';
  if (x.letterSpacing !== undefined) x.letterSpacing = '4px';
  x.fillText('REAL PHOTO', pad, pad + ih + 52);
  x.fillStyle = '#15120f'; x.font = '600 34px "Chakra Petch", sans-serif';
  if (x.letterSpacing !== undefined) x.letterSpacing = '1px';
  x.fillText(label.toUpperCase(), pad, pad + ih + 94);
  cv.naturalWidth = pw; cv.naturalHeight = ph;
  return cv;
}
function upload(key, img) {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  if (isGL2) { gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); }
  else gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  tex[key] = { t, w: img.naturalWidth || img.width, h: img.naturalHeight || img.height };
}
const vids = {};
function setupVideo(s) {
  const v = document.createElement('video');
  v.muted = true; v.loop = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = 'auto'; v.crossOrigin = 'anonymous';
  [['mp4', 'video/mp4'], ['webm', 'video/webm']].forEach(([x, type]) => { const src = document.createElement('source'); src.src = `${s.video}.${x}`; src.type = type; v.appendChild(src); });
  const t = gl.createTexture();
  vids[s.key] = { v, t, ready: false, w: 1, h: 1 };
  v.addEventListener('canplay', () => { const o = vids[s.key]; o.ready = true; o.w = v.videoWidth; o.h = v.videoHeight; }, { once: true });
  v.load();
}
function videoTex(s, visible) {
  const o = vids[s.key]; if (!o) return null;
  if (!visible) { if (!o.v.paused) o.v.pause(); return null; }
  if (o.v.paused) { const p = o.v.play(); if (p && p.catch) p.catch(() => {}); }
  if (!o.ready || o.v.readyState < 2) return null;
  gl.bindTexture(gl.TEXTURE_2D, o.t);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, o.v);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return { t: o.t, w: o.w, h: o.h };
}
let started = false;
function maybeStart() {
  if (started) return;
  const first = ['forest', 'camp', 'rain'].every(k => tex[k]);
  if (first || loaded === want.length) { started = true; loader.classList.add('gone'); }
}
// load in story order, a few at a time
let qi = 0;
function next() {
  if (qi >= want.length) return;
  const [key, src, label] = want[qi++];
  const img = new Image(); img.decoding = 'async'; img.src = src;
  const ok = () => { upload(key, label !== undefined ? polaroid(img, label) : img); done(); }, done = () => { loaded++; loadPct.textContent = Math.round(loaded / want.length * 100); maybeStart(); next(); };
  (img.decode ? img.decode() : new Promise((r, j) => { img.onload = r; img.onerror = j; })).then(ok, done);
}
(document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]) : Promise.resolve()).then(() => { for (let k = 0; k < 4; k++) next(); setTimeout(() => scenes.forEach(s => { if (s.video && !(navigator.connection && navigator.connection.saveData)) setupVideo(s); }), 2500); });
setTimeout(() => { started = true; loader.classList.add('gone'); }, 9000);

/* ---------- size ---------- */
let W = 0, H = 0, DPR = 1, asp = 1, VP = null, invVP = null;
const FOV = 30 * Math.PI / 180, D = 4;
let Hw = 2 * D * Math.tan(FOV / 2), Ww = Hw;
function resize() {
  DPR = Math.min(devicePixelRatio || 1, 2);
  W = innerWidth; H = innerHeight; asp = W / H;
  canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
  gl.viewport(0, 0, canvas.width, canvas.height);
  Ww = Hw * asp;
  rainSize();
}
addEventListener('resize', resize);

/* ---------- input ---------- */
let pos = 0, target = 0, over = 0, overT = 0, lastInput = 0, lastDir = 1, snapTo = null;
let px = W / 2, py = H / 2, mx = 0, my = 0, tmx = 0, tmy = 0, hx = 0, hy = 0;
let holding = false, keyHold = false;
let mode = 'story';
const gate = () => LAST;   // the little games are optional: scrolling is never blocked
function push(d, threshold) {
  if (mode !== 'story') return;
  const g = gate();
  if (target >= g - .001 && d > 0) {
    if (g < LAST) { nudge(); return; }
    over += d; overT = performance.now();
    if (over > threshold) { over = 0; setMode('game', 'characters'); }
    return;
  }
  over = 0; lastInput = performance.now(); if (d) lastDir = Math.sign(d);
  target = clamp(target + clamp(d, -120, 120) * .00055, 0, g);
}
addEventListener('wheel', e => {
  if (mode === 'story') {
    if (e.ctrlKey) return;
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? H : 1;
    push(e.deltaY * unit, 420);
  } else if (scrollY <= 0 && e.deltaY < 0) {
    over += -e.deltaY; overT = performance.now();
    if (over > 260) { over = 0; setMode('story'); }
  }
}, { passive: false });
let ty = null;
stage.addEventListener('touchstart', e => { ty = e.touches[0].clientY; }, { passive: true });
stage.addEventListener('touchmove', e => {
  if (ty === null || holding) return;
  e.preventDefault();
  const y = e.touches[0].clientY; push(clamp((ty - y) * 2.4, -140, 140), 260); ty = y;
}, { passive: false });
stage.addEventListener('touchend', () => { ty = null; });
let gy = null;
addEventListener('touchstart', e => { if (mode === 'game') gy = scrollY <= 0 ? e.touches[0].clientY : null; }, { passive: true });
addEventListener('touchmove', e => { if (mode === 'game' && gy !== null && e.touches[0].clientY - gy > 110) { gy = null; setMode('story'); } }, { passive: true });
addEventListener('keydown', e => {
  if (mode !== 'story' || e.target.closest('input, textarea')) return;
  const g = gate();
  if (['ArrowDown', 'PageDown', ' '].includes(e.key) && !(e.key === ' ' && e.target === holdBtn)) {
    e.preventDefault();
    if (target >= LAST - .01) { setMode('game', 'characters'); return; }
    if (target >= g - .01 && g < LAST) { nudge(); holdBtn.focus(); return; }
    const nx = STOPS.find(v => v > target + .02); target = Math.min(g, nx === undefined ? LAST : nx);
  }
  if (['ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); const pv = [...STOPS].reverse().find(v => v < target - .02); target = pv === undefined ? 0 : pv; }
  if (e.key === 'Home') target = 0;
  if (e.key === 'End') target = gate();
});
addEventListener('pointermove', e => { px = e.clientX; py = e.clientY; tmx = px / W * 2 - 1; tmy = py / H * 2 - 1; }, { passive: true });

const holdBtn = $('hold'), holdLabel = $('holdLabel'), ring = holdBtn.querySelector('.r1');
const RING = 289.03;
function activeHold() { for (const s of scenes) if (s.hold && !s.finished && Math.abs(pos - s.t0) < .3) return s; return null; }
stage.addEventListener('pointerdown', e => {
  if (e.target.closest('a, .end')) return;
  if (!activeHold()) return;
  holding = true; px = e.clientX; py = e.clientY;
  try { stage.setPointerCapture(e.pointerId); } catch (_) {}
  holdBtn.classList.add('down'); ensureAudio(false);
});
const release = () => { holding = false; holdBtn.classList.remove('down'); };
stage.addEventListener('pointerup', release); stage.addEventListener('pointercancel', release);
holdBtn.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); keyHold = true; holding = true; holdBtn.classList.add('down'); } });
holdBtn.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') { keyHold = false; release(); } });
function nudge() { holdBtn.classList.remove('nudge'); void holdBtn.offsetWidth; holdBtn.classList.add('nudge'); }

/* ---------- modes & navigation ---------- */
function setNav(which) { navLinks.forEach(a => a.classList.toggle('on', a.dataset.go === which || (which === 'game' && a.dataset.go === 'characters'))); }
// setMode('story', 0) starts the story over; setMode('story') from the game lands on its last page
function setMode(m, where) {
  const from = mode; mode = m;
  root.classList.toggle('m-story', m === 'story'); root.classList.toggle('m-game', m === 'game');
  if (m === 'game') {
    const el = where ? $(where) : null;
    requestAnimationFrame(() => { scrollTo(0, el && where !== 'characters' ? Math.max(0, el.getBoundingClientRect().top + scrollY - 70) : 0); });
    setNav(where === 'join' ? 'join' : 'characters');
    release();
  } else {
    if (where === 0) { pos = target = 0; }
    else if (from === 'game') { scenes.forEach(s => s.finished = true); pos = target = LAST; }
    scrollTo(0, 0); last = 0;
    setNav('story');
    if (!raf) raf = requestAnimationFrame(frame);
  }
}
document.querySelectorAll('[data-go]').forEach(a => a.addEventListener('click', e => {
  e.preventDefault();
  const go = a.dataset.go;
  if (go === 'story') setMode('story', (a.classList.contains('brand') || mode === 'story') ? 0 : undefined);
  else setMode('game', go);
}));
addEventListener('scroll', () => {
  if (mode !== 'game') return;
  setNav($('join').getBoundingClientRect().top < H * .5 ? 'join' : 'characters');
}, { passive: true });

/* ---------- rain (2D, over the canvas) ---------- */
const rc = $('rain'), rctx = rc.getContext('2d');
let drops = [], rainNow = 0;
function rainSize() {
  rc.width = W * DPR; rc.height = H * DPR; rctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  drops = Array.from({ length: Math.round(Math.min(320, W * H / 4200)) }, () => ({ x: Math.random() * W, y: Math.random() * H, l: 16 + Math.random() * 26, v: 11 + Math.random() * 9, z: Math.random() }));
  windSize();
}
let windNow = 0, gusts = [], bits = [];
function windSize() {
  gusts = Array.from({ length: Math.round(Math.min(70, W * H / 22000)) }, () => ({ x: Math.random() * W, y: Math.random() * H, l: 80 + Math.random() * 220, v: 14 + Math.random() * 16, ph: Math.random() * 6.28, z: Math.random() }));
  bits = Array.from({ length: 16 }, (_, i) => ({ x: Math.random() * W, y: Math.random() * H, v: 5 + Math.random() * 7, r: Math.random() * 6.28, vr: (Math.random() - .5) * .2, s: 7 + Math.random() * 9, leaf: i % 3 === 0, ph: Math.random() * 6.28 }));
}
function drawWind(dt, amt) {
  windNow += (amt - windNow) * .05;
  if (windNow < .01) return;
  const f = dt * 60, t = now;
  rctx.save(); rctx.globalAlpha = Math.min(1, windNow * 1.15); rctx.lineCap = 'round';
  for (let k = 0; k < 2; k++) {                       // gust streaks blowing in from the left
    rctx.beginPath(); rctx.strokeStyle = k ? 'rgba(255,250,240,.9)' : 'rgba(80,60,40,.22)'; rctx.lineWidth = k ? 2 : 3;
    for (let i = k; i < gusts.length; i += 2) {
      const g = gusts[i]; g.x += g.v * f * (.7 + g.z); if (g.x - g.l > W) { g.x = -Math.random() * 200; g.y = Math.random() * H; }
      const wy = Math.sin(t * 2 + g.ph) * 10;
      rctx.moveTo(g.x - g.l, g.y + wy); rctx.quadraticCurveTo(g.x - g.l * .45, g.y + wy - 12 * Math.sin(t * 3 + g.ph), g.x, g.y + wy * .4);
    }
    rctx.stroke();
  }
  bits.forEach(b => {                                  // a few loose feathers and leaves tumbling past
    b.x += b.v * f; b.y += Math.sin(t * 2.2 + b.ph) * 1.4 * f; b.r += b.vr * f;
    if (b.x > W + 30) { b.x = -30; b.y = Math.random() * H; }
    rctx.save(); rctx.translate(b.x, b.y); rctx.rotate(b.r);
    rctx.beginPath(); rctx.ellipse(0, 0, b.s, b.s * .36, 0, 0, Math.PI * 2);
    rctx.fillStyle = b.leaf ? '#d9822b' : '#fffaf0'; rctx.fill();
    rctx.lineWidth = 1; rctx.strokeStyle = 'rgba(21,18,15,.55)'; rctx.stroke();
    rctx.beginPath(); rctx.moveTo(-b.s, 0); rctx.lineTo(b.s * 1.3, 0); rctx.stroke();
    rctx.restore();
  });
  rctx.restore();
}
function drawRain(dt, amt) {
  rainNow += (amt - rainNow) * .06;
  rc.style.opacity = 1;
  rctx.clearRect(0, 0, W, H);
  if (rainNow < .01) return;
  rctx.save(); rctx.globalAlpha = rainNow; rctx.lineCap = 'round';
  const shown = Math.round(drops.length * Math.min(1, rainNow * 1.2)), f = dt * 60;
  for (let k = 0; k < 2; k++) {
    rctx.beginPath(); rctx.strokeStyle = k ? 'rgba(230,238,252,.85)' : 'rgba(200,214,240,.45)'; rctx.lineWidth = k ? 2.2 : 1.2;
    for (let i = k; i < shown; i += 2) {
      const d = drops[i]; d.y += d.v * f * (.6 + d.z); d.x += d.v * .22 * f;
      if (d.y > H) { d.y = -d.l; d.x = Math.random() * W; } if (d.x > W) d.x -= W;
      rctx.moveTo(d.x, d.y); rctx.lineTo(d.x + d.l * .22, d.y + d.l * (.6 + d.z * .6));
    }
    rctx.stroke();
  }
  rctx.restore();
}

/* ---------- sound: rain, a little wind, a chime when something happens ---------- */
const soundBtn = $('sound');
let AC = null, master, rainG, windG, soundOn = false;
function ensureAudio(start) {
  if (AC || !start) return;
  const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
  AC = new C(); master = AC.createGain(); master.gain.value = 0; master.connect(AC.destination);
  const len = AC.sampleRate * 2, buf = AC.createBuffer(1, len, AC.sampleRate), d = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b0 = .99765 * b0 + w * .099; b1 = .963 * b1 + w * .2965; b2 = .57 * b2 + w * 1.0526; d[i] = (b0 + b1 + b2 + w * .1848) * .11; }
  const src = off => { const s = AC.createBufferSource(); s.buffer = buf; s.loop = true; s.start(0, off); return s; };
  const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
  const hp = AC.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 350;
  rainG = AC.createGain(); rainG.gain.value = 0; src(0).connect(lp); lp.connect(hp); hp.connect(rainG); rainG.connect(master);
  const bp = AC.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 480; bp.Q.value = .6;
  windG = AC.createGain(); windG.gain.value = .06; src(.9).connect(bp); bp.connect(windG); windG.connect(master);
}
function chime() {
  if (!AC || !soundOn) return;
  const t = AC.currentTime;
  [784, 1175, 1568].forEach((f, i) => {
    const o = AC.createOscillator(), g = AC.createGain(); o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0, t + i * .07); g.gain.linearRampToValueAtTime(.09, t + i * .07 + .02); g.gain.exponentialRampToValueAtTime(.0008, t + i * .07 + 1.3);
    o.connect(g); g.connect(master); o.start(t + i * .07); o.stop(t + i * .07 + 1.4);
  });
}
soundBtn.addEventListener('click', () => {
  ensureAudio(true); if (!AC) return;
  soundOn = !soundOn; AC.resume && AC.resume();
  master.gain.setTargetAtTime(soundOn ? 1 : 0, AC.currentTime, .25);
  soundBtn.setAttribute('aria-pressed', String(soundOn)); soundBtn.setAttribute('aria-label', soundOn ? 'Turn sound off' : 'Turn sound on');
});

/* ---------- drawing ---------- */
function draw(model, o) {
  gl.uniformMatrix4fv(U.uM, false, M.mul(VP, model));
  gl.uniform1f(U.uMode, o.mode || 0); gl.uniform1f(U.uA, o.a === undefined ? 1 : o.a); gl.uniform1f(U.uW, o.w || 0);
  gl.uniform1f(U.uB, o.b || 0); gl.uniform1f(U.uSeed, o.seed || 0); gl.uniform1f(U.uC, o.c === undefined ? 1 : o.c); const K = o.K || [0, 0, 0]; gl.uniform3f(U.uK, K[0], K[1], K[2]); const IM = o.IM || [0, 0, 1, 1]; gl.uniform4f(U.uIM, IM[0], IM[1], IM[2], IM[3]);
  const L = o.L || [0, 0, 0, 0], G = o.G || [0, 0, 0, -1];
  gl.uniform4f(U.uL, L[0], L[1], L[2], L[3]); gl.uniform4f(U.uG, G[0], G[1], G[2], G[3]);
  if (o.t) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, o.t.t); }
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
function project(P, x, y) {
  const c = M.xf(M.mul(VP, P), [x, y, 0, 1]);
  return [(c[0] / c[3] * .5 + .5) * W, (1 - (c[1] / c[3] * .5 + .5)) * H];
}
function toPanelUV(P, w, h, sx, sy) {
  const nx = sx / W * 2 - 1, ny = 1 - sy / H * 2;
  const a = M.xf(invVP, [nx, ny, -1, 1]), b = M.xf(invVP, [nx, ny, 1, 1]);
  const iP = M.inv(P);
  const la = M.xf(iP, [a[0] / a[3], a[1] / a[3], a[2] / a[3], 1]), lb = M.xf(iP, [b[0] / b[3], b[1] / b[3], b[2] / b[3], 1]);
  const t = -la[2] / ((lb[2] - la[2]) || 1e-6);
  const hx = la[0] + (lb[0] - la[0]) * t, hy = la[1] + (lb[1] - la[1]) * t;
  return [hx / w + .5, .5 - hy / h];
}

/* per-scene extras */
const BULB = [.485, .11], FOX = [.31, .64];
let lampUV = [.75, .3], lampAmt = 0, lampR = .16;

const cap = $('cap'), capK = cap.querySelector('.cap-k'), capT = cap.querySelector('.cap-t');
const big = $('big'), title = $('title'), letter = $('letter'), endEl = $('end'), hint = $('hint'), skip = $('skip'), progI = $('prog').firstElementChild;
let capFor = -1, bigFor = '', now = 0, last = 0, raf = 0, capBottom = 0;
const finish = s => {
  s.finished = true; s.doneAt = now; s.hp = 1; chime();
  holding = false; holdBtn.classList.remove('down');
  if (keyHold) { keyHold = false; }
};

function frame(t) {
  raf = 0;
  if (mode !== 'story') return;
  const rawDt = Math.min(.25, (t - (last || t)) / 1000), dt = Math.min(.05, rawDt); last = t; now = t / 1000;
  if (performance.now() - overT > 700) over = 0;
  if (!W) resize();

  // ease
  pos += (target - pos) * (1 - Math.exp(-Math.min(.1, rawDt) * 2.6));
  if (Math.abs(target - pos) < .0004) pos = target;
  mx += (tmx - mx) * Math.min(1, dt * 4); my += (tmy - my) * Math.min(1, dt * 4);

  // camera
  const proj = M.persp(FOV, asp, .05, 60);
  const eye = [mx * .17, -my * .11, D], view = M.look(eye, [mx * .03, -my * .02, 0]);
  VP = M.mul(proj, view); invVP = M.inv(VP);

  // page colour follows the story
  const SA = sceneAt(pos), SB = scenes[Math.min(N - 1, SA.i + 1)], f = sstep(.18, .7, pos - SA.t0 - (SA.beats - 1)), A = SA.bg, B = SB.bg;
  const bg = [0, 1, 2].map(k => Math.round(lerp(A[k], B[k], f)));
  document.body.style.backgroundColor = `rgb(${bg})`;
  const lum = (bg[0] * .3 + bg[1] * .59 + bg[2] * .11) / 255;
  stage.classList.toggle('dark', lum < .42);
  const rainAmt = lerp(SA.rain, SB.rain, f);
  drawRain(dt, rainAmt);
  const windAmt = lerp(SA.wind, SB.wind, f) * (1 - sstep(.3, .7, Math.abs(dOf(SA, pos))));
  drawWind(dt, windAmt);
  if (AC && soundOn && rainG) { rainG.gain.setTargetAtTime(rainAmt * .5, AC.currentTime, .5); windG.gain.setTargetAtTime(.06 + windAmt * .55, AC.currentTime, .6); }

  gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  gl.uniform1f(U.uTime, now);

  const mobile = asp < .8;
  const list = [];
  let capInfo = null;

  const TRAVEL = Hw * 1.08;
  scenes.forEach(s => {
    const u = pos - s.t0, Rr = s.beats - 1, d = dOf(s, pos);
    // the paper carries the window up from below, holds it, then carries it away
    const tt = clamp((u + 1) / (Rr + 2), 0, 1) * 2 - 1;     // -1 entering … 0 centre … 1 leaving
    const y = tt * (.48 + .52 * tt * tt) * TRAVEL + (mobile ? Hw * .07 : 0);
    const big = s.kind === 'title' ? 1.06 : 1;
    const h = (mobile ? Math.min(Ww * .9, Hw * .56) : Hw * .74) * s.size * big;
    const w = s.kind === 'box' ? h : mobile ? h : Math.min(Ww * .8, h * (s.size < .9 ? 1 : 1.42));
    if (Math.abs(y) > Hw * .5 + h * .62 + .1) return;
    const xR = mobile || s.kind !== 'panel' ? 0 : (s.cap[1] === 'l' ? 1 : -1) * Math.min(Ww * .05, Math.max(0, (Ww - w) / 2 - .05));
    const off = y / Hw;                                   // -1 below … 0 centre … 1 above
    const rx = (-off * 16 + my * 1.5) * Math.PI / 180;     // the sheet bends as it travels
    const ry = (mx * 2.2 + s.tilt * .35) * Math.PI / 180;
    const rz = (s.tilt * .3 - off * s.tilt * .6 + (s.wind ? Math.sin(now * 2.6) * 1.1 + Math.sin(now * 7.3) * .35 : 0)) * Math.PI / 180;
    const z = -Math.abs(off) * .45;
    const P = M.mul(M.mul(M.mul(M.T(xR, y, z), M.RX(rx)), M.RY(ry)), M.RZ(rz));
    list.push({ s, d, u, Rr, z, P, w, h, a: 1, wipe: 0, y, xR });
    if (Math.abs(off) < .6 && (!capInfo || Math.abs(off) < Math.abs(capInfo.off))) capInfo = { s, d: off < 0 ? -Math.abs(d) : Math.abs(d), off, P, w, h };
  });
  list.sort((p, q) => p.z - q.z);
  scenes.forEach(s => { const o = vids[s.key]; if (o && !o.v.paused && Math.abs(dOf(s, pos)) >= .9) o.v.pause(); });

  list.forEach(({ s, d, u, Rr, P, w, h, a, y, xR }) => {
    if (s.kind === 'box') { drawBox(s, d, P, h, h, a); return; }
    const T = (s.video && videoTex(s, Math.abs(d) < .9)) || tex[s.key]; if (!T) return;
    draw(M.mul(M.mul(P, M.T(w * .02, -h * .035, -.002)), M.S(w * 1.035, h * 1.05)), { mode: 2, a });
    const IM = viewInto(y, xR, w, h, T.w / T.h, .2, s.size < .9 ? 1.03 : 1.3);
    const o = { t: T, a, b: .009 * Math.max(1, h / w), seed: s.seed, IM, c: s.kind === 'title' ? 1 : sstep(-.78, -.14, u) };
    if (s.hold === 'think') o.G = [BULB[0], BULB[1], .07, s.finished ? Math.min(1, (now - s.doneAt) * 2) : s.hp * .55];
    if (s.hold === 'lamp') {
      if (Math.abs(d) < .15 && !s.finished) {
        let tx = px, ty = py;
        if (keyHold) { const k = clamp(s.hp * 1.1, 0, 1); const wu = [(lerp(.8, FOX[0], k) - IM[0]) / IM[2], (lerp(.3, FOX[1], k) - IM[1]) / IM[3]]; const sp = project(P, (wu[0] - .5) * w, (.5 - wu[1]) * h); tx = sp[0]; ty = sp[1]; }
        const wv = toPanelUV(P, w, h, tx, ty), iv = [IM[0] + wv[0] * IM[2], IM[1] + wv[1] * IM[3]];
        lampUV[0] += (iv[0] - lampUV[0]) * .3; lampUV[1] += (iv[1] - lampUV[1]) * .3;
      }
      if (s.finished) lampR = Math.min(1.6, lampR + dt * 1.4); else lampR = lerp(lampR, holding ? .24 : .17, dt * 5);
      const dark = s.finished ? Math.max(0, 1 - (now - s.doneAt) * .9) : 1;
      o.L = [lampUV[0], lampUV[1], lampR, dark * sstep(-.5, -.05, u) * (1 - sstep(.25, .6, u))];
    }
    draw(M.mul(P, M.S(w, h)), o);
    drawPhoto(s, d, P, w, h, a, mobile);
    if (s.insets.length) drawInsets(s, P, w, h, a, 0, mobile);
    if (s.key === 'hhouse') drawHobbit(s, d, P, w, h, a);
  });

  // the hold moment
  const hs = activeHold();
  if (hs) {
    const rate = hs.hold === 'think' ? 1 / 1.5 : hs.hold === 'letter' ? 1 / 1.1 : 0;
    if (hs.hold === 'lamp') {
      const near = Math.hypot(lampUV[0] - FOX[0], lampUV[1] - FOX[1]) < .14;
      if ((holding || keyHold) && near) hs.hp += rawDt / .8; else if (keyHold) hs.hp += rawDt / 1.6; else hs.hp = Math.max(0, hs.hp - rawDt * .6);
    } else if (holding) hs.hp += rawDt * rate; else hs.hp = Math.max(0, hs.hp - rawDt * .9);
    if (hs.hp >= 1) finish(hs);
  }
  const showHold = !!activeHold();
  holdBtn.classList.toggle('on', showHold);
  holdBtn.tabIndex = showHold ? 0 : -1;
  stage.classList.toggle('holding', showHold && fine);
  if (showHold) {
    const s = activeHold();
    if (holdLabel.textContent !== s.holdLabel) holdLabel.textContent = s.holdLabel;
    holdBtn.classList.toggle('lamp', s.hold === 'lamp' && fine);
    let tx, ty;
    if (fine && !keyHold) { tx = px; ty = py; }
    else { const cur = list.find(l => l.s === s); const p = project(cur.P, 0, -cur.h * .5); tx = W / 2; ty = mobile ? Math.min(H - 120, capBottom + 82) : Math.min(H - 70, p[1] + 10); }
    hx += (tx - hx) * Math.min(1, dt * 14); hy += (ty - hy) * Math.min(1, dt * 14);
    if (!hx && !hy) { hx = tx; hy = ty; }
    holdBtn.style.transform = `translate(${hx.toFixed(1)}px, ${hy.toFixed(1)}px)`;
    ring.style.strokeDashoffset = (RING * (1 - clamp(s.hp, 0, 1))).toFixed(1);
  }

  // captions follow their panel
  if (capInfo && capInfo.s.k) {
    const { s, d, P, w, h } = capInfo;
    if (capFor !== s.i) { capFor = s.i; capK.textContent = s.k; capT.textContent = s.t; }
    const rev = sstep(-.5, -.22, d) * (1 - sstep(.22, .36, d));
    const cw = cap.offsetWidth, ch = cap.offsetHeight;
    let L, T;
    if (mobile) {
      const bl = project(P, -w / 2, -h / 2);
      L = (W - cw) / 2; T = bl[1] + 18;
    } else {
      const left = s.cap[1] === 'l', top = s.cap[0] === 't';
      const pt = project(P, (left ? -1 : 1) * w / 2, (top ? 1 : -1) * h / 2);
      const hp = project(P, 0, h / 2)[1], bp = project(P, 0, -h / 2)[1], ph = bp - hp;
      L = pt[0] - (left ? cw * .3 : cw * .7); T = top ? pt[1] + ph * .07 : pt[1] - ch - ph * .07;
    }
    L = clamp(L, 12, W - cw - 12); T = clamp(T, 72, H - ch - 14);
    capBottom = T + ch;
    cap.style.transform = `translate(${L.toFixed(1)}px, ${T.toFixed(1)}px)`;
    cap.style.clipPath = `inset(-12px ${((1 - rev) * 100).toFixed(1)}% -12px -12px)`;
    cap.style.opacity = rev > .01 ? 1 : 0;
  } else cap.style.opacity = 0;

  // big words: the question, and the moments after a hold
  let bigText = '', bigA = 0, bigS = 1;
  scenes.forEach(s => {
    const d = dOf(s, pos);
    if (s.big && Math.abs(d) < .4) { const a = sstep(-.32, -.16, d) * (1 - sstep(.14, .26, d)); if (a > bigA) { bigA = a; bigText = s.big; bigS = .92 + .08 * a; } }
    if (s.doneText && s.doneAt >= 0) {
      const k = now - s.doneAt; const a = k < 1.5 ? sstep(0, .18, k) : 1 - sstep(1.5, 1.9, k);
      if (a > bigA && Math.abs(d) < .3) { bigA = a; bigText = s.doneText; bigS = 1 + .25 * (1 - sstep(0, .35, k)); }
    }
  });
  if (bigText !== bigFor) { bigFor = bigText; big.innerHTML = bigText; }
  big.style.opacity = bigA.toFixed(3);
  big.style.transform = `translate(-50%, -50%) scale(${bigS.toFixed(3)}) rotate(-3deg)`;

  // title, letter, end
  const d0 = pos;
  title.style.opacity = (1 - sstep(.3, .7, d0)).toFixed(3);
  title.style.transform = `translate(-50%, calc(-54% - ${(d0 * 108 * .9).toFixed(2)}vh))`;
  const hh = scenes.find(s => s.hold === 'letter');
  const letterOn = hh.finished && Math.abs(pos - hh.t0) < .1 && now - hh.doneAt > .35;
  if (letter.classList.contains('on') !== letterOn) { letter.classList.toggle('on', letterOn); letter.setAttribute('aria-hidden', String(!letterOn)); }
  const dl = pos - LAST;
  endEl.classList.toggle('on', dl > -.06);
  hint.style.opacity = pos < .08 && started ? 1 : 0;
  skip.style.opacity = pos < LAST - .5 ? 1 : 0; skip.style.pointerEvents = pos < LAST - .5 ? 'auto' : 'none'; skip.style.visibility = pos < LAST - .5 ? 'visible' : 'hidden';
  progI.style.transform = `scaleY(${(pos / LAST).toFixed(4)})`;

  raf = requestAnimationFrame(frame);
}

// close-ups: the page stays still behind, and new camera angles float up over it as you scroll
function viewInto(y, xw, w, h, A, par = .2, room = 1.3) {
  const Sy = Math.max(h * room, w * Math.min(1.06, room) / A), Sx = Sy * A;
  const vb = Math.max(y - h / 2, -Hw / 2), vt = Math.min(y + h / 2, Hw / 2);
  const lo = vt - Sy / 2, hi = vb + Sy / 2;
  const iy = lo <= hi ? clamp(par * y - my * h * .03, lo, hi) : (lo + hi) / 2;
  const mxr = (Sx - w) / 2, dx = clamp(-mx * w * .035, -mxr, mxr);
  return [(-w / 2 - dx) / Sx + .5, .5 - (y + h / 2 - iy) / Sy, w / Sx, h / Sy];
}
function drawInsets(s, P, w, h, a, wipe, mobile) {
  const u = pos - s.t0, st = inStart(s);
  s.insets.forEach((key, j) => {
    const T = tex['inset-' + key]; if (!T) return;
    const k = (u - (st + j * IN_GAP)) / IN_LEN; if (k <= 0 || k >= 1) return;
    const sgn = j % 2 ? 1 : -1;
    const ar = T.h / T.w, iw = mobile ? Math.min(Ww * .74, Hw * .3 / ar) : Math.min(Ww * .36, Hw * .5 / ar), ih = iw * ar;
    const xx = (mobile ? .1 : .23) * sgn * Ww + (mobile ? 0 : sgn * Ww * .03 * Math.sin(k * 3.1));
    const yy = lerp(-Hw * .85, Hw * .85, k);
    const zz = .5 + j * .18;
    const M1 = M.mul(M.mul(M.mul(P, M.T(xx, yy, zz)), M.RZ(sgn * (.05 - k * .07))), M.RY(sgn * -.08));
    const al = a * sstep(0, .08, k) * (1 - sstep(.94, 1, k));
    draw(M.mul(M.mul(M1, M.T(iw * .035, -ih * .06, -.004)), M.S(iw * 1.06, ih * 1.1)), { mode: 2, a: al });
    draw(M.mul(M1, M.S(iw, ih)), { t: T, a: al, b: .012 * Math.max(1, ih / iw), seed: s.seed + j + 1, c: sstep(.06, .34, k) });
  });
}
function drawPhoto(s, d, P, w, h, a, mobile) {
  const T = tex['photo-' + s.key]; if (!T) return;
  const k = sstep(-.32, -.1, d), out = 1 - sstep(.2, .36, d);
  if (k * out < .01) return;
  const sx = s.photoPos[1] === 'r' ? 1 : -1, sy = s.photoPos[0] === 't' ? 1 : -1;
  const pw = w * (mobile ? .38 : .34), ph = pw * T.h / T.w;
  const x0 = sx * (w / 2 - pw * (mobile ? .32 : .12)), y0 = sy * (h / 2 - ph * (mobile ? .3 : .22));
  const fl = Math.sin(now * 1.2 + s.seed) * .01;
  const M1 = M.mul(M.mul(P, M.T(x0 + sx * (1 - k) * pw * .9, y0 + sy * (1 - k) * ph * .3, .38 + (1 - k) * .6)), M.RZ(sx * sy * -.1 + (1 - k) * sx * .5 + fl));
  draw(M.mul(M.mul(M1, M.T(pw * .05, -ph * .05, -.003)), M.S(pw * 1.1, ph * 1.08)), { mode: 2, a: a * k * out });
  draw(M.mul(M1, M.S(pw, ph)), { t: T, mode: 1, a: a * k * out });
}
function drawHobbit(s, d, P, w, h, a) {
  const H1 = tex.hobbit, L1 = tex.letter; if (!H1) return;
  const ar = H1.w / H1.h, hh = h * .74, hw = hh * ar;
  const bob = Math.sin(now * 1.3) * h * .006;
  draw(M.mul(M.mul(P, M.T(w * .3 + w * .04, -h * .5 + hh * .5 - h * .08 + bob, .28)), M.S(hw, hh)), { t: H1, mode: 1, a });
  if (!L1) return;
  const k = s.finished ? sstep(0, .5, now - s.doneAt) : 0;
  const lr = L1.w / L1.h, lw = w * .26 * (1 + s.hp * .25 + k * 1.6), lh = lw / lr;
  const wob = (1 - k) * (Math.sin(now * 2.2) * .06 + (holding ? Math.sin(now * 30) * .03 : 0));
  const M1 = M.mul(M.mul(M.mul(P, M.T(lerp(-w * .2, 0, k), lerp(-h * .33, 0, k) + Math.sin(now * 1.7) * h * .012, lerp(.42, 1.6, k))), M.RZ(wob - .12 * (1 - k))), M.S(lw, lh));
  draw(M1, { t: L1, mode: 1, a: a * (1 - sstep(.25, .5, now - s.doneAt) * (s.finished ? 1 : 0)) });
}
function drawFox(s, P, w, h, a) {
  const F = tex.foxc; if (!F) return;
  const k = sstep(0, .7, now - s.doneAt), j = Math.sin(Math.min(1, (now - s.doneAt) / .7) * Math.PI) * .18;
  const ar = F.w / F.h, fh = lerp(h * .18, h * .86, k), fw = fh * ar;
  const xx = lerp((FOX[0] - .5) * w, -w * .28, k), yy = lerp((.5 - FOX[1]) * h, -h * .5 + fh * .5 - h * .1, k) + j * h;
  draw(M.mul(M.mul(M.mul(P, M.T(xx, yy, lerp(0, .32, k))), M.RZ(lerp(.2, -.05, k))), M.S(fw, fh)), { t: F, mode: 1, a });
}
function drawBox(s, d, P, w, h, a) {
  const B = tex.box; if (!B) return;
  const e = sstep(-.7, -.1, d);
  const bh = Hw * (asp < .8 ? .44 : .6), bw = bh * B.w / B.h;
  FAN.forEach((k, i) => {
    const C = tex['card-' + k]; if (!C) return;
    const n = FAN.length, u = (i / (n - 1)) * 2 - 1;
    const ang = u * (asp < .8 ? .9 : 1.15) * e;
    const R = (asp < .8 ? Ww * .36 : Math.min(Ww * .34, Hw * .62)) * e;
    const ch = Hw * (asp < .8 ? .26 : .34), cw = ch * C.w / C.h;
    const fl = Math.sin(now * 1.1 + i * 1.3) * .025;
    const M1 = M.mul(M.mul(M.mul(P, M.T(Math.sin(ang) * R, Hw * .02 + (Math.cos(ang) - 1) * R * .45 + fl + (asp < .8 ? Hw * .12 : 0), -.35 - Math.abs(u) * .15)), M.RZ(-ang * .55)), M.RY(mx * .2));
    draw(M.mul(M.mul(M1, M.T(cw * .04, -ch * .04, -.002)), M.S(cw * 1.08, ch * 1.08)), { mode: 2, a: a * e });
    draw(M.mul(M1, M.S(cw, ch)), { t: C, mode: 1, a: a * sstep(0, .3, e) });
  });
  const fl = Math.sin(now * .9) * .03;
  const MB = M.mul(M.mul(P, M.T(0, -Hw * .06 + fl - (1 - e) * .4, .2)), M.RY(mx * .25));
  draw(M.mul(MB, M.S(bw, bh)), { t: B, mode: 1, a });
}

resize();
raf = requestAnimationFrame(frame);
document.addEventListener('visibilitychange', () => { if (!document.hidden && mode === 'story' && !raf) { last = 0; raf = requestAnimationFrame(frame); } });
})();
