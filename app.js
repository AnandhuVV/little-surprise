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
  const el = $('#' + id);
  el.classList.add('active', 'arriving');
  setTimeout(() => el.classList.remove('arriving'), 900);
  document.body.dataset.scene = id;
  scene = id;
  setTheme();
}
// Android tints the browser's bar with theme-color: pink on the pastel pages, the room's colour (or black) in the 3D party
let blackout = 1;
function setTheme() {
  const inRoom = scene === 'cake' || scene === 'gifts';
  const color = inRoom ? '#' + new THREE.Color(BG.theme).lerp(new THREE.Color(0), blackout).getHexString() : '#ece4ff';
  document.querySelector('meta[name="theme-color"]').content = color;
}
function swapText(el, text) {
  el.classList.add('swap');
  setTimeout(() => { el.textContent = text; el.classList.remove('swap'); }, 450);
}

// ------------------------------------------------------------------ confetti
const COLORS = ['#b79df0', '#d9c8ff', '#8c66dc', '#f7a8cf', '#f2c46d', '#ffffff'];   // lavender first: her favourite colour
const fire = (opts) => window.confetti?.({ colors: COLORS, disableForReducedMotion: true, ...opts });
const heartShape = window.confetti?.shapeFromPath?.({
  path: 'M167 72c19,-38 37,-56 75,-56 42,0 76,33 76,75 0,76 -76,151 -151,227 -76,-76 -151,-151 -151,-227 0,-42 33,-75 75,-75 38,0 57,18 76,56z',
});

