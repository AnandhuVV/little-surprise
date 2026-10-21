import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CONFIG } from './config.js';

const $ = (s) => document.querySelector(s);
const fill = (s) => String(s ?? '').replaceAll('{name}', CONFIG.name).replaceAll('{from}', CONFIG.from);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (a, b) => a + Math.random() * (b - a);
const params = new URLSearchParams(location.search);

document.querySelectorAll('[data-text]').forEach((el) => { el.textContent = fill(CONFIG[el.dataset.text]); });
document.querySelectorAll('[data-from]').forEach((el) => { el.textContent = CONFIG.from; });
const replyNumber = String(CONFIG.whatsappNumber || '').replace(/\D/g, '');
$('#reply').href = `https://wa.me/${replyNumber}?text=${encodeURIComponent(fill(CONFIG.replyText))}`;

// ------------------------------------------------------------------ tweens
const ease = {
  outCubic: (t) => 1 - (1 - t) ** 3,
  inCubic: (t) => t ** 3,
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: (t) => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2,
  inBack: (t) => 2.7 * t ** 3 - 1.7 * t ** 2,
};
const tweens = new Set();
function tween(ms, fn, { easing = ease.outCubic, delay = 0 } = {}) {
  return new Promise((done) => tweens.add({ start: performance.now() + delay, ms, fn, easing, done }));
}
function stepTweens(now) {
  for (const t of tweens) {
    const k = (now - t.start) / t.ms;
    if (k < 0) continue;
    t.fn(t.easing(Math.min(k, 1)));
    if (k >= 1) { tweens.delete(t); t.done(); }
  }
}

// ------------------------------------------------------------------ scenes
let scene = 'loading';
function go(id) {
  $('#' + scene).classList.remove('active');
  $('#' + id).classList.add('active');
  document.body.dataset.scene = id;
  scene = id;
}
function swapText(el, text) {
  el.classList.add('swap');
  setTimeout(() => { el.textContent = text; el.classList.remove('swap'); }, 450);
}

// ------------------------------------------------------------------ confetti
const COLORS = ['#ff8fb8', '#ffd6e7', '#e9d8ff', '#f2c46d', '#ffffff', '#a8e6cf'];
const fire = (opts) => window.confetti?.({ colors: COLORS, disableForReducedMotion: true, ...opts });
const heartShape = window.confetti?.shapeFromPath?.({
  path: 'M167 72c19,-38 37,-56 75,-56 42,0 76,33 76,75 0,76 -76,151 -151,227 -76,-76 -151,-151 -151,-227 0,-42 33,-75 75,-75 38,0 57,18 76,56z',
});

// ------------------------------------------------------------------ floating hearts behind everything
const sky = (() => {
  const cv = $('#sky');
  const ctx = cv.getContext('2d');
  const tints = ['#ff9ec4', '#ffc2d8', '#e3c9ff', '#ffd59e', '#ffffff', '#ffffff'];
  let W = 0, H = 0;
  const parts = [];
  const make = (anywhere) => ({
    x: Math.random() * W, y: anywhere ? Math.random() * H : H + 30, s: rand(7, 17), v: rand(8, 22),
    sway: rand(8, 26), ph: rand(0, 6.28), a: rand(0.3, 0.7), c: tints[Math.floor(Math.random() * tints.length)],
    star: Math.random() < 0.35,
  });
  function resize() {
    const dpr = Math.min(devicePixelRatio, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(42, (W * H) / 15000));
    while (parts.length < n) parts.push(make(true));
    parts.length = n;
  }
  function heart(x, y, s) {
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.3);
    ctx.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.3);
    ctx.bezierCurveTo(x - s * 0.5, y + s * 0.6, x, y + s * 0.78, x, y + s);
    ctx.bezierCurveTo(x, y + s * 0.78, x + s * 0.5, y + s * 0.6, x + s * 0.5, y + s * 0.3);
    ctx.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.3);
    ctx.fill();
  }
  function star(x, y, s) {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const r = i % 2 ? s * 0.28 : s;
      const a = (i / 8) * Math.PI * 2;
      ctx.lineTo(x + Math.sin(a) * r, y + Math.cos(a) * r);
    }
    ctx.fill();
  }
  function draw(dt, t) {
    ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.y -= p.v * dt;
      if (p.y < -30) Object.assign(p, make(false));
      const x = p.x + Math.sin(t * 0.6 + p.ph) * p.sway;
      ctx.globalAlpha = p.star ? p.a * (0.55 + 0.45 * Math.sin(t * 2.2 + p.ph)) : p.a;
      ctx.fillStyle = p.c;
      if (p.star) star(x, p.y, p.s * 0.55);
      else heart(x, p.y, p.s);
    }
    ctx.globalAlpha = 1;
  }
  resize();
  addEventListener('resize', resize);
  return { draw };
})();

