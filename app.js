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
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -2.4, right: 2.4, top: 2.4, bottom: -2.4, near: 0.5, far: 9 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.015;
const rim = new THREE.DirectionalLight(0xffd0e6, 0.9);   // soft pink back light so balloons and icing get a glowing edge
rim.position.set(-1.5, 2.5, -3);
world.add(sun, rim, new THREE.HemisphereLight(0xfff2f6, 0xffc9dc, 0.7));

const ground = new THREE.Mesh(new THREE.CircleGeometry(3.5, 64), new THREE.ShadowMaterial({ color: 0xa8436f, opacity: 0.16 }));
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

function sparkleTexture() {   // four-point twinkle
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,0.9)');
  grd.addColorStop(0.15, 'rgba(255,255,255,0.35)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#fff';
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const r = i % 2 ? 3 : 31, a = (i / 8) * Math.PI * 2;
    g.lineTo(32 + Math.sin(a) * r, 32 + Math.cos(a) * r);
  }
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function pennantTexture(bg) {   // pastel flag with white polka dots
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = 'rgba(255,255,255,0.9)';
  for (let row = 0, y = 12; y < 128; y += 21, row++) {
    for (let x = row % 2 ? 0 : 10.5; x < 132; x += 21) {
      g.beginPath();
      g.arc(x, y, 4, 0, Math.PI * 2);
      g.fill();
    }
  }
  g.fillRect(0, 0, 128, 7);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// one physical material per (material, look), shared between clones
const looks = new Map();
function tinted(m, props) {
  const key = m.name + JSON.stringify(props);
  if (!looks.has(key)) {
    looks.set(key, new THREE.MeshPhysicalMaterial({
      name: m.name, color: m.color, roughness: m.roughness, metalness: m.metalness, vertexColors: m.vertexColors, ...props,
    }));
  }
  return looks.get(key);
}

const controls = new OrbitControls(camera, canvas);
Object.assign(controls, {
  enabled: false, enableZoom: false, enablePan: false, enableDamping: true, dampingFactor: 0.08,
  rotateSpeed: 0.6, autoRotate: false,
  minPolarAngle: THREE.MathUtils.degToRad(55), maxPolarAngle: THREE.MathUtils.degToRad(84),
  minAzimuthAngle: -0.75, maxAzimuthAngle: 0.75,   // the party is set up in front; the cake turns by itself
});

// Frame a box so it fits between the title and the button, on tall phones and wide screens alike.
let framed = null;
function framing(box, elevDeg, azimuth = 0, marginX = 1.2) {
  const size = box.getSize(new THREE.Vector3()), target = box.getCenter(new THREE.Vector3());
  const e = THREE.MathUtils.degToRad(elevDeg);
  const vf = THREE.MathUtils.degToRad(camera.fov) / 2;
  const hf = Math.atan(Math.tan(vf) * camera.aspect);
  const depth = Math.max(size.x, size.z);
  const tall = size.y * Math.cos(e) + size.z * Math.sin(e);
  const dist = Math.max((tall / 2 / Math.tan(vf)) * 1.55, (size.x / 2 / Math.tan(hf)) * marginX) + depth / 2;
  const dir = new THREE.Vector3(Math.sin(azimuth) * Math.cos(e), Math.sin(e), Math.cos(azimuth) * Math.cos(e));
  return { target, pos: target.clone().addScaledVector(dir, dist) };
}
function frame(box, elevDeg, marginX = 1.2) {
  framed = { box, elevDeg, marginX };
  const f = framing(box, elevDeg, controls.getAzimuthalAngle(), marginX);
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
  if (framed) frame(framed.box, framed.elevDeg, framed.marginX);
}
addEventListener('resize', resize);
resize();

// ------------------------------------------------------------------ loading
const draco = new DRACOLoader().setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/libs/draco/gltf/');
const loader = new GLTFLoader().setDRACOLoader(draco);
const progress = { cake: 0, decor: 0, gift: 0 };
function load(url, key) {
  return new Promise((resolve, reject) => loader.load(url, resolve, (e) => {
    if (e.total) progress[key] = e.loaded / e.total;
    $('#progress').style.width = `${(progress.cake * 0.78 + progress.decor * 0.19 + progress.gift * 0.03) * 92}%`;
  }, reject));
}

// ------------------------------------------------------------------ cake
let cake, cakeBox, candleLight;
const flames = [];
let wished = false, cakeReadyAt = Infinity;
const turntable = new THREE.Group();   // stand + cake, slowly turning
const STAND_H = 0.3;
const CANDY = { roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.05 };
const CAKE_LOOK = {
  Icing_Glossy_White: { roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.2, sheen: 0.3, sheenColor: 0xffffff },
  Cream_Piped: { roughness: 0.5, sheen: 0.7, sheenColor: 0xffffff },
  Cake_Pastel_Pink: { roughness: 0.7, sheen: 0.8, sheenColor: 0xffe4ee, sheenRoughness: 0.5 },
  Ribbon_Glossy_Orange: { roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 },
  Ribbon_Glossy_Red: { roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 },
  Pearl_Sky_Blue: { roughness: 0.18, clearcoat: 1, iridescence: 0.7, iridescenceIOR: 1.5 },
};

function setupCake(gltf) {
  cake = gltf.scene;
  cake.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
    const name = o.material.name;
    const look = CAKE_LOOK[name] || (name.startsWith('Ref_Candy') ? CANDY : name.startsWith('Web_Candle') ? { roughness: 0.4, clearcoat: 0.5 } : null);
    if (look) o.material = tinted(o.material, look);
  });
  const stand = make('Stand');   // modelled with the plate top at 0 and the foot at -STAND_H
  stand.position.y = cake.position.y = STAND_H;
  turntable.add(stand, cake);
  cakeBox = new THREE.Box3().setFromObject(turntable);
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
  cake.add(candleLight);
  turntable.add(blob(1.2));
  turntable.visible = false;
  world.add(turntable);
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
  turntable.visible = true;
  frame(cakeBox, 14, 1.3);
  controls.enabled = true;
  turntable.scale.setScalar(0.001);
  tween(1000, (e) => turntable.scale.setScalar(Math.max(e, 0.001)), { easing: ease.outBack, delay: 300 });
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