// ------------------------------------------------------------------ floating hearts behind everything
const sky = (() => {
  const cv = $('#sky');
  const ctx = cv.getContext('2d');
  const tints = ['#b99cf7', '#d2bfff', '#a98bff', '#f7b3d6', '#ffffff', '#ffffff'];
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
  constructor() { this.ctx = null; this.on = true; this.level = VOLUME; }

  start() {
    if (this.ctx) { this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (navigator.audioSession) navigator.audioSession.type = 'playback';   // iPhones: play through the silent switch, as Android does
    const c = (this.ctx = new AC());
    this.master = c.createGain();
    this.master.gain.value = 0;
    this.master.connect(c.destination);
    this.sfx = c.createGain();   // the balloon pops: muted with the music, but never ducked
    this.sfx.gain.value = this.on ? 1 : 0;
    this.sfx.connect(c.destination);
    this.bus = c.createGain();
    const delay = c.createDelay(1), feedback = c.createGain(), wet = c.createGain();
    delay.delayTime.value = 0.33;
    feedback.gain.value = 0.3;
    wet.gain.value = 0.28;
    this.bus.connect(this.master);
    this.bus.connect(delay);
    delay.connect(feedback).connect(delay);
    delay.connect(wet).connect(this.master);
    this.master.gain.setTargetAtTime(this.level, c.currentTime, 0.8);   // not a ramp: a ramp would override the dark room's duck
    this.next = c.currentTime + 0.5;
    this.schedule();
    document.addEventListener('visibilitychange', () => (document.hidden ? c.suspend() : c.resume()));
  }

  wake() {   // if the phone suspended the audio while she was in another app, her next tap brings it back
    if (this.ctx && this.ctx.state !== 'running' && !document.hidden) this.ctx.resume();
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

  noise(seconds) {
    const c = this.ctx;
    const buf = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    return src;
  }

  whoosh() {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    const src = this.noise(0.8), bp = c.createBiquadFilter(), g = c.createGain();
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

  pop() {   // a sharp latex snap plus a soft low thump; skips the ducked music level
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    const src = this.noise(0.15), hp = c.createBiquadFilter(), g = c.createGain();
    hp.type = 'highpass';
    hp.frequency.value = 900;
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    src.connect(hp).connect(g).connect(this.sfx);
    src.start(t);
    const o = c.createOscillator(), og = c.createGain();
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(55, t + 0.1);
    og.gain.setValueAtTime(0.5, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.connect(og).connect(this.sfx);
    o.start(t);
    o.stop(t + 0.15);
  }

  duck(level) {   // quiet in the dark, back to full when the lights come on
    this.level = level;
    if (this.ctx && this.on) this.master.gain.setTargetAtTime(level, this.ctx.currentTime, 0.5);
  }

  toggle() {
    this.on = !this.on;
    if (this.ctx) {
      this.master.gain.setTargetAtTime(this.on ? this.level : 0, this.ctx.currentTime, 0.15);
      this.sfx.gain.setTargetAtTime(this.on ? 1 : 0, this.ctx.currentTime, 0.05);
    }
    return this.on;
  }
}
const music = new MusicBox();
$('#mute').addEventListener('click', () => {
  const on = music.toggle();
  $('#mute').textContent = on ? '🔊' : '🔇';
  $('#mute').setAttribute('aria-label', on ? 'Mute music' : 'Play music');
});

// ------------------------------------------------------------------ three.js stage (a dark room lit by candles and fairy lights)
const canvas = $('#stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);
renderer.toneMapping = THREE.NeutralToneMapping;   // closest to Blender's "Standard" view, but rolls off the glows
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const world = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
let envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
world.environment = envTarget.texture;
world.environmentIntensity = 0;
// phones can drop the GPU context while she's in another app; three.js restores everything except this map,
// which only ever existed on the GPU
canvas.addEventListener('webglcontextrestored', () => {
  envTarget.dispose();
  envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
  world.environment = envTarget.texture;
});

// The room's backdrop. Neither has a visible floor: the party stands on the page and only its shadows show.
// dark (default): a deep violet room lit by the candles, fairy lights and a spotlight on the cake, for contrast.
// pastel (?bg=pastel): the light lavender page itself, sunlit, with soft violet shadows.
// Both start black; the balloon pops reveal them.
// exposure and cakeEnv keep the white icing from burning out: the dark room's spotlit cake needs less of both.
const BACKDROPS = {
  dark: {
    fog: 0x1e1540, shadow: [0x000000, 0.35], blob: [0x0b0719, 0.4], moon: [0xd9ccff, 0x2b2050, 0.7], envMax: 0.25,
    blackout: [0.7, 0.35], spot: 16, party: 1.1, decorEnv: 0.5, exposure: 0.75, cakeEnv: 0.45, theme: '#170f2e',
  },
  pastel: {
    fog: null, shadow: [0x6c4fa8, 0.16], blob: [0x664a9b, 0.22], moon: [0xf7f2ff, 0xd8c8ff, 0.7], envMax: 0.75,
    blackout: [0.85, 0.6], spot: 0, sun: 2.0, rim: 0.9, exposure: 1, cakeEnv: 0.8, theme: '#ece4ff',
  },
};
const BG_NAME = params.get('bg') in BACKDROPS ? params.get('bg') : 'dark';
const BG = BACKDROPS[BG_NAME];
document.body.dataset.bg = BG_NAME;
renderer.toneMappingExposure = BG.exposure;
world.fog = BG.fog ? new THREE.Fog(BG.fog, 7.5, 15) : null;

const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 40);

// Every light is a "lamp" with a level (0..1) that the balloon pops switch on; max is its full brightness.
const lamps = {};
function lamp(name, light, max, flicker = 0) {
  light.intensity = 0;
  world.add(light);
  lamps[name] = { light, max, level: 0, flicker, seed: rand(0, 50) };
  return light;
}
const room = { env: 0, envMax: BG.envMax };
lamp('moon', new THREE.HemisphereLight(BG.moon[0], BG.moon[1]), BG.moon[2]);
const spot = lamp('spot', new THREE.SpotLight(0xfff6f2, 0, 0, 0.36, 0.75, 2), BG.spot);   // the dark room's key light on the cake
spot.position.set(-1.1, 3.3, 2.1);
spot.target.position.set(0, 0.6, 0);
spot.castShadow = BG.spot > 0;
spot.shadow.mapSize.set(1024, 1024);
Object.assign(spot.shadow.camera, { near: 1, far: 8 });
spot.shadow.bias = -0.0004;
spot.shadow.normalBias = 0.02;
world.add(spot.target);
if (BG.party) {   // a soft white light over the whole party, so the decorations keep their colours in the dark room
  lamp('party', new THREE.DirectionalLight(0xfff4ee, 0), BG.party).position.set(-2.2, 3, 3.2);
}
if (BG.spot) {   // the rest of the cake's studio lights from the Blender scene, in narrow cones that only reach the cake:
  // a cool fill from the front right and pink rims from behind on either side
  for (const [name, color, max, pos] of [['fill', 0xeef2ff, 4, [1.8, 1.4, 2.3]], ['rimL', 0xebe2ff, 6, [-1.7, 1.6, -1.9]],
    ['rimR', 0xebe2ff, 6, [1.7, 1.6, -1.9]]]) {
    const s = lamp(name, new THREE.SpotLight(color, 0, 0, 0.34, 0.8, 2), max);
    s.position.set(...pos);
    s.target = spot.target;
  }
}
if (BG.sun) {   // the pastel room: a soft sun with shadows, and a pink back light that gives icing and balloons a glowing edge
  const sun = lamp('sun', new THREE.DirectionalLight(0xfff4ec, 0), BG.sun);
  sun.position.set(1.4, 3.2, 2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -2.4, right: 2.4, top: 2.4, bottom: -2.4, near: 0.5, far: 9 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.015;
  lamp('rim', new THREE.DirectionalLight(0xdcd0ff, 0), BG.rim).position.set(-1.5, 2.5, -3);
}
lamp('fairy', new THREE.PointLight(0xffc27a, 0, 0, 2), 0.45, 0.08).position.set(0, 1.5, -0.9);
lamp('left', new THREE.PointLight(0xffa457, 0, 0, 2), 0.32, 0.18).position.set(-0.55, 0.32, 0.72);
lamp('right', new THREE.PointLight(0xffa457, 0, 0, 2), 0.32, 0.18).position.set(0.58, 0.32, 0.72);
lamp('back', new THREE.PointLight(0xffa457, 0, 0, 2), 0.3, 0.18).position.set(0, 0.32, -0.95);

const fogLit = new THREE.Color(BG.fog ?? 0);
function updateLamps(t) {
  for (const L of Object.values(lamps)) {
    const f = L.flicker ? 1 - L.flicker * (0.5 + 0.5 * Math.sin(t * 9.3 + L.seed) * Math.sin(t * 5.7 + L.seed * 2)) : 1;
    L.light.intensity = L.max * L.level * f;
  }
  world.environmentIntensity = room.env;
  const lit = room.env / room.envMax;
  world.fog?.color.setRGB(0, 0, 0).lerp(fogLit, lit);   // fog glows even unlit, so it rises with the room
  for (const m of blobLooks) m.opacity = BG.blob[1] * lit;
  for (const m of starLooks) m.emissiveIntensity = 0.8 * lit;
  for (const m of latexLooks) m.emissiveIntensity = 0.18 * lit;
  floor.material.opacity = BG.shadow[1] * lit;   // shadow maps are drawn even with the lights off
}

// switching on: a few stuttering flickers, then a smooth rise
function switchOn(target, { delay = 0, ms = 800, key = 'level', to = 1 } = {}) {
  return tween(ms, (e) => {
    target[key] = (e < 0.55 && Math.random() > 0.3 + e ? e * 0.15 : e) * to;
  }, { delay, easing: ease.inOutSine });
}

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

// an invisible floor that only shows the shadows falling on it
const floor = new THREE.Mesh(new THREE.CircleGeometry(4, 72), new THREE.ShadowMaterial({ color: BG.shadow[0], opacity: 0 }));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
floor.renderOrder = -1;
world.add(floor);

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

const blobLooks = [];   // unlit, so updateLamps fades them in with the room
function blob(size) {   // soft contact shadow
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ map: softTex, color: BG.blob[0], transparent: true, opacity: 0, depthWrite: false }));
  blobLooks.push(m.material);
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.003;
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
let framed = null, shiftY = 0;
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
function setShift(px) {   // moves the whole picture down the screen
  shiftY = px;
  camera.setViewOffset(innerWidth, innerHeight, 0, -px, innerWidth, innerHeight);
  camera.updateProjectionMatrix();
}
const screenY = (v) => ((1 - v.clone().project(camera).y) / 2) * innerHeight;
// view: { box, elevDeg, marginX, azimuth (default: wherever she has turned the cake to), roof, sceneEl }
// roof: a point that has to show below the scene's title block (the bunting), while the box's front foot stays above
// its button. Short screens (Samsung Internet's two toolbars, a long name) move the party down or step back for it.
function frame(view) {
  framed = view;
  const { box, elevDeg, marginX, roof, sceneEl } = view;
  const f = framing(box, elevDeg, view.azimuth ?? controls.getAzimuthalAngle(), marginX);
  camera.position.copy(f.pos);
  controls.target.copy(f.target);
  camera.lookAt(f.target);
  setShift(innerHeight * 0.06);   // nudge the 3D content below the title
  if (!roof) return;
  const top = sceneEl.querySelector('.top'), bottom = sceneEl.querySelector('.bottom');
  const minY = top.offsetTop + top.offsetHeight + 6, maxY = bottom.offsetTop;
  if (maxY - minY < innerHeight * 0.35) return;   // a phone on its side: no room to be clever
  const foot = new THREE.Vector3(f.target.x, box.min.y, box.max.z);
  camera.updateMatrixWorld();
  if (screenY(roof) >= minY) return;   // tall screens: already clear
  for (let i = 0; i < 3; i++) {   // too tall for the gap: step back until it fits
    const span = screenY(foot) - screenY(roof);
    if (span <= maxY - minY) break;
    camera.position.lerp(f.target, 1 - (span / (maxY - minY)) * 1.02);
    camera.updateMatrixWorld();
  }
  setShift(shiftY + Math.max(0, Math.min(minY - screenY(roof), maxY - screenY(foot))));
}
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  setShift(h * 0.06);
  if (framed) frame(framed);
}
addEventListener('resize', resize);
resize();

const raycaster = new THREE.Raycaster();
const ndc = (x, y) => new THREE.Vector2((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
const toScreen = (v) => { const p = v.clone().project(camera); return { x: (p.x + 1) / 2, y: (1 - p.y) / 2 }; };

// ------------------------------------------------------------------ loading
const draco = new DRACOLoader().setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/libs/draco/gltf/');
const loader = new GLTFLoader().setDRACOLoader(draco);
const progress = { cake: 0, decor: 0 };
function load(url, key) {
  return new Promise((resolve, reject) => loader.load(url, resolve, (e) => {
    if (e.total) progress[key] = e.loaded / e.total;
    $('#progress').style.width = `${(progress.cake * 0.62 + progress.decor * 0.38) * 92}%`;
  }, reject));
}

// ------------------------------------------------------------------ cake
let cake, cakeBox, candleLight, cakeView;
const flames = [];
let wished = false, cakeReadyAt = Infinity;
const turntable = new THREE.Group();   // stand + cake, slowly turning
const STAND_H = 0.3;
const CANDLE_MAX = 0.16;
const CANDY = { roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.05 };
const CAKE_LOOK = {
  Icing_Glossy_White: { roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.2, sheen: 0.3, sheenColor: 0xffffff },
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
    // the cake reflects a bright studio like in Blender, however dark the room is (scaled by the room's level as it lights up)
    o.material.envMapIntensity = BG.cakeEnv / BG.envMax;
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
      o.material.emissiveIntensity = 1.6;   // keeps the flame golden instead of tone-mapping to white
    });
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: softTex, color: 0xffa04a, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false,
    }));
    glow.position.copy(f.position).add(new THREE.Vector3(0, 0.024, 0));
    glow.scale.setScalar(0.2);
    cake.add(glow);
    f.userData = { base: f.scale.clone(), life: 0, glow, seed: rand(0, 100) };   // unlit until the last balloon pops
    flames.push(f);
  }
  // in the world, not on the cake: hiding the cake would hide the light too, and a change in the number of lights
  // recompiles every shader (a freeze right when the gifts arrive)
  candleLight = new THREE.PointLight(0xffa860, 0, 0, 2);
  candleLight.position.set(0, STAND_H + 1.13, 0);
  world.add(candleLight);
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
    glow.visible = f.visible;
    glow.material.opacity = life * (0.8 + 0.2 * Math.sin(t * 17 + seed));
    total += life * k;
  }
  if (candleLight) candleLight.intensity = CANDLE_MAX * (total / Math.max(flames.length, 1));
}