// ------------------------------------------------------------------ music box (Happy Birthday is public domain)
const MELODY = [   // [beat, midi]
  [0, 67], [0.75, 67], [1, 69], [2, 67], [3, 72], [4, 71],
  [6, 67], [6.75, 67], [7, 69], [8, 67], [9, 74], [10, 72],
  [12, 67], [12.75, 67], [13, 79], [14, 76], [15, 72], [16, 71], [17, 69],
  [19, 77], [19.75, 77], [20, 76], [21, 72], [22, 74], [23, 72],
];
const C = [60, 67, 76], G = [55, 62, 71], F = [53, 60, 69];
const CHORDS = [[1, C], [4, G], [7, G], [10, C], [13, C], [17, F], [20, C], [23, C]];
const LOOP_BEATS = 30, BEAT = 0.5, VOLUME = 0.55;

class MusicBox {
  constructor() { this.ctx = null; this.on = true; }

  start() {
    if (this.ctx) { this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const c = (this.ctx = new AC());
    this.master = c.createGain();
    this.master.gain.value = 0;
    this.master.connect(c.destination);
    this.bus = c.createGain();
    const delay = c.createDelay(1), feedback = c.createGain(), wet = c.createGain();
    delay.delayTime.value = 0.33;
    feedback.gain.value = 0.3;
    wet.gain.value = 0.28;
    this.bus.connect(this.master);
    this.bus.connect(delay);
    delay.connect(feedback).connect(delay);
    delay.connect(wet).connect(this.master);
    this.master.gain.linearRampToValueAtTime(VOLUME, c.currentTime + 2.5);
    this.next = c.currentTime + 0.5;
    this.schedule();
    document.addEventListener('visibilitychange', () => (document.hidden ? c.suspend() : c.resume()));
  }

  tone(midi, t, vel = 1, len = 2.2) {
    const c = this.ctx;
    const f = 440 * 2 ** ((midi - 69) / 12);
    // a sine "tine" plus quickly fading upper partials sounds like a little music box
    for (const [mult, amp, decay] of [[1, 0.2, 1], [2, 0.05, 0.45], [3, 0.022, 0.28], [4.2, 0.01, 0.16]]) {
      const o = c.createOscillator(), g = c.createGain();
      const d = len * decay;
      o.frequency.value = f * mult;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(amp * vel, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(this.bus);
      o.start(t);
      o.stop(t + d + 0.05);
    }
  }

  schedule() {
    const c = this.ctx;
    if (this.next < c.currentTime) this.next = c.currentTime + 0.2;
    const t0 = this.next;
    for (const [b, m] of MELODY) this.tone(m + 12, t0 + b * BEAT);
    for (const [b, chord] of CHORDS) chord.forEach((m, i) => this.tone(m, t0 + (b + i) * BEAT, 0.38, 1.6));
    this.next = t0 + LOOP_BEATS * BEAT;
    setTimeout(() => this.schedule(), Math.max(0, (this.next - c.currentTime - 1.5) * 1000));
  }

  chime() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.02;
    [84, 88, 91, 96].forEach((m, i) => this.tone(m, t + i * 0.07, 0.7, 1.4));
  }

  blip() {
    if (!this.ctx) return;
    this.tone(rand(86, 93) | 0, this.ctx.currentTime + 0.01, 0.5, 0.8);
  }

  whoosh() {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    const buf = c.createBuffer(1, c.sampleRate * 0.8, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
    src.buffer = buf;
    bp.type = 'bandpass';
    bp.Q.value = 0.8;
    bp.frequency.setValueAtTime(1400, t);
    bp.frequency.exponentialRampToValueAtTime(300, t + 0.7);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.35, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.75);
    src.connect(bp).connect(g).connect(this.master);
    src.start(t);
  }

  toggle() {
    this.on = !this.on;
    if (this.ctx) this.master.gain.setTargetAtTime(this.on ? VOLUME : 0, this.ctx.currentTime, 0.15);
    return this.on;
  }
}
const music = new MusicBox();
$('#mute').addEventListener('click', () => { $('#mute').textContent = music.toggle() ? '🔊' : '🔈'; });

// ------------------------------------------------------------------ three.js stage
const canvas = $('#stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const world = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
world.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
world.environmentIntensity = 0.75;

const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 40);
const sun = new THREE.DirectionalLight(0xfff4ec, 2.0);
sun.position.set(1.4, 3.2, 2.2);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -1.4, right: 1.4, top: 1.4, bottom: -1.4, near: 0.5, far: 8 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.015;
world.add(sun, new THREE.HemisphereLight(0xfff2f6, 0xffc9dc, 0.7));

const ground = new THREE.Mesh(new THREE.CircleGeometry(3, 48), new THREE.ShadowMaterial({ color: 0xa8436f, opacity: 0.16 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
world.add(ground);

function softTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.3, 'rgba(255,255,255,0.5)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const softTex = softTexture();

function emojiTexture(emoji) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.font = '92px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(emoji, 64, 70);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function blob(size) {   // soft contact shadow
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ map: softTex, color: 0x9b3d66, transparent: true, opacity: 0.22, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.002;
  return m;
}

const controls = new OrbitControls(camera, canvas);
Object.assign(controls, {
  enabled: false, enableZoom: false, enablePan: false, enableDamping: true, dampingFactor: 0.08,
  rotateSpeed: 0.6, autoRotate: false, autoRotateSpeed: 1.3,
  minPolarAngle: THREE.MathUtils.degToRad(50), maxPolarAngle: THREE.MathUtils.degToRad(82),
});

// Frame a box so it fits between the title and the button, on tall phones and wide screens alike.
let framed = null;
function framing(box, elevDeg, azimuth = 0) {
  const size = box.getSize(new THREE.Vector3()), target = box.getCenter(new THREE.Vector3());
  const e = THREE.MathUtils.degToRad(elevDeg);
  const vf = THREE.MathUtils.degToRad(camera.fov) / 2;
  const hf = Math.atan(Math.tan(vf) * camera.aspect);
  const depth = Math.max(size.x, size.z);
  const tall = size.y * Math.cos(e) + size.z * Math.sin(e);
  const dist = Math.max((tall / 2 / Math.tan(vf)) * 1.55, (size.x / 2 / Math.tan(hf)) * 1.2) + depth / 2;
  const dir = new THREE.Vector3(Math.sin(azimuth) * Math.cos(e), Math.sin(e), Math.cos(azimuth) * Math.cos(e));
  return { target, pos: target.clone().addScaledVector(dir, dist) };
}
function frame(box, elevDeg) {
  framed = { box, elevDeg };
  const f = framing(box, elevDeg, controls.getAzimuthalAngle());
  camera.position.copy(f.pos);
  controls.target.copy(f.target);
  camera.lookAt(f.target);
}
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.setViewOffset(w, h, 0, -h * 0.06, w, h);   // nudge the 3D content below the title
  camera.updateProjectionMatrix();
  if (framed) frame(framed.box, framed.elevDeg);
}
addEventListener('resize', resize);
resize();

// ------------------------------------------------------------------ loading
const draco = new DRACOLoader().setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/libs/draco/gltf/');
const loader = new GLTFLoader().setDRACOLoader(draco);
const progress = { cake: 0, gift: 0 };
function load(url, key) {
  return new Promise((resolve, reject) => loader.load(url, resolve, (e) => {
    if (e.total) progress[key] = e.loaded / e.total;
    $('#progress').style.width = `${(progress.cake * 0.9 + progress.gift * 0.1) * 92}%`;
  }, reject));
}

// ------------------------------------------------------------------ cake
let cake, cakeBox, candleLight;
const flames = [];
let wished = false, cakeReadyAt = Infinity;

function setupCake(gltf) {
  cake = gltf.scene;
  cake.traverse((o) => {
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
  });
  cakeBox = new THREE.Box3().setFromObject(cake);
  for (let i = 1; i <= 6; i++) {
    const f = cake.getObjectByName(`Flame_${i}`);
    if (!f) continue;
    f.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = false;
      o.material.emissiveIntensity = 1.5;   // keeps the flame golden instead of tone-mapping to white
    });
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: softTex, color: 0xffa04a, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false,
    }));
    glow.position.copy(f.position).add(new THREE.Vector3(0, 0.024, 0));
    glow.scale.setScalar(0.2);
    cake.add(glow);
    f.userData = { base: f.scale.clone(), life: 1, glow, seed: rand(0, 100) };
    flames.push(f);
  }
  candleLight = new THREE.PointLight(0xffa860, 0.07, 0, 2);
  candleLight.position.set(0, 1.13, 0);
  cake.add(candleLight, blob(1.9));
  cake.visible = false;
  world.add(cake);
}