// ------------------------------------------------------------------ party decorations (modelled in Blender, decor.glb)
const decor = new THREE.Group();
const balloons = [], floaters = [], pennants = [];
let decorGltf, falling, sparkles, fairy;
const UP = new THREE.Vector3(0, 1, 0);
const CONFETTI = ['#ff8fb8', '#ffc2d8', '#c9b3ff', '#f6cf6e', '#9fe3c9', '#8fd0ff', '#ffffff'];
const latex = (color) => ({ Balloon_Latex: { color, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1, sheen: 0.5, sheenColor: 0xffffff } });
const foil = (color) => ({ Heart_Foil: { color, metalness: 0.65, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.1 } });
const candy = (color) => ({ Heart_Foil: { color, metalness: 0, ...CANDY } });
const wrapping = (p, r) => ({ Gift_Paper: { color: p, roughness: 0.45, clearcoat: 0.35 }, Gift_Ribbon: { color: r, roughness: 0.3, clearcoat: 0.6 } });

function make(name, tints = {}, shadow = true) {
  const obj = decorGltf.scene.getObjectByName(name).clone(true);
  obj.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = shadow;
    o.receiveShadow = true;
    if (tints[o.material.name]) o.material = tinted(o.material, tints[o.material.name]);
  });
  return obj;
}

function place(obj, [x, y, z], rotY = 0, scale = 1) {
  obj.position.set(x, y, z);
  obj.rotation.y = rotY;
  obj.scale.setScalar(scale);
  decor.add(obj);
  return obj;
}

const stringMat = new THREE.MeshStandardMaterial({ color: 0xfff3f7, roughness: 0.5 });
function balloon(kind, look, anchor, knot, scale) {
  const holder = new THREE.Group();          // pivots at the tie point, so the whole balloon sways on its string
  holder.position.set(...anchor);
  const rel = new THREE.Vector3(...knot).sub(holder.position);
  const bend = (k, s) => rel.clone().multiplyScalar(k).add(new THREE.Vector3(rand(-s, s), 0, rand(-s, s)));
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(), bend(0.3, 0.04), bend(0.6, 0.05), bend(0.85, 0.02), rel]);
  const lean = new THREE.Group();            // tilts the balloon along the string
  lean.position.copy(rel);
  lean.quaternion.setFromUnitVectors(UP, rel.clone().sub(curve.getPoint(0.9)).normalize());
  const body = make(kind, look, false);
  body.scale.setScalar(scale);
  lean.add(body);
  holder.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.0026, 5), stringMat), lean);
  decor.add(holder);
  balloons.push({ holder, body, seed: rand(0, 6) });
}