const puffs = [];
function puff(f) {
  const p = f.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.015, 0));
  for (let i = 0; i < 7; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, color: 0xaea8c2, transparent: true, opacity: 0, depthWrite: false }));
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
const balloons = [], floaters = [], pennants = [], roomCandles = [];
const votiveGlass = new Set();
let decorGltf, falling, sparkles, fairy, rice;
const UP = new THREE.Vector3(0, 1, 0);
const WARM = new THREE.Color(1, 0.8, 0.5), BULB_OFF = new THREE.Color(0.012, 0.009, 0.009);
const CONFETTI = ['#a98bff', '#c9b3ff', '#8c66dc', '#ff9cc8', '#f6c34e', '#7fa8ff', '#ffffff'];
// a faint glow of their own colour (rising with the room lights) keeps the warm and light balloons from going muddy
const latex = (color) => ({ Balloon_Latex: { color, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1, sheen: 0.5, sheenColor: 0xffffff, emissive: color, emissiveIntensity: 0 } });
const foil = (color) => ({ Heart_Foil: { color, metalness: 0.65, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.1 } });
const jelly = (color) => ({ Jelly: { color, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.04, sheen: 0.3, sheenColor: 0xeee4ff } });

// dreamy gift boxes: a soft vertical gradient painted per box (bottom, middle, top), satin ribbon, glowing sparkle stars,
// and a pale inside that shows when the lid comes off
const GIFT_TOP = 0.88;  // the lid's top in the model (web_decor.py): the gradient runs from the floor up to it
const starLooks = [];   // the stars glow up with the room, so the dark room stays dark
const latexLooks = new Set();   // so do the room's balloons
const DREAMS = [
  { stops: ['#ff70b6', '#ff99cb', '#ffc4e1'], ribbon: '#a98bff' },
  { stops: ['#6c88ff', '#93a6ff', '#c6d0ff'], ribbon: '#ffffff' },
  { stops: ['#9163ff', '#b18cff', '#d6c4ff'], ribbon: '#ff9cc8' },   // lavender, front and centre
  { stops: ['#8a5cff', '#ab86ff', '#d1beff'], ribbon: '#f6cf6e' },
  { stops: ['#cf78f0', '#b28cff', '#d8c8ff'], ribbon: '#ffffff' },
];
function dreamGift({ stops, ribbon }) {
  const g = make('DreamGift');
  g.updateMatrixWorld(true);
  const cs = stops.map((h) => new THREE.Color(h)), v = new THREE.Vector3(), c = new THREE.Color();
  g.traverse((o) => {
    if (!o.isMesh) return;
    const name = o.material.name;
    if (name === 'Dream_Paper') {
      o.geometry = o.geometry.clone();
      const pos = o.geometry.attributes.position, col = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i++) {
        const t = THREE.MathUtils.clamp(v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld).y / GIFT_TOP, 0, 1);
        if (t < 0.5) c.lerpColors(cs[0], cs[1], t * 2); else c.lerpColors(cs[1], cs[2], t * 2 - 1);
        c.toArray(col, i * 3);
      }
      o.geometry.setAttribute('color', new THREE.BufferAttribute(col, 3));
      o.material = new THREE.MeshPhysicalMaterial({ name, vertexColors: true, roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.15, sheen: 0.4, sheenColor: 0xffffff });
    } else if (name === 'Dream_Ribbon') {
      o.material = new THREE.MeshPhysicalMaterial({ name, color: ribbon, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.1, sheen: 0.6, sheenColor: 0xffffff });
    } else if (name === 'Dream_Stars') {
      o.material = new THREE.MeshStandardMaterial({ name, color: 0xffffff, emissive: 0xfff0fa, emissiveIntensity: 0, roughness: 0.4 });
      starLooks.push(o.material);
    } else if (name === 'Dream_Inside') {   // its own material per box, like the rest, so a fading lid fades alone
      o.material = new THREE.MeshPhysicalMaterial({ name, color: cs[1].clone().lerp(new THREE.Color(1, 1, 1), 0.6), roughness: 0.6, sheen: 0.4, sheenColor: 0xffffff });
    }
  });
  return g;
}

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

// the dark room gives the decorations their own studio reflections, so glossy balloons and gift boxes still shine
function reflectStudio(group) {
  if (!BG.decorEnv) return;
  group.traverse((o) => {
    if (o.isMesh) for (const m of [].concat(o.material)) if ('envMapIntensity' in m) m.envMapIntensity = BG.decorEnv / BG.envMax;
  });
}

// push pale vertex colours (the clay flowers) towards their hue
function saturate(obj, k) {
  const c = new THREE.Color(), hsl = {};
  obj.traverse((o) => {
    if (!o.isMesh || !o.geometry.attributes.color) return;
    o.geometry = o.geometry.clone();
    const col = o.geometry.attributes.color;
    for (let i = 0; i < col.count; i++) {
      c.fromBufferAttribute(col, i).getHSL(hsl);
      c.setHSL(hsl.h, Math.min(1, hsl.s * k), hsl.l * 0.94);
      col.setXYZ(i, c.r, c.g, c.b);
    }
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

// glowing points that share one material per look; colours are updated every frame for twinkling
function glowPoints(positions, size, map = softTex) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(positions.length), 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    map, size, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  }));
  pts.frustumCulled = false;
  return pts;
}