function animateFlames(t) {
  let total = 0;
  for (const f of flames) {
    const { base, life, glow, seed } = f.userData;
    const k = 1 + 0.08 * Math.sin(t * 13 + seed) + 0.05 * Math.sin(t * 27.3 + seed * 2);
    f.scale.set(base.x * life * (1.04 - 0.04 * k), base.y * life * k, base.z * life * (1.04 - 0.04 * k));
    f.visible = life > 0.01;
    glow.material.opacity = life * (0.8 + 0.2 * Math.sin(t * 17 + seed));
    total += life * k;
  }
  if (candleLight) candleLight.intensity = 0.07 * (total / Math.max(flames.length, 1));
}

const puffs = [];
function puff(f) {
  const p = f.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.015, 0));
  for (let i = 0; i < 7; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, color: 0xd9cbd0, transparent: true, opacity: 0, depthWrite: false }));
    s.position.copy(p);
    world.add(s);
    puffs.push({ s, t: -i * 0.11, life: 2.2, vx: rand(-0.025, 0.025), vz: rand(-0.025, 0.025) });
  }
}
function stepPuffs(dt) {
  for (let i = puffs.length - 1; i >= 0; i--) {
    const q = puffs[i];
    q.t += dt;
    if (q.t < 0) continue;
    const k = q.t / q.life;
    if (k >= 1) {
      world.remove(q.s);
      q.s.material.dispose();
      puffs.splice(i, 1);
      continue;
    }
    q.s.position.x += (q.vx + Math.sin(q.t * 3) * 0.01) * dt;
    q.s.position.z += q.vz * dt;
    q.s.position.y += 0.1 * dt;
    q.s.scale.setScalar(0.025 + k * 0.13);
    q.s.material.opacity = 0.45 * Math.sin(Math.PI * Math.min(k * 1.6, 1)) * (1 - k);
  }
}