function bunting() {
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const x = -3 + (6 * i) / 40, k = (x / 3) ** 2;
    pts.push(new THREE.Vector3(x, 1.74 + 0.55 * k, -1.15 + 0.25 * k));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  decor.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 160, 0.004, 5), stringMat));
  const flag = new THREE.BufferGeometry();
  flag.setAttribute('position', new THREE.Float32BufferAttribute([-0.07, 0, 0, 0.07, 0, 0, 0, -0.16, 0], 3));
  flag.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 0.5, 0], 2));
  flag.computeVertexNormals();
  const mats = ['#ffb3cf', '#d9c4ff', '#b8ecd7', '#ffd6b0', '#fff0b3'].map((c) =>
    new THREE.MeshStandardMaterial({ map: pennantTexture(c), side: THREE.DoubleSide, roughness: 0.85 }));
  const N = 34;
  for (let i = 0; i < N; i++) {
    const u = (i + 0.5) / N, tan = curve.getTangentAt(u);
    const holder = new THREE.Group();
    holder.position.copy(curve.getPointAt(u));
    holder.rotation.z = Math.atan2(tan.y, tan.x);
    const m = new THREE.Mesh(flag, mats[i % mats.length]);
    holder.add(m);
    decor.add(holder);
    pennants.push({ m, seed: i * 0.9 });
  }
  // fairy lights between the flags: tiny bulbs plus additive glow points, twinkling
  const M = N + 1;
  const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.012, 10, 8), new THREE.MeshBasicMaterial({ toneMapped: false }), M);
  const glowPos = new Float32Array(M * 3);
  const d = new THREE.Object3D();
  for (let i = 0; i < M; i++) {
    d.position.copy(curve.getPointAt(i / N)).add(new THREE.Vector3(0, -0.018, 0.004));
    d.updateMatrix();
    bulbs.setMatrixAt(i, d.matrix);
    bulbs.setColorAt(i, new THREE.Color(1, 0.85, 0.55));
    d.position.toArray(glowPos, i * 3);
  }
  const glowGeo = new THREE.BufferGeometry();
  glowGeo.setAttribute('position', new THREE.BufferAttribute(glowPos, 3));
  glowGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(M * 3), 3));
  const glow = new THREE.Points(glowGeo, new THREE.PointsMaterial({
    map: softTex, size: 0.16, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  }));
  bulbs.frustumCulled = glow.frustumCulled = false;
  decor.add(bulbs, glow);
  fairy = { bulbs, glow, n: M, seeds: Array.from({ length: M }, () => rand(0, 6)), c: new THREE.Color() };
}

function floorConfetti() {
  const n = 280;
  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.034, 0.016).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ roughness: 0.5, side: THREE.DoubleSide }), n);
  const d = new THREE.Object3D(), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const r = 0.78 + Math.random() ** 0.8 * 2.2, a = rand(0, Math.PI * 2);
    d.position.set(Math.cos(a) * r, 0.002, Math.sin(a) * r * 0.85);
    d.rotation.set(rand(-0.12, 0.12), rand(0, Math.PI * 2), rand(-0.12, 0.12));
    d.scale.setScalar(rand(0.7, 1.25));
    d.updateMatrix();
    mesh.setMatrixAt(i, d.matrix);
    mesh.setColorAt(i, c.set(CONFETTI[i % CONFETTI.length]));
  }
  mesh.receiveShadow = true;
  decor.add(mesh);
}

function respawnPiece(p, anywhere) {
  Object.assign(p, {
    x: rand(-2.3, 2.3), z: rand(-1.5, 1.3), y: anywhere ? rand(0, 3.2) : 3.2, v: rand(0.1, 0.22),
    rx: rand(0, 6), ry: rand(0, 6), sx: rand(1, 3.5), sy: rand(0.5, 2), ph: rand(0, 6),
  });
  return p;
}

function setupFalling() {
  const n = 90;
  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.03, 0.015),
    new THREE.MeshStandardMaterial({ roughness: 0.5, side: THREE.DoubleSide }), n);
  for (let i = 0; i < n; i++) mesh.setColorAt(i, new THREE.Color(CONFETTI[(i * 3) % CONFETTI.length]));
  mesh.frustumCulled = false;
  decor.add(mesh);
  falling = { mesh, pieces: Array.from({ length: n }, () => respawnPiece({}, true)), d: new THREE.Object3D() };
}

function resetFloater(f, anywhere) {
  do { f.x = rand(-2.3, 2.3); f.z = rand(-1.7, -0.45); } while (Math.abs(f.x) < 0.55 && f.z > -1.05);
  f.y = anywhere ? rand(0.2, FLOAT_TOP) : 0.05;
}
const FLOAT_TOP = 2.15;   // fade out before drifting up behind the title