// ---- candle flames (three.js teardrops with a hot core and a soft additive glow)
const flameGeo = new THREE.LatheGeometry(
  [[0, 0], [0.0055, 0.004], [0.0085, 0.012], [0.0075, 0.022], [0.004, 0.031], [0, 0.04]].map(([x, y]) => new THREE.Vector2(x, y)), 12);
const flameMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.55, 0.18), toneMapped: false, transparent: true, opacity: 0.9, depthWrite: false });
const coreMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.93, 0.7), toneMapped: false });
function makeFlame(glowSize = 0.17) {
  const g = new THREE.Group();
  const core = new THREE.Mesh(flameGeo, coreMat);
  core.scale.set(0.5, 0.55, 0.5);
  core.position.y = 0.002;
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: softTex, color: 0xff9640, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false, opacity: 0,
  }));
  glow.position.y = 0.018;
  glow.scale.setScalar(glowSize);
  g.add(new THREE.Mesh(flameGeo, flameMat), core, glow);
  g.visible = false;
  return { g, glow, life: 0, seed: rand(0, 100) };
}

const FLAME_Y = { Candle_S: 0.098, Candle_M: 0.158, Candle_L: 0.238, Candle_Puddle: 0.058, Votive: 0.036 };
function roomCandle(kind, [x, z], color, cluster) {
  const tints = kind === 'Votive'
    ? { Votive_Glass: { color, transparent: true, opacity: 0.6, roughness: 0.05, clearcoat: 1, emissive: color, emissiveIntensity: 0 } }
    : { Candle_Wax: { color, roughness: 0.55, sheen: 0.6, sheenColor: 0xffffff } };
  const obj = place(make(kind, tints), [x, 0, z], rand(0, 6));
  obj.traverse((o) => { if (o.isMesh && o.material.name === 'Votive_Glass') votiveGlass.add(o.material); });
  const fl = makeFlame(kind === 'Votive' ? 0.24 : 0.17);
  fl.g.position.y = FLAME_Y[kind];
  obj.add(fl.g);
  roomCandles.push({ ...fl, cluster });
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
  body.traverse((o) => { if (o.material?.name === 'Balloon_Latex') latexLooks.add(o.material); });
  body.scale.setScalar(scale);
  lean.add(body);
  holder.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.0026, 5), stringMat), lean);
  decor.add(holder);
  balloons.push({ holder, body, seed: rand(0, 6) });
}

// a little above the string's lowest point, allowing for its rise towards the edges of a phone screen
const BUNTING_ROOF = new THREE.Vector3(0, 1.84, -1.15);
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
  const mats = ['#b59bff', '#ff9cc8', '#d6c4ff', '#8fb0ff', '#ffe27a'].map((c) =>
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
  // festoon bulbs (Blender model) hanging between the flags
  const M = N + 1;
  const glass = new THREE.InstancedMesh(decorGltf.scene.getObjectByName('Bulb_Glass').geometry, new THREE.MeshBasicMaterial({ toneMapped: false }), M);
  const sockets = new THREE.InstancedMesh(decorGltf.scene.getObjectByName('Bulb_Socket').geometry,
    new THREE.MeshStandardMaterial({ color: 0xcc9a5a, metalness: 1, roughness: 0.35 }), M);
  const d = new THREE.Object3D(), glowAt = [];
  for (let i = 0; i < M; i++) {
    d.position.copy(curve.getPointAt(i / N)).add(new THREE.Vector3(0, -0.004, 0.006));
    d.scale.setScalar(1.3);
    d.updateMatrix();
    glass.setMatrixAt(i, d.matrix);
    sockets.setMatrixAt(i, d.matrix);
    glass.setColorAt(i, BULB_OFF);
    glowAt.push(d.position.x, d.position.y - 0.048, d.position.z);
  }
  const glow = glowPoints(glowAt, 0.22);
  glass.frustumCulled = sockets.frustumCulled = false;
  decor.add(glass, sockets, glow);
  fairy = { glass, glow, n: M, level: 0, seeds: Array.from({ length: M }, () => rand(0, 6)), c: new THREE.Color() };
}

// tiny "rice" fairy lights on a copper wire, winding across the floor in front of the cake
function floorLights() {
  const curve = new THREE.CatmullRomCurve3([
    [-1.8, 0.75], [-1.15, 1.18], [-0.6, 1.36], [-0.05, 1.28], [0.5, 1.4], [1.0, 1.22], [1.4, 0.9], [1.9, 0.95],
  ].map(([x, z]) => new THREE.Vector3(x, 0.006, z)));
  decor.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 200, 0.0018, 4),
    new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 1, roughness: 0.4 })));
  const n = 64;
  const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0075, 8, 6), new THREE.MeshBasicMaterial({ toneMapped: false }), n);
  const d = new THREE.Object3D(), glowAt = [];
  for (let i = 0; i < n; i++) {
    d.position.copy(curve.getPointAt(i / (n - 1))).add(new THREE.Vector3(0, 0.004, 0));
    d.updateMatrix();
    bulbs.setMatrixAt(i, d.matrix);
    bulbs.setColorAt(i, BULB_OFF);
    glowAt.push(d.position.x, d.position.y, d.position.z);
  }
  const glow = glowPoints(glowAt, 0.085);
  bulbs.frustumCulled = false;
  decor.add(bulbs, glow);
  rice = { bulbs, glow, n, level: 0, c: new THREE.Color() };
}

function floorConfetti() {
  const n = 280;
  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.034, 0.016).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ roughness: 0.5, side: THREE.DoubleSide }), n);
  const d = new THREE.Object3D(), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const r = 0.78 + Math.random() ** 0.8 * 2.2, a = rand(0, Math.PI * 2);
    d.position.set(Math.cos(a) * r, 0.004, Math.sin(a) * r * 0.85);
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

const FLOAT_TOP = 2.15;   // fade out before drifting up behind the title
function resetFloater(f, anywhere) {
  do { f.x = rand(-2.3, 2.3); f.z = rand(-1.7, -0.45); } while (Math.abs(f.x) < 0.55 && f.z > -1.05);
  f.y = anywhere ? rand(0.2, FLOAT_TOP) : 0.05;
}

function setupFloaters() {
  const hearts = ['#b98cff', '#d4b8ff', '#ff94c6', '#9a6cff'];
  for (let i = 0; i < 12; i++) {
    const star = i % 3 === 2;
    const obj = star ? make('Star', {}, false) : make('JellyHeart', jelly(hearts[i % hearts.length]), false);
    const f = { obj, base: star ? rand(0.6, 0.85) : rand(0.22, 0.34), v: rand(0.05, 0.1), seed: rand(0, 6) };
    resetFloater(f, true);
    decor.add(obj);
    floaters.push(f);
  }
}

function setupSparkles() {
  const n = 36;
  const pts = glowPoints(new Array(n * 3).fill(0), 0.11, sparkleTexture());
  decor.add(pts);
  sparkles = { pts, n, level: 0, st: Array.from({ length: n }, () => ({ speed: rand(0.7, 1.6), seed: rand(0, 6), prev: 0 })) };
  for (let i = 0; i < n; i++) moveSparkle(i);
}
function moveSparkle(i) {
  sparkles.pts.geometry.attributes.position.setXYZ(i, rand(-1.9, 1.9), rand(0.15, 2.5), rand(-1.3, 1.0));
  sparkles.pts.geometry.attributes.position.needsUpdate = true;
}

