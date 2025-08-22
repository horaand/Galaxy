/*
  Galaxy Night Sky — Vanilla JS
  Features:
   - Multi-layer starfield with parallax
   - Gentle twinkling with randomized phases
   - Procedural Milky Way band (offscreen texture blended in)
   - Occasional meteors with fading trails
   - No external libraries, fully original code
*/

// --- Element refs
const canvas = document.getElementById('galaxy');
const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });

const chkTwinkle = document.getElementById('toggleTwinkle');
const chkMeteors = document.getElementById('toggleMeteors');
const chkMilky = document.getElementById('toggleMilky');

// --- Base settings
const DPR = Math.min(window.devicePixelRatio || 1, 2);
const TWO_PI = Math.PI * 2;

// Counts
const STAR_COUNT = 420;      // general stars
const BAND_COUNT = 420;      // stars/dust along the Milky Way band
const CLOUD_NODES = 800;     // procedural fog nodes for the band texture
const METEOR_MIN_GAP = 3800; // ms
const METEOR_MAX_GAP = 9500; // ms

// Scene state
let W = 0, H = 0;
let stars = [];
let bandStars = [];
let meteor = null;
let nextMeteorAt = performance.now() + rand(METEOR_MIN_GAP, METEOR_MAX_GAP);

// Parallax
const parallax = { x: 0, y: 0, targetX: 0, targetY: 0 };

// Milky Way: randomized angle/width, rendered once into an offscreen canvas
const milky = {
  angle: degToRad(rand(18, 42) * (Math.random() < 0.5 ? 1 : -1)),
  width: 0,
  texture: null,
  dirty: true
};