function setupFloaters() {
  const hearts = ['#ff8fb8', '#ffb3cf', '#d9b8ff', '#ff6f9f'];
  for (let i = 0; i < 12; i++) {
    const star = i % 3 === 2;
    const obj = star ? make('Star', {}, false) : make('Heart', candy(hearts[i % hearts.length]), false);
    if (!star) obj.getObjectByName('Heart_Valve').visible = false;
    const f = { obj, base: star ? rand(0.6, 0.85) : rand(0.2, 0.32), v: rand(0.05, 0.1), seed: rand(0, 6) };
    resetFloater(f, true);
    decor.add(obj);
    floaters.push(f);
  }
}

function setupSparkles() {
  const n = 36;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    map: sparkleTexture(), size: 0.11, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  }));
  pts.frustumCulled = false;
  decor.add(pts);
  sparkles = { pts, n, st: Array.from({ length: n }, () => ({ speed: rand(0.7, 1.6), seed: rand(0, 6), prev: 0 })) };
  for (let i = 0; i < n; i++) moveSparkle(i);
}
function moveSparkle(i) {
  sparkles.pts.geometry.attributes.position.setXYZ(i, rand(-1.9, 1.9), rand(0.15, 2.5), rand(-1.3, 1.0));
  sparkles.pts.geometry.attributes.position.needsUpdate = true;
}

function setupDecor(giftGltf) {
  // little gifts on the floor hold the balloon strings
  const giftAt = (pos, rot, s, look) => {
    const g = giftGltf.scene.clone(true);
    g.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = o.receiveShadow = true;
      o.material = tinted(o.material, look[o.material.name]);
    });
    return place(g, pos, rot, s);
  };
  giftAt([-0.8, 0, -0.52], 0.5, 0.3, wrapping('#ffd1a6', '#ffffff'));
  giftAt([0.84, 0, -0.46], -0.4, 0.27, wrapping('#b5dcff', '#ff9ec4'));
  giftAt([1.75, 0, -0.35], 0.2, 0.34, wrapping('#ffb3cf', '#f6cf6e'));
  giftAt([1.98, 0, 0.05], -0.6, 0.22, wrapping('#c7b2ff', '#ffffff'));

  balloon('Balloon', latex('#ffadc9'), [-0.8, 0.3, -0.52], [-0.9, 1.22, -0.64], 0.85);
  balloon('Balloon', latex('#cdb4ff'), [-0.8, 0.3, -0.52], [-0.6, 1.08, -0.78], 0.75);
  balloon('Heart', foil('#f2c46d'), [-0.8, 0.3, -0.52], [-1.0, 0.95, -0.42], 0.8);
  balloon('Balloon', latex('#a8e6cf'), [0.84, 0.27, -0.46], [0.92, 1.2, -0.6], 0.85);
  balloon('Balloon', latex('#ffd1a6'), [0.84, 0.27, -0.46], [0.64, 1.05, -0.74], 0.72);
  balloon('Heart', foil('#ffbcd2'), [0.84, 0.27, -0.46], [1.02, 0.93, -0.36], 0.8);
  // wider screens see a little more of the party
  balloon('Balloon', latex('#b5dcff'), [1.75, 0.37, -0.35], [1.7, 1.45, -0.55], 0.9);
  balloon('Balloon', latex('#fff0a6'), [1.75, 0.37, -0.35], [1.98, 1.3, -0.45], 0.8);
  balloon('Balloon', latex('#ffadc9'), [-1.8, 0.0, -0.6], [-1.75, 1.5, -0.7], 0.9);
  balloon('Heart', foil('#c9b3ff'), [-1.8, 0.0, -0.6], [-2.05, 1.25, -0.5], 0.85);
  balloon('Balloon', latex('#a8e6cf'), [-1.8, 0.0, -0.6], [-1.55, 1.3, -0.85], 0.75);

  place(make('Cupcake', { Cupcake_Frosting: { color: '#ffc2dc', roughness: 0.5, sheen: 0.6, sheenColor: 0xffffff } }), [-0.62, 0, 0.9], 0.4);
  place(make('Cupcake', { Cupcake_Frosting: { color: '#c9f0dd', roughness: 0.5, sheen: 0.6, sheenColor: 0xffffff } }), [-1.55, 0, 0.55], 2.1, 0.9);
  const shells = ['#ffb3cf', '#b8ecd7', '#d9c4ff', '#fff0a6'];
  shells.slice(0, 3).forEach((c, i) => {
    place(make('Macaron', { Macaron_Shell: { color: c, roughness: 0.6, sheen: 0.7, sheenColor: 0xffffff } }),
      [0.6 + rand(-0.008, 0.008), i * 0.112, 0.86 + rand(-0.008, 0.008)], rand(0, 6));
  });
  const leaning = place(make('Macaron', { Macaron_Shell: { color: shells[3], roughness: 0.6, sheen: 0.7, sheenColor: 0xffffff } }), [0.73, 0.075, 0.95], 0);
  leaning.rotation.set(0, 0.6, 1.25);
  const hat = place(make('PartyHat'), [-0.98, 0.1, 0.42], 0);
  hat.rotation.set(0.1, 0.9, 1.45);
  place(make('PartyHat'), [1.45, 0, 0.55], 0, 1.1);

  bunting();
  floorConfetti();
  setupFalling();
  setupFloaters();
  setupSparkles();
  world.add(decor);
}