function setupDecor() {
  // little dreamy gifts on the floor hold the balloon strings
  place(dreamGift(DREAMS[3]), [-0.8, 0, -0.52], 0.5, 0.3);
  place(dreamGift(DREAMS[4]), [0.84, 0, -0.46], -0.4, 0.27);
  place(dreamGift(DREAMS[1]), [1.75, 0, -0.35], 0.2, 0.34);
  place(dreamGift(DREAMS[0]), [1.98, 0, 0.05], -0.6, 0.22);

  // a mix of happy colours, with lavender kept in the bunch
  balloon('Balloon', latex('#ff917c'), [-0.8, 0.34, -0.52], [-0.9, 1.22, -0.64], 0.85);   // coral
  balloon('Balloon', latex('#6fd8c6'), [-0.8, 0.34, -0.52], [-0.6, 1.08, -0.78], 0.75);   // mint
  balloon('Heart', foil('#f2c46d'), [-0.8, 0.34, -0.52], [-1.0, 0.95, -0.42], 0.8);
  balloon('Balloon', latex('#ff7eb6'), [0.84, 0.31, -0.46], [0.92, 1.2, -0.6], 0.85);     // rose pink
  balloon('Balloon', latex('#6fb4ff'), [0.84, 0.31, -0.46], [0.64, 1.05, -0.74], 0.72);   // sky blue
  balloon('Heart', foil('#c7a3ff'), [0.84, 0.31, -0.46], [1.02, 0.93, -0.36], 0.8);
  // wider screens see a little more of the party
  balloon('Balloon', latex('#8a66ff'), [1.75, 0.38, -0.35], [1.7, 1.45, -0.55], 0.9);     // violet
  balloon('Balloon', latex('#ffb98f'), [1.75, 0.38, -0.35], [1.98, 1.3, -0.45], 0.8);     // peach
  balloon('Balloon', latex('#ffd84a'), [-1.8, 0.0, -0.6], [-1.75, 1.5, -0.7], 0.9);       // buttercup
  balloon('Heart', foil('#ff9ccc'), [-1.8, 0.0, -0.6], [-2.05, 1.25, -0.5], 0.85);
  balloon('Balloon', latex('#b99cff'), [-1.8, 0.0, -0.6], [-1.55, 1.3, -0.85], 0.75);     // lavender

  place(make('Cupcake', { Cupcake_Frosting: { color: '#c6a4ff', roughness: 0.5, sheen: 0.6, sheenColor: 0xffffff } }), [-0.64, 0, 0.86], 0.4);
  place(make('Cupcake', { Cupcake_Frosting: { color: '#ff9cc8', roughness: 0.5, sheen: 0.6, sheenColor: 0xffffff } }), [-1.55, 0, 0.55], 2.1, 0.9);
  // sweets: a cookie jar and a clay flower pot beside the stand, a marshmallow jar in front
  const jar = { Jar_Glass: { color: '#ffffff', transparent: true, opacity: 0.22, roughness: 0.04, clearcoat: 1, depthWrite: false } };
  for (const [name, pos, rot] of [['CookieJar', [-0.8, 0, 0.36], 0.3], ['MarshmallowJar', [0.66, 0, 0.88], -0.5]]) {
    place(make(name, jar), pos, rot).traverse((o) => { if (o.isMesh && o.material.name === 'Jar_Glass') o.castShadow = false; });
  }
  place(saturate(make('FlowerPot'), 1.7), [0.8, 0, 0.32], -0.4, 1.05);
  const shells = ['#c4a3ff', '#ff9cc8', '#a6d8ff', '#ffe066'];
  shells.slice(0, 3).forEach((c, i) => {
    place(make('Macaron', { Macaron_Shell: { color: c, roughness: 0.6, sheen: 0.7, sheenColor: 0xffffff } }),
      [1.36 + rand(-0.008, 0.008), i * 0.112, 0.84 + rand(-0.008, 0.008)], rand(0, 6));
  });
  const leaning = place(make('Macaron', { Macaron_Shell: { color: shells[3], roughness: 0.6, sheen: 0.7, sheenColor: 0xffffff } }), [1.49, 0.075, 0.93], 0);
  leaning.rotation.set(0, 0.6, 1.25);
  const hat = place(make('PartyHat'), [-1.42, 0.1, 0.62], 0);
  hat.rotation.set(0.1, 0.9, 1.45);
  place(make('PartyHat'), [1.72, 0, 0.45], 0, 1.1);
  // glossy jelly hearts resting by the floor lights
  for (const [x, z, c, s, ry] of [[0.06, 1.3, '#9a6cff', 0.3, 0.3], [-0.14, 1.4, '#c6a6ff', 0.22, -0.5], [0.3, 1.42, '#ff94c6', 0.2, 0.9]]) {
    const h = place(make('JellyHeart', jelly(c)), [x, 0.12 * s, z], 0, s);
    h.rotation.set(-1.45, 0, ry);
  }

  // the melted candles that light the room: clusters front-left, front-right, beside the stand and behind it
  const CREAM = '#fff1de', BLUSH = '#ffd3dc', LILAC = '#e6d8ff';
  roomCandle('Candle_L', [-0.36, 1.0], CREAM, 'left');
  roomCandle('Candle_S', [-0.22, 1.13], BLUSH, 'left');
  roomCandle('Votive', [-0.47, 1.16], '#c9a8ff', 'left');
  roomCandle('Candle_M', [-0.6, 0.6], BLUSH, 'left');
  roomCandle('Candle_Puddle', [-0.96, 0.78], CREAM, 'left');
  roomCandle('Candle_M', [0.35, 1.02], LILAC, 'right');
  roomCandle('Votive', [0.21, 1.15], '#ffbe7a', 'right');
  roomCandle('Candle_S', [0.47, 1.16], CREAM, 'right');
  roomCandle('Candle_L', [0.57, 0.58], CREAM, 'right');
  roomCandle('Votive', [0.98, 0.68], '#ffa6cf', 'right');
  roomCandle('Candle_Puddle', [-0.04, 1.12], BLUSH, 'right');
  roomCandle('Candle_L', [-0.5, -0.95], CREAM, 'back');
  roomCandle('Candle_M', [0.52, -1.0], BLUSH, 'back');
  roomCandle('Votive', [0.05, -1.12], '#ffbe7a', 'back');
  roomCandle('Candle_L', [-1.3, 0.25], LILAC, 'none');
  roomCandle('Votive', [1.25, 0.3], '#c9a8ff', 'none');
  roomCandle('Candle_M', [1.2, 0.95], CREAM, 'none');

  bunting();
  floorLights();
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

  // room candles: flicker, and the cluster lights follow how many of their candles are burning
  const clusters = { left: [0, 0], right: [0, 0], back: [0, 0] };
  for (const c of roomCandles) {
    const k = 1 + 0.09 * Math.sin(t * 11 + c.seed) + 0.05 * Math.sin(t * 23.7 + c.seed * 2);
    c.g.visible = c.life > 0.01;
    c.g.scale.set(c.life * (1.03 - 0.03 * k), c.life * k, c.life * (1.03 - 0.03 * k));
    c.g.rotation.z = Math.sin(t * 6 + c.seed) * 0.05;
    c.glow.material.opacity = c.life * (0.75 + 0.25 * Math.sin(t * 15 + c.seed));
    if (clusters[c.cluster]) { clusters[c.cluster][0] += c.life; clusters[c.cluster][1]++; }
  }
  for (const [name, [sum, n]] of Object.entries(clusters)) lamps[name].level = n ? sum / n : 0;

  // fairy lights: each bulb twinkles on its own rhythm once the string is switched on
  const fg = fairy.glow.geometry.attributes.color;
  for (let i = 0; i < fairy.n; i++) {
    const b = fairy.level * (0.6 + 0.4 * Math.sin(t * 2.1 + fairy.seeds[i] * 3) * Math.sin(t * 0.8 + fairy.seeds[i]));
    fairy.glass.setColorAt(i, fairy.c.copy(BULB_OFF).lerp(WARM, Math.min(1, b * 1.2)));
    fg.setXYZ(i, b * 0.85, b * 0.62, b * 0.34);
  }
  fairy.glass.instanceColor.needsUpdate = true;
  fg.needsUpdate = true;
  const rg = rice.glow.geometry.attributes.color;
  for (let i = 0; i < rice.n; i++) {   // a slow shimmer travelling along the wire
    const b = rice.level * (0.55 + 0.45 * Math.sin(t * 2.4 - i * 0.45));
    rice.bulbs.setColorAt(i, rice.c.copy(BULB_OFF).lerp(WARM, Math.min(1, b * 1.3)));
    rg.setXYZ(i, b * 0.8, b * 0.58, b * 0.3);
  }
  rice.bulbs.instanceColor.needsUpdate = true;
  rg.needsUpdate = true;

  const sc = sparkles.pts.geometry.attributes.color;
  sparkles.st.forEach((s, i) => {
    const w = Math.sin(t * s.speed + s.seed);
    if (w > 0 && s.prev <= 0) moveSparkle(i);    // jump somewhere new each time it fades in
    s.prev = w;
    const b = sparkles.level * Math.max(0, w) ** 3;
    sc.setXYZ(i, b, b * 0.94, b * 0.8);
  });
  sc.needsUpdate = true;
}