function startCake() {
  go('cake');
  cake.visible = true;
  frame(cakeBox, 15);
  controls.enabled = true;
  controls.autoRotate = true;
  cake.scale.setScalar(0.001);
  tween(1000, (e) => cake.scale.setScalar(Math.max(e, 0.001)), { easing: ease.outBack, delay: 300 });
  cakeReadyAt = performance.now() + 1400;
}

async function blowOut() {
  if (wished) return;
  wished = true;
  music.whoosh();
  const order = flames.map((_, i) => i).sort(() => Math.random() - 0.5);
  order.forEach((i, k) => {
    const f = flames[i];
    tween(260, (e) => { f.userData.life = 1 - e; }, { delay: k * 90, easing: ease.inCubic }).then(() => puff(f));
  });
  await sleep(order.length * 90 + 400);
  music.chime();
  fire({ particleCount: 110, spread: 100, startVelocity: 42, origin: { y: 0.55 }, scalar: 0.95 });
  fire({ particleCount: 50, angle: 60, spread: 60, origin: { x: 0, y: 0.75 } });
  fire({ particleCount: 50, angle: 120, spread: 60, origin: { x: 1, y: 0.75 } });
  swapText($('#cakeHint'), fill(CONFIG.afterWish));
  await sleep(1800);
  $('#toGifts').classList.remove('hidden');
}

// ------------------------------------------------------------------ gifts
const GIFT_COLORS = [
  { paper: '#ff9ec4', ribbon: '#ffffff' },
  { paper: '#c7b2ff', ribbon: '#f6cf6e' },
  { paper: '#9fe3c9', ribbon: '#ff9ec4' },
];
const gifts = new THREE.Group();
const giftItems = [];
let giftBox, giftBusy = false;