function animateDecor(t, dt) {
  for (const b of balloons) {
    b.holder.rotation.z = Math.sin(t * 0.7 + b.seed) * 0.045;
    b.holder.rotation.x = Math.sin(t * 0.53 + b.seed * 1.7) * 0.035;
    b.body.rotation.y = Math.sin(t * 0.4 + b.seed) * 0.5;
  }
  for (const p of pennants) p.m.rotation.x = Math.sin(t * 1.7 + p.seed) * 0.2;
  for (const f of floaters) {
    f.y += f.v * dt;
    if (f.y > FLOAT_TOP) resetFloater(f, false);
    const k = THREE.MathUtils.smoothstep(f.y, 0.05, 0.5) * (1 - THREE.MathUtils.smoothstep(f.y, FLOAT_TOP - 0.45, FLOAT_TOP));
    f.obj.position.set(f.x + Math.sin(t * 0.5 + f.seed) * 0.08, f.y, f.z);
    f.obj.rotation.set(0, t * 0.7 + f.seed, Math.sin(t * 0.8 + f.seed) * 0.2);
    f.obj.scale.setScalar(Math.max(f.base * k, 0.001));
  }
  const { mesh, pieces, d } = falling;
  pieces.forEach((p, i) => {
    p.y -= p.v * dt;
    if (p.y < 0.02) respawnPiece(p, false);
    p.rx += p.sx * dt;
    p.ry += p.sy * dt;
    d.position.set(p.x + Math.sin(t * 1.3 + p.ph) * 0.06, p.y, p.z + Math.cos(t * 1.1 + p.ph) * 0.04);
    d.rotation.set(p.rx, p.ry, p.ph);
    d.updateMatrix();
    mesh.setMatrixAt(i, d.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;

  const glowCol = fairy.glow.geometry.attributes.color;
  for (let i = 0; i < fairy.n; i++) {
    const b = 0.55 + 0.45 * Math.sin(t * 2.2 + fairy.seeds[i] * 3) * Math.sin(t * 0.9 + fairy.seeds[i]);
    fairy.c.setRGB(1, 0.82, 0.5).multiplyScalar(0.5 + 0.5 * b);
    fairy.bulbs.setColorAt(i, fairy.c);
    glowCol.setXYZ(i, b * 0.9, b * 0.7, b * 0.4);
  }
  fairy.bulbs.instanceColor.needsUpdate = true;
  glowCol.needsUpdate = true;

  const sc = sparkles.pts.geometry.attributes.color;
  sparkles.st.forEach((s, i) => {
    const w = Math.sin(t * s.speed + s.seed);
    if (w > 0 && s.prev <= 0) moveSparkle(i);    // jump somewhere new each time it fades in
    s.prev = w;
    const b = Math.max(0, w) ** 3;
    sc.setXYZ(i, b, b * 0.94, b * 0.8);
  });
  sc.needsUpdate = true;
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
  await tween(650, (e) => turntable.scale.setScalar(Math.max(1 - e, 0.001)), { easing: ease.inBack });
  turntable.visible = false;
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
  animateDecor(t, dt);
  stepPuffs(dt);
  if (turntable.visible) turntable.rotation.y += dt * 0.16;
  if (controls.enabled) controls.update();
  renderer.render(world, camera);
}
requestAnimationFrame(loop);

try {
  const [cakeGltf, decorLoaded, giftGltf] = await Promise.all([
    load('assets/cake.glb', 'cake'), load('assets/decor.glb', 'decor'), load('assets/gift.glb', 'gift'),
  ]);
  decorGltf = decorLoaded;
  setupCake(cakeGltf);
  setupDecor(giftGltf);
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