// ------------------------------------------------------------------ the dark room: pop the balloons to turn on the lights
const popBalloons = [], bits = [];
let litStage = 0;
const POP_COLORS = ['#c9b3ff', '#ffaed6', '#aebfff'];

function setupPopBalloons() {
  const stringGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.02, -0.15, 0), new THREE.Vector3(-0.02, -0.32, 0), new THREE.Vector3(0.01, -0.5, 0),
  ]), 24, 0.0025, 4);
  const stringLook = new THREE.MeshBasicMaterial({ color: 0x6a5470 });
  POP_COLORS.forEach((color) => {
    // LED balloons: a light inside makes them glow in the dark
    const body = make('Balloon', { Balloon_Latex: { color, roughness: 0.3, clearcoat: 1, emissive: color, emissiveIntensity: 0.5 } }, false);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: softTex, color, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, depthTest: false, toneMapped: false, opacity: 0.75,
    }));
    glow.position.y = 0.33;
    glow.scale.setScalar(0.85);
    const hit = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = 0.33;
    const g = new THREE.Group();
    g.add(body, glow, new THREE.Mesh(stringGeo, stringLook), hit);
    g.visible = false;
    world.add(g);
    popBalloons.push({ g, glow, hit, color, popped: false, ready: false, arrived: false, seed: rand(0, 6), home: new THREE.Vector3() });
  });
}

const POP_SPOTS = [[-0.55, -0.08], [0.02, 0.14], [0.56, -0.14]];   // spread across the screen (NDC)
const POP_SCALE = 0.62;
function popHome(b, i) {
  raycaster.setFromCamera(new THREE.Vector2(...POP_SPOTS[i]), camera);
  b.home.copy(raycaster.ray.at(4.8, new THREE.Vector3())).add(new THREE.Vector3(0, -0.33 * POP_SCALE, 0));
}
// a turned phone reframes the room, so move the balloons with it (otherwise they can end up off-screen, unpoppable)
addEventListener('resize', () => {
  popBalloons.forEach((b, i) => {
    if (!b.g.visible || b.popped) return;
    popHome(b, i);   // a rising balloon's tween follows home by reference
    if (b.arrived) b.g.position.copy(b.home);
  });
});

function releasePopBalloons() {
  popBalloons.forEach((b, i) => {
    popHome(b, i);
    b.g.scale.setScalar(POP_SCALE);
    b.g.position.copy(b.home).add(new THREE.Vector3(0, -3.2, 0));
    b.g.visible = true;
    const from = b.g.position.clone();
    setTimeout(() => { b.ready = true; }, i * 420 + 400);   // poppable while still rising
    tween(2800, (e) => b.g.position.lerpVectors(from, b.home, e), { delay: i * 420, easing: ease.outCubic })
      .then(() => { b.arrived = true; });
  });
}

function animatePopBalloons(t, dt) {
  for (const b of popBalloons) {
    if (b.popped || !b.g.visible) continue;
    if (b.arrived) b.g.position.y = b.home.y + Math.sin(t * 1.3 + b.seed) * 0.04;
    b.g.rotation.z = Math.sin(t * 0.9 + b.seed) * 0.08;
    b.glow.material.opacity = 0.65 + 0.12 * Math.sin(t * 2 + b.seed);
  }
  for (let i = bits.length - 1; i >= 0; i--) {   // latex scraps from popped balloons
    const p = bits[i];
    p.t += dt;
    p.v.y -= 2.2 * dt;
    p.m.position.addScaledVector(p.v, dt);
    p.m.rotation.x += p.spin * dt;
    p.m.rotation.y += p.spin * 0.7 * dt;
    p.m.material.opacity = Math.max(0, 1 - p.t / 1.1);
    if (p.t > 1.1) {
      world.remove(p.m);
      p.m.material.dispose();
      bits.splice(i, 1);
    }
  }
}

const bitGeo = new THREE.CircleGeometry(0.03, 5);
async function pop(b) {
  if (b.popped || !b.ready) return;
  b.popped = true;
  music.pop();
  navigator.vibrate?.(30);
  const center = b.g.localToWorld(new THREE.Vector3(0, 0.33, 0));
  await tween(70, (e) => b.g.scale.setScalar(POP_SCALE * (1 + 0.25 * e)));
  b.g.visible = false;
  for (let i = 0; i < 18; i++) {
    const m = new THREE.Mesh(bitGeo, new THREE.MeshBasicMaterial({ color: b.color, transparent: true, side: THREE.DoubleSide, toneMapped: false }));
    m.position.copy(center);
    m.scale.setScalar(rand(0.5, 1.2));
    world.add(m);
    const dir = new THREE.Vector3(rand(-1, 1), rand(-0.4, 1), rand(-1, 1)).normalize();
    bits.push({ m, v: dir.multiplyScalar(rand(0.8, 1.6)), spin: rand(4, 12), t: 0 });
  }
  fire({ particleCount: 36, spread: 360, startVelocity: 18, scalar: 0.8, ticks: 110, gravity: 0.8, colors: [b.color, '#ffffff', '#ffe3a3'], origin: toScreen(center) });
  lightStage(++litStage);
}

function pickPopBalloon(x, y) {
  raycaster.setFromCamera(ndc(x, y), camera);
  const live = popBalloons.filter((b) => b.ready && !b.popped);
  const hit = raycaster.intersectObjects(live.map((b) => b.hit), false)[0];
  return hit && live.find((b) => b.hit === hit.object);
}