function setupGifts(gltf) {
  const portrait = innerWidth / innerHeight < 0.9;
  const layout = portrait
    ? [[-0.33, -0.2], [0.33, -0.2], [0, 0.38]]
    : [[-0.64, 0], [0, 0.12], [0.64, 0]];
  CONFIG.gifts.slice(0, 3).forEach((content, i) => {
    const root = gltf.scene.clone(true);
    const col = GIFT_COLORS[i % GIFT_COLORS.length];
    root.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = o.receiveShadow = true;
      o.material = o.material.clone();   // own materials, so fading one lid leaves the rest alone
      o.material.color.set(o.material.name === 'Gift_Paper' ? col.paper : col.ribbon);
    });
    const scale = [0.42, 0.4, 0.44][i];
    root.position.set(layout[i][0], 0, layout[i][1]);
    root.rotation.y = rand(-0.45, 0.45);
    root.scale.setScalar(scale);
    gifts.add(root);
    giftItems.push({ root, lid: root.getObjectByName('Lid'), content, scale, opened: false, seed: rand(0, 6) });
  });
  giftBox = new THREE.Box3().setFromObject(gifts);   // before the invisible helpers below are added
  for (const it of giftItems) {
    it.hit = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.5, 1.3), new THREE.MeshBasicMaterial({ visible: false }));
    it.hit.position.y = 0.7;
    it.spark = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTexture(it.content.emoji), transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
    it.spark.scale.setScalar(0.001);
    it.spark.position.y = 0.5;
    it.root.add(it.hit, it.spark, blob(1.9));
  }
  gifts.visible = false;
  world.add(gifts);
}

function animateGifts(t) {
  for (const it of giftItems) {
    if (!it.opened) {
      it.root.position.y = Math.max(0, Math.sin(t * 2.2 + it.seed)) * 0.035;
      it.root.rotation.z = Math.sin(t * 1.7 + it.seed) * 0.03;
    } else if (it.spark.userData.up) {
      it.spark.position.y = 1.85 + Math.sin(t * 2 + it.seed) * 0.06;
    }
  }
}

async function toGifts() {
  $('#toGifts').classList.add('hidden');
  controls.enabled = false;
  controls.autoRotate = false;
  await tween(650, (e) => cake.scale.setScalar(Math.max(1 - e, 0.001)), { easing: ease.inBack });
  cake.visible = false;
  go('gifts');
  gifts.visible = true;
  const from = { pos: camera.position.clone(), target: controls.target.clone() };
  framed = { box: giftBox, elevDeg: 22 };
  const to = framing(giftBox, 22, 0);
  tween(1100, (e) => {
    camera.position.lerpVectors(from.pos, to.pos, e);
    controls.target.lerpVectors(from.target, to.target, e);
    camera.lookAt(controls.target);
  }, { easing: ease.inOutSine });
  giftItems.forEach((it, i) => {
    it.root.scale.setScalar(0.001);
    tween(750, (e) => it.root.scale.setScalar(Math.max(it.scale * e, 0.001)), { delay: 350 + i * 160, easing: ease.outBack });
  });
}