// --- Utilities
function rand(min, max) { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function degToRad(d) { return d * Math.PI / 180; }

// Normal distribution via Box–Muller
function gaussian() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// --- Resize & DPI fit
function resize() {
  const { innerWidth: vw, innerHeight: vh } = window;
  W = vw; H = vh;
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  canvas.width = Math.floor(W * DPR);
  canvas.height = Math.floor(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  // Milky Way width scales with the shorter side
  milky.width = Math.max(120, Math.min(W, H) * 0.45);
  milky.dirty = true;
}
window.addEventListener('resize', () => {
  resize();
  // Re-seed for consistency on resize
  seedScene();
}, { passive: true });

// --- Scene construction
function seedScene() {
  stars = makeStars(STAR_COUNT, 0.2, 1.0);
  bandStars = makeBandStars(BAND_COUNT);
  makeMilkyTexture();
}

// General stars with depth for parallax
function makeStars(count, minDepth = 0.2, maxDepth = 1.0) {
  const arr = [];
  for (let i = 0; i < count; i++) {
    const depth = rand(minDepth, maxDepth); // smaller = farther
    const r = Math.pow(1 - depth, 1.2) * rand(0.6, 1.8) + 0.3;
    const tone = rand(210, 265); // cool blue-white hues
    arr.push({
      x: Math.random() * W,
      y: Math.random() * H,
      r,
      baseAlpha: rand(0.25, 0.85),
      twinkleSpeed: rand(0.6, 1.8),
      phase: rand(0, TWO_PI),
      color: `hsl(${tone} 90% 92%)`,
      glow: `hsla(${tone} 100% 80% / 0.95)`,
      depth
    });
  }
  return arr;
}

// Stars clustered along a slanted Milky Way band
function makeBandStars(count) {
  const arr = [];
  const cx = W / 2, cy = H / 2;
  const dir = { x: Math.cos(milky.angle), y: Math.sin(milky.angle) };
  const norm = { x: -dir.y, y: dir.x }; // perpendicular
  let tries = 0;

  while (arr.length < count && tries < count * 30) {
    tries++;
    // Sample along the band line with Gaussian offset
    const t = rand(-Math.hypot(W, H), Math.hypot(W, H));
    const d = gaussian() * (milky.width * 0.35);
    const x = cx + dir.x * t + norm.x * d;
    const y = cy + dir.y * t + norm.y * d;

    if (x < -50 || x > W + 50 || y < -50 || y > H + 50) continue;

    const distFactor = Math.exp(-(d * d) / (2 * Math.pow(milky.width * 0.45, 2)));
    const depth = clamp(1 - distFactor * 0.9, 0.1, 0.95);
    const r = rand(0.6, 2.2) * (0.8 + distFactor);
    const tone = rand(200, 250);
    arr.push({
      x, y, r,
      baseAlpha: clamp(0.3 + distFactor * 0.7, 0.25, 1),
      twinkleSpeed: rand(0.5, 1.5),
      phase: rand(0, TWO_PI),
      color: `hsl(${tone} 95% 95%)`,
      glow: `hsla(${tone} 100% 85% / 0.95)`,
      depth
    });
  }
  return arr;
}

// Offscreen Milky Way texture (generated once per seed/resize)
function makeMilkyTexture() {
  const off = document.createElement('canvas');
  off.width = Math.max(1, Math.floor(W * DPR));
  off.height = Math.max(1, Math.floor(H * DPR));
  const octx = off.getContext('2d', { alpha: true });
  octx.setTransform(DPR, 0, 0, DPR, 0, 0);
  octx.clearRect(0, 0, W, H);

  const cx = W / 2, cy = H / 2;
  const dir = { x: Math.cos(milky.angle), y: Math.sin(milky.angle) };
  const norm = { x: -dir.y, y: dir.x };

  octx.globalCompositeOperation = 'lighter';

  for (let i = 0; i < CLOUD_NODES; i++) {
    const t = rand(-Math.hypot(W, H), Math.hypot(W, H));
    const d = gaussian() * (milky.width * rand(0.15, 0.45));
    const x = cx + dir.x * t + norm.x * d;
    const y = cy + dir.y * t + norm.y * d;

    const size = Math.abs(gaussian()) * 18 + 6;
    const alpha = clamp(0.006 + Math.exp(-(d * d) / (2 * Math.pow(milky.width * 0.7, 2))) 
    * 0.028, 0.004, 0.05);

    const grd = octx.createRadialGradient(x, y, 0, x, y, size);
    grd.addColorStop(0, `rgba(210, 225, 255, ${alpha})`);
    grd.addColorStop(1,  `rgba(210, 225, 255, 0)`);

    octx.fillStyle = grd;
    octx.beginPath();
    octx.arc(x, y, size, 0, TWO_PI);
    octx.fill();
  }

  // Very subtle global veil
  octx.globalCompositeOperation = 'source-over';
  octx.fillStyle = 'rgba(255,255,255,0.015)';
  octx.fillRect(0, 0, W, H);

  milky.texture = off;
  milky.dirty = false;
}

// --- Pointer input for parallax
function onPointer(e) {
  const x = (e.clientX ?? (e.touches?.[0]?.clientX ?? W / 2));
  const y = (e.clientY ?? (e.touches?.[0]?.clientY ?? H / 2));
  const nx = (x / W) * 2 - 1; // [-1, 1]
  const ny = (y / H) * 2 - 1;
  parallax.targetX = nx;
  parallax.targetY = ny;
}
window.addEventListener('mousemove', onPointer, { passive: true });
window.addEventListener('touchmove', onPointer, { passive: true });

// --- Meteors
function spawnMeteor() {
  // Start near a corner, travel diagonally
  const fromLeft = Math.random() < 0.5;
  const startX = fromLeft ? rand(-W * 0.2, W * 0.1) : rand(W * 0.9, W * 1.2);
  const startY = rand(-H * 0.1, H * 0.35);

  // Align roughly with the band angle
  const baseAngle = milky.angle + (fromLeft ? 0 : Math.PI);
  const a = baseAngle + degToRad(rand(-8, 8));
  const speed = rand(650, 1150) / 1000 * Math.max(W, H); // px/s
  meteor = {
    x: startX,
    y: startY,
    vx: Math.cos(a) * speed,
    vy: Math.sin(a) * speed,
    life: rand(500, 1100), // ms
    age: 0,
    trail: []
  };
}

// --- Render loop
let last = performance.now();
function frame(now) {
  const dt = now - last;
  last = now;

  // Smooth parallax
  parallax.x += (parallax.targetX - parallax.x) * 0.06;
  parallax.y += (parallax.targetY - parallax.y) * 0.06;

  // Clear
  ctx.clearRect(0, 0, W, H);

  // Draw Milky Way texture
  if (chkMilky.checked) {
    if (milky.dirty || !milky.texture) makeMilkyTexture();
    ctx.globalAlpha = 0.9;
    ctx.drawImage(milky.texture, 0, 0, milky.texture.width / DPR, milky.texture.height / DPR);
    ctx.globalAlpha = 1;
  }

  // Background star layers
  drawStars(stars, 0.8);
  drawStars(bandStars, 1.2);

  // Meteors
  handleMeteors(dt);

  requestAnimationFrame(frame);
}

function drawStars(list, parallaxScale) {
  const t = performance.now() / 1000;
  for (const s of list) {
    const pX = parallax.x * (1 - s.depth) * 14 * parallaxScale;
    const pY = parallax.y * (1 - s.depth) * 10 * parallaxScale;

    // Twinkle
    const tw = chkTwinkle.checked ? (0.5 + 0.5 * Math.sin(t * s.twinkleSpeed + s.phase)) : 1.0;
    const alpha = clamp(s.baseAlpha * tw, 0.05, 1);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowBlur = s.r * 6;
    ctx.shadowColor = s.glow;
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(s.x + pX, s.y + pY, s.r, 0, TWO_PI);
    ctx.fill();
    ctx.restore();

    // Starburst cross for brighter stars
    if (s.r > 1.6 && alpha > 0.6) {
      ctx.save();
      ctx.globalAlpha = alpha * 0.15;
      ctx.strokeStyle = s.glow;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(s.x + pX - s.r * 3, s.y + pY);
      ctx.lineTo(s.x + pX + s.r * 3, s.y + pY);
      ctx.moveTo(s.x + pX, s.y + pY - s.r * 3);
      ctx.lineTo(s.x + pX, s.y + pY + s.r * 3);
      ctx.stroke();
      ctx.restore();
    }
  }
}

function handleMeteors(dt) {
  const now = performance.now();
  if (chkMeteors.checked && (!meteor || meteor.age > meteor.life) && now >= nextMeteorAt) {
    spawnMeteor();
    nextMeteorAt = now + rand(METEOR_MIN_GAP, METEOR_MAX_GAP);
  }

  if (!meteor) return;

  const step = dt;
  meteor.age += step;

  // Integrate motion
  meteor.x += meteor.vx * (step / 1000);
  meteor.y += meteor.vy * (step / 1000);

  // Trail
  meteor.trail.push({ x: meteor.x, y: meteor.y, t: meteor.age });
  if (meteor.trail.length > 120) meteor.trail.shift();

  // Trail rendering
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = meteor.trail.length - 1; i > 0; i--) {
    const a = meteor.trail[i];
    const b = meteor.trail[i - 1];
    const k = i / meteor.trail.length;
    const w = clamp(2.8 * k, 0.2, 2.8);
    ctx.strokeStyle = `hsla(${randInt(205, 230)} 100% 85% / ${0.06 + k * 0.25})`;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  // Meteor head
  const headAlpha = clamp(1 - meteor.age / meteor.life, 0.15, 0.9);
  ctx.globalAlpha = headAlpha;
  ctx.shadowBlur = 18;
  ctx.shadowColor = 'rgba(200,230,255,0.95)';
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.arc(meteor.x, meteor.y, 2.2, 0, TWO_PI);
  ctx.fill();
  ctx.restore();

  // Cleanup
  if (
    meteor.age > meteor.life ||
    meteor.x < -200 || meteor.x > W + 200 ||
    meteor.y < -200 || meteor.y > H + 200
  ) {
    meteor = null;
  }
}

// --- Boot
resize();
seedScene();
requestAnimationFrame(frame);

// Click to nudge the band angle slightly (variety)
window.addEventListener('click', () => {
  milky.angle += degToRad(rand(-8, 8));
  milky.dirty = true;
  bandStars = makeBandStars(BAND_COUNT);
});

// Toggle handlers (no-ops except when needed)
chkMilky.addEventListener('change', () => {});
chkTwinkle.addEventListener('change', () => {});
chkMeteors.addEventListener('change', () => { if (!chkMeteors.checked) meteor = null; });