function setBlackout(v) {
  blackout = v;
  $('#blackout').style.opacity = v;
  setTheme();
}

async function lightStage(n, instant = false) {
  const hint = $('#darkHint');
  if (n === 1) {             // the fairy lights
    setBlackout(BG.blackout[0]);
    switchOn(fairy, { ms: instant ? 1 : 900 });
    switchOn(rice, { delay: instant ? 0 : 250, ms: instant ? 1 : 1200 });
    switchOn(lamps.fairy, { ms: instant ? 1 : 900 });
    switchOn(lamps.moon, { ms: instant ? 1 : 1500, to: 0.25 });
    if (!instant) swapText(hint, fill(CONFIG.popMore2));
  } else if (n === 2) {      // the candles around the room, one after another
    setBlackout(BG.blackout[1]);
    roomCandles.forEach((c, i) => {
      tween(instant ? 1 : 420, (e) => { c.life = e; }, { delay: instant ? 0 : i * 110, easing: ease.outBack });
    });
    tween(instant ? 1 : 1200, (e) => { for (const m of votiveGlass) m.emissiveIntensity = 0.35 * e; }, { delay: instant ? 0 : 400 });
    switchOn(lamps.moon, { ms: instant ? 1 : 1500, to: 0.5 });
    tween(instant ? 1 : 1500, (e) => { room.env = room.envMax * 0.4 * e; });
    if (!instant) swapText(hint, fill(CONFIG.popMore1));
  } else if (n === 3) {      // the cake: candles ignite, the spotlight fades up, the room warms
    setBlackout(0);
    flames.forEach((f, i) => {
      tween(instant ? 1 : 380, (e) => { f.userData.life = e; }, { delay: instant ? 0 : 300 + i * 160, easing: ease.outBack });
    });
    switchOn(lamps.spot, { delay: instant ? 0 : 900, ms: instant ? 1 : 1600 });
    switchOn(lamps.moon, { ms: instant ? 1 : 2000 });
    for (const k of ['sun', 'rim', 'party', 'fill', 'rimL', 'rimR']) if (lamps[k]) switchOn(lamps[k], { delay: instant ? 0 : 600, ms: instant ? 1 : 2000 });
    tween(instant ? 1 : 2000, (e) => { room.env = room.envMax * (0.4 + 0.6 * e); });
    tween(instant ? 1 : 2500, (e) => { sparkles.level = e; }, { delay: instant ? 0 : 1200 });
    music.duck(VOLUME);
    controls.enabled = true;
    if (instant) {
      hint.classList.add('hidden');
      $('#cake .top').classList.remove('hidden');
      cakeReadyAt = performance.now();
      return;
    }
    hint.classList.add('hidden');
    await sleep(1500);
    music.chime();
    fire({ particleCount: 90, spread: 110, startVelocity: 38, origin: { y: 0.5 }, scalar: 0.9 });
    $('#cake .top').classList.remove('hidden');
    cakeReadyAt = performance.now() + 1200;
  }
}

async function startCake({ lit = false } = {}) {
  if (!lit) $('#cake .top').classList.add('hidden');   // before the room shows, so the title can't linger in the dark
  go('cake');
  turntable.visible = true;
  frame(cakeView);
  if (lit) {
    for (let n = 1; n <= 3; n++) lightStage(n, true);
    litStage = 3;
    return;
  }
  music.duck(0.14);
  const hint = $('#darkHint');
  hint.textContent = fill(CONFIG.darkHint);
  await sleep(1600);
  hint.classList.remove('hidden');
  await sleep(2000);
  releasePopBalloons();
  swapText(hint, fill(CONFIG.popPrompt));
}

// ------------------------------------------------------------------ gifts
const gifts = new THREE.Group();
const giftItems = [];
let giftBox, giftBusy = false, giftTextures = [];

function setupGifts() {
  const portrait = innerWidth / innerHeight < 0.9;
  const layout = portrait
    ? [[-0.33, -0.2], [0.33, -0.2], [0, 0.38]]
    : [[-0.64, 0], [0, 0.12], [0.64, 0]];
  // the cards come out in config order whichever box she taps, so the coupon is always the last one
  giftTextures = CONFIG.gifts.slice(0, 3).map((c) => emojiTexture(c.emoji));
  giftTextures.forEach((_, i) => {
    const root = dreamGift(DREAMS[i]);   // every box gets its own materials, so fading one lid leaves the rest alone
    const scale = [0.4, 0.38, 0.42][i];
    root.position.set(layout[i][0], 0, layout[i][1]);
    root.rotation.y = rand(-0.45, 0.45);
    root.scale.setScalar(scale);
    gifts.add(root);
    const lid = root.getObjectByName('DreamGift_Lid');
    // see-through from the start: shaders are compiled while loading, and an opaque one ignores opacity
    lid.traverse((o) => { if (o.isMesh) o.material.transparent = true; });
    giftItems.push({ root, lid, content: null, scale, opened: false, seed: rand(0, 6) });
  });
  giftBox = new THREE.Box3().setFromObject(gifts);   // before the invisible helpers below are added
  giftItems.forEach((it, i) => {
    it.hit = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.5, 1.3), new THREE.MeshBasicMaterial({ visible: false }));
    it.hit.position.y = 0.7;
    // each starts with a different emoji (all three get uploaded with the room); openGift swaps in the right one
    it.spark = new THREE.Sprite(new THREE.SpriteMaterial({ map: giftTextures[i], transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
    it.spark.scale.setScalar(0.001);
    it.spark.position.y = 0.5;
    it.root.add(it.hit, it.spark, blob(1.9));
  });
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
  const from = { pos: camera.position.clone(), target: controls.target.clone(), shift: shiftY };
  framed = { box: giftBox, elevDeg: 22, azimuth: 0 };   // straight on, wherever she left the cake turned
  const to = framing(giftBox, 22, 0);
  tween(1100, (e) => {
    camera.position.lerpVectors(from.pos, to.pos, e);
    controls.target.lerpVectors(from.target, to.target, e);
    camera.lookAt(controls.target);
    setShift(THREE.MathUtils.lerp(from.shift, innerHeight * 0.06, e));
  }, { easing: ease.inOutSine });
  giftItems.forEach((it, i) => {
    it.root.scale.setScalar(0.001);
    tween(750, (e) => it.root.scale.setScalar(Math.max(it.scale * e, 0.001)), { delay: 350 + i * 160, easing: ease.outBack });
  });
}

function pickGift(x, y) {
  raycaster.setFromCamera(ndc(x, y), camera);
  const hit = raycaster.intersectObjects(giftItems.map((it) => it.hit), false)[0];
  return hit && giftItems.find((it) => it.hit === hit.object);
}

async function openGift(it) {
  if (giftBusy) return;
  if (it.opened) { await showCard(it.content); return; }
  giftBusy = true;
  const k = giftItems.filter((g) => g.opened).length;
  it.opened = true;
  it.content = CONFIG.gifts[k];
  it.spark.material.map = giftTextures[k];
  const { root, lid, spark, scale: s } = it;
  root.position.y = 0;
  root.rotation.z = 0;
  await tween(150, (e) => root.scale.set(s * (1 + 0.12 * e), s * (1 - 0.16 * e), s * (1 + 0.12 * e)), { easing: ease.outCubic });
  music.chime();
  tween(420, (e) => root.scale.set(s * (1.12 - 0.12 * e), s * (0.84 + 0.16 * e), s * (1.12 - 0.12 * e)), { easing: ease.outBack });
  const lidMats = [];
  lid.traverse((o) => { if (o.isMesh) lidMats.push(o.material); });
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
  fire({ particleCount: 70, spread: 75, startVelocity: 28, scalar: 0.85, origin: toScreen(root.localToWorld(new THREE.Vector3(0, 1.2, 0))) });
  await sleep(750);
  await showCard(it.content);
  giftBusy = false;
  const left = giftItems.filter((g) => !g.opened).length;
  if (left) {
    swapText($('#giftHint'), left === 1 ? 'one more… 🎀' : `${left} more to go ✨`);
  } else {
    swapText($('#giftHint'), 'all opened 💜 (tap one to read it again)');
    $('#toPhotos').classList.remove('hidden');
  }
}

let closeCard = null, cardShownAt = 0;   // set while a card is showing (Android's back gesture closes it too)
function showCard(c) {
  return new Promise((done) => {
    const m = $('#card');
    $('.card-emoji').textContent = c.emoji;
    $('.card-title').textContent = fill(c.title);
    $('.card-text').textContent = fill(c.text);
    m.classList.remove('hidden');
    cardShownAt = performance.now();
    const onClick = (e) => { if (e.target === m || e.target.id === 'cardClose') closeCard(); };
    closeCard = () => {
      m.classList.add('hidden');
      m.removeEventListener('click', onClick);
      closeCard = null;
      done();
    };
    m.addEventListener('click', onClick);
  });
}

// Android's back gesture: closes an open card, and otherwise asks once before leaving the surprise half-way
let guarded = false;
function guard() {
  if (guarded) return;
  history.pushState({ surprise: true }, '');
  guarded = true;
}
addEventListener('popstate', () => {
  guarded = false;   // her next tap puts the guard back
  if (closeCard) closeCard();
  else toast('go back once more to leave 💜');
});
addEventListener('pointerdown', () => {
  if (scene !== 'loading' && scene !== 'intro') guard();
  music.wake();
}, true);

function toast(text) {
  const t = $('#toast');
  t.textContent = text;
  t.classList.remove('hidden');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.add('hidden'), 2600);
}