const raycaster = new THREE.Raycaster();
function pickGift(x, y) {
  raycaster.setFromCamera(new THREE.Vector2((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1), camera);
  const hit = raycaster.intersectObjects(giftItems.map((it) => it.hit), false)[0];
  return hit && giftItems.find((it) => it.hit === hit.object);
}

async function openGift(it) {
  if (giftBusy) return;
  if (it.opened) { await showCard(it.content); return; }
  giftBusy = true;
  it.opened = true;
  const { root, lid, spark, scale: s } = it;
  root.position.y = 0;
  root.rotation.z = 0;
  await tween(150, (e) => root.scale.set(s * (1 + 0.12 * e), s * (1 - 0.16 * e), s * (1 + 0.12 * e)), { easing: ease.outCubic });
  music.chime();
  tween(420, (e) => root.scale.set(s * (1.12 - 0.12 * e), s * (0.84 + 0.16 * e), s * (1.12 - 0.12 * e)), { easing: ease.outBack });
  const lidMats = [];
  lid.traverse((o) => { if (o.isMesh) { o.material.transparent = true; lidMats.push(o.material); } });
  const spin = rand(-1, 1);
  tween(800, (e) => {
    lid.position.y = 0.8 + e * 1.6;
    lid.position.x = spin * e * 0.4;
    lid.rotation.z = -spin * e * 0.9;
    lid.rotation.x = e * 0.5;
    lidMats.forEach((m) => { m.opacity = 1 - e; });
  }, { easing: ease.outCubic }).then(() => { lid.visible = false; });
  tween(900, (e) => {
    spark.position.y = 0.5 + e * 1.35;
    spark.scale.setScalar(0.001 + e * 0.75);
    spark.material.opacity = Math.min(1, e * 2);
  }, { delay: 120, easing: ease.outBack }).then(() => { spark.userData.up = true; });
  const p = root.localToWorld(new THREE.Vector3(0, 1.2, 0)).project(camera);
  fire({ particleCount: 70, spread: 75, startVelocity: 28, scalar: 0.85, origin: { x: (p.x + 1) / 2, y: (1 - p.y) / 2 } });
  await sleep(750);
  await showCard(it.content);
  giftBusy = false;
  const left = giftItems.filter((g) => !g.opened).length;
  if (left) {
    swapText($('#giftHint'), left === 1 ? 'one more… 🎀' : `${left} more to go ✨`);
  } else {
    swapText($('#giftHint'), 'all opened 💗 (tap one to read it again)');
    $('#toPhotos').classList.remove('hidden');
  }
}

function showCard(c) {
  return new Promise((done) => {
    const m = $('#card');
    $('.card-emoji').textContent = c.emoji;
    $('.card-title').textContent = fill(c.title);
    $('.card-text').textContent = fill(c.text);
    m.classList.remove('hidden');
    const onClick = (e) => {
      if (e.target !== m && e.target.id !== 'cardClose') return;
      m.classList.add('hidden');
      m.removeEventListener('click', onClick);
      done();
    };
    m.addEventListener('click', onClick);
  });
}

// taps (not drags) on the 3D stage
let down = null;
canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
canvas.addEventListener('pointerup', (e) => {
  if (!down) return;
  const tap = Math.hypot(e.clientX - down.x, e.clientY - down.y) < 10 && performance.now() - down.t < 450;
  down = null;
  if (!tap) return;
  if (scene === 'cake' && performance.now() > cakeReadyAt) blowOut();
  else if (scene === 'gifts') {
    const it = pickGift(e.clientX, e.clientY);
    if (it) openGift(it);
  }
});

// ------------------------------------------------------------------ polaroids
function buildStack() {
  const stack = $('#stack');
  [...CONFIG.photos].reverse().forEach((p) => {   // first photo ends up on top
    const el = document.createElement('div');
    el.className = 'polaroid';
    el.style.setProperty('--r', `${rand(-7, 7).toFixed(1)}deg`);
    el.innerHTML = '<div class="pic"><img alt="" draggable="false"></div><p class="caption"></p>';
    const img = el.querySelector('img');
    img.onerror = () => img.remove();
    img.src = p.src;
    el.querySelector('.caption').textContent = fill(p.caption);
    stack.appendChild(el);
  });

  let card = null, sx = 0, sy = 0, dx = 0, dy = 0, t0 = 0;
  stack.addEventListener('pointerdown', (e) => {
    card = stack.lastElementChild;
    if (!card) return;
    card.classList.remove('back');
    sx = e.clientX; sy = e.clientY; dx = dy = 0; t0 = performance.now();
    stack.setPointerCapture(e.pointerId);
  });
  stack.addEventListener('pointermove', (e) => {
    if (!card) return;
    dx = e.clientX - sx; dy = e.clientY - sy;
    card.style.transform = `translate(${dx}px, ${dy}px) rotate(calc(var(--r) + ${dx * 0.06}deg))`;
  });
  const release = () => {
    if (!card) return;
    const c = card, dist = Math.hypot(dx, dy);
    card = null;
    if (dist > 70) fling(c, dx / dist, dy / dist);
    else if (dist < 8 && performance.now() - t0 < 500) fling(c, Math.random() < 0.5 ? -0.9 : 0.9, -0.45);
    else { c.classList.add('back'); c.style.transform = ''; }
  };
  stack.addEventListener('pointerup', release);
  stack.addEventListener('pointercancel', release);

  function fling(c, ux, uy) {
    const D = Math.max(innerWidth, innerHeight) * 1.1;
    c.classList.add('fly');
    c.style.transform = `translate(${ux * D}px, ${uy * D}px) rotate(${ux * 45}deg)`;
    c.style.opacity = '0';
    music.blip();
    setTimeout(() => {
      c.remove();
      if (stack.children.length) return;
      swapText($('#photoHint'), 'more memories coming soon, I hope 💗');
      $('#toLetter').classList.remove('hidden');
    }, 650);
  }
}

// ------------------------------------------------------------------ letter
async function typeLetter() {
  go('letter');
  const box = $('#letterText'), paper = $('#paper');
  let skip = false;
  const onTap = () => { skip = true; };
  paper.addEventListener('click', onTap);
  await sleep(900);
  for (const para of CONFIG.letter) {
    const p = document.createElement('p');
    const text = fill(para);
    box.appendChild(p);
    if (!skip) {
      p.classList.add('caret');
      for (const ch of Array.from(text)) {
        if (skip) break;
        p.textContent += ch;
        paper.scrollTop = paper.scrollHeight;
        await sleep(ch === ',' ? 170 : '.!?'.includes(ch) ? 280 : rand(26, 48));
      }
      p.classList.remove('caret');
    }
    p.textContent = text;
    if (!skip) await sleep(420);
  }
  paper.removeEventListener('click', onTap);
  $('#signoff').classList.add('show');
  paper.scrollTo({ top: paper.scrollHeight, behavior: 'smooth' });
  await sleep(1000);
  $('#toEnd').classList.remove('hidden');
}

// ------------------------------------------------------------------ ending
function ending() {
  go('end');
  const until = performance.now() + 2600;
  const shapes = heartShape ? [heartShape] : ['circle'];
  (function hearts() {
    fire({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.75 }, shapes, scalar: 1.7, colors: ['#ff8fb8', '#ffb3cf', '#f06a9b'] });
    fire({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.75 }, shapes, scalar: 1.7, colors: ['#ff8fb8', '#ffb3cf', '#f06a9b'] });
    if (performance.now() < until) requestAnimationFrame(hearts);
  })();
}