// Samsung phones switch the screen off after 30 s without a touch, less than the letter takes to read
let wakeLock = null;
async function stayAwake() {
  try { wakeLock = await navigator.wakeLock?.request('screen'); } catch { /* refused, e.g. in battery saver */ }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && wakeLock) stayAwake(); });

// taps (not drags) on the 3D stage
let down = null;
canvas.addEventListener('pointerdown', (e) => {
  down = { x: e.clientX, y: e.clientY, t: performance.now() };
  if (scene === 'cake' && litStage < 3) {   // popping should feel instant, so react on touch down
    const b = pickPopBalloon(e.clientX, e.clientY);
    if (b) { pop(b); down = null; }
  }
});
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
    if (p.focus) img.style.objectPosition = p.focus;
    img.src = p.src;
    el.querySelector('.caption').textContent = fill(p.caption);
    stack.appendChild(el);
  });

  if (!CONFIG.photos.length) $('#toLetter').classList.remove('hidden');

  let card = null, sx = 0, sy = 0, dx = 0, dy = 0, t0 = 0;
  stack.addEventListener('pointerdown', (e) => {
    card = [...stack.querySelectorAll('.polaroid:not(.fly)')].pop();   // the top card, not one still flying away
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
      swapText($('#photoHint'), fill(CONFIG.photosDone));
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
    fire({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.75 }, shapes, scalar: 1.7, colors: ['#b79df0', '#d6c4ff', '#f4a6cc'] });
    fire({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.75 }, shapes, scalar: 1.7, colors: ['#b79df0', '#d6c4ff', '#f4a6cc'] });
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
  try { music.start(); } catch (err) { console.error(err); }   // no sound is better than no surprise
  stayAwake();
  guard();
  $('#mute').classList.remove('hidden');
  $('#envelope').classList.add('open');
  $('#intro').classList.add('opening');
  $('#intro .pulse').classList.add('hidden');
  await sleep(1900);
  startCake();
}, { once: true });

// phones vary a lot: if the room renders slowly, drop the resolution a little (once or twice)
const perf = { frames: 0, time: 0, drops: 0 };
function watchPerformance(dt) {
  if (params.has('hq') || perf.drops >= 2) return;
  perf.frames++;
  perf.time += dt;
  if (perf.frames < 90) return;
  if (perf.time / perf.frames > 1 / 38) {
    renderer.setPixelRatio(Math.max(1, renderer.getPixelRatio() * 0.75));
    resize();
    perf.drops++;
  }
  perf.frames = perf.time = 0;
}

let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  const t = now / 1000;
  stepTweens(now);
  sky.draw(dt, t);
  if (scene !== 'cake' && scene !== 'gifts') return;
  updateLamps(t);
  animateFlames(t);
  animateGifts(t);
  animateDecor(t, dt);
  animatePopBalloons(t, dt);
  stepPuffs(dt);
  if (turntable.visible) turntable.rotation.y += dt * 0.16;
  if (controls.enabled) controls.update();
  if (closeCard && now - cardShownAt > 450) return;   // once a card covers the room, stop redrawing it under the blur
  renderer.render(world, camera);
  watchPerformance(dt);
}
requestAnimationFrame(loop);

try {
  const [cakeGltf, decorLoaded] = await Promise.all([load('assets/cake.glb', 'cake'), load('assets/decor.glb', 'decor')]);
  decorGltf = decorLoaded;
  setupCake(cakeGltf);
  setupDecor();
  setupGifts();
  setupPopBalloons();
  reflectStudio(decor);
  reflectStudio(gifts);
  buildStack();
  // compile every shader while the loader is still showing, so nothing stutters when the room lights up
  const hidden = [turntable, gifts, ...popBalloons.map((b) => b.g)];
  hidden.forEach((o) => { o.visible = true; });
  cakeView = { box: cakeBox, elevDeg: 14, marginX: 1.3, roof: BUNTING_ROOF, sceneEl: $('#cake') };
  frame(cakeView);
  await (renderer.compileAsync ? renderer.compileAsync(world, camera) : renderer.compile(world, camera));
  hidden.forEach((o) => { o.visible = false; });
  await Promise.race([document.fonts.ready, sleep(2500)]);
  $('#progress').style.width = '100%';
  await sleep(500);
} catch (err) {
  console.error(err);
  $('#loading .hint').textContent = 'hmm, something went wrong. try opening the link in your browser 💜';
  throw err;
}

// ?scene=cake|lit|gifts|photos|letter|end jumps straight to a part (handy for previewing)
const jump = params.get('scene');
if (jump === 'cake') startCake();
else if (jump === 'lit') startCake({ lit: true });
else if (jump === 'gifts') { startCake({ lit: true }); wished = true; flames.forEach((f) => { f.userData.life = 0; }); toGifts(); }
else if (jump === 'photos') go('photos');
else if (jump === 'letter') typeLetter();
else if (jump === 'end') ending();
else go('intro');

window.surprise = { blowOut, toGifts, openGift: (i) => openGift(giftItems[i]), pop: (i) => pop(popBalloons[i]), go };