// ------------------------------------------------------------------ flow
$('#toGifts').addEventListener('click', toGifts);
$('#toPhotos').addEventListener('click', () => go('photos'));
$('#toLetter').addEventListener('click', typeLetter);
$('#toEnd').addEventListener('click', ending);
$('#replay').addEventListener('click', () => location.reload());

$('#envelope').addEventListener('click', async () => {
  music.start();
  $('#mute').classList.remove('hidden');
  $('#envelope').classList.add('open');
  $('#intro').classList.add('opening');
  $('#intro .pulse').classList.add('hidden');
  await sleep(1900);
  startCake();
}, { once: true });

let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  const t = now / 1000;
  stepTweens(now);
  sky.draw(dt, t);
  if (scene !== 'cake' && scene !== 'gifts') return;
  animateFlames(t);
  animateGifts(t);
  stepPuffs(dt);
  if (controls.enabled) controls.update();
  renderer.render(world, camera);
}
requestAnimationFrame(loop);

try {
  const [cakeGltf, giftGltf] = await Promise.all([load('assets/cake.glb', 'cake'), load('assets/gift.glb', 'gift')]);
  setupCake(cakeGltf);
  setupGifts(giftGltf);
  buildStack();
  renderer.compile(world, camera);
  await Promise.race([document.fonts.ready, sleep(2500)]);
  $('#progress').style.width = '100%';
  await sleep(500);
} catch (err) {
  console.error(err);
  $('#loading .hint').textContent = 'hmm, something went wrong. try opening the link in your browser 💗';
  throw err;
}

// ?scene=cake|gifts|photos|letter|end jumps straight to a part (handy for previewing)
const jump = params.get('scene');
if (jump === 'cake') startCake();
else if (jump === 'gifts') { startCake(); wished = true; flames.forEach((f) => { f.userData.life = 0; }); toGifts(); }
else if (jump === 'photos') go('photos');
else if (jump === 'letter') typeLetter();
else if (jump === 'end') ending();
else go('intro');

window.surprise = { blowOut, toGifts, openGift: (i) => openGift(giftItems[i]), go };
