// Cindersmith sigil/circuit engine — a small seeded canvas motif shared across pages.
// Draws a metallic ring with an alchemical sigil and a few PCB traces + vias.

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SYMBOL_PATHS = [
  // each is a list of [x,y] points (unit circle space, -1..1) forming a stroked sigil
  [[0, -1], [0.87, 0.5], [-0.87, 0.5], [0, -1]], // triangle (fire)
  [[0, 1], [0.87, -0.5], [-0.87, -0.5], [0, 1]], // inverted triangle (water)
  [[0, -1], [0.6, -0.3], [0.6, 0.6], [0, 1], [-0.6, 0.6], [-0.6, -0.3], [0, -1]], // hex-ish
  [[-0.8, -0.8], [0.8, 0.8]],
  [[-0.8, 0.8], [0.8, -0.8]],
];

function drawSigil(ctx, cx, cy, r, seed, ink, alpha) {
  const rng = mulberry32(seed);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(1, r * 0.018);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // outer ring
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  // inner ring
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.86, 0, Math.PI * 2);
  ctx.globalAlpha = alpha * 0.5;
  ctx.stroke();
  ctx.globalAlpha = alpha;

  // central sigil, rotated
  const path = SYMBOL_PATHS[Math.floor(rng() * SYMBOL_PATHS.length)];
  const rot = rng() * Math.PI * 2;
  ctx.save();
  ctx.rotate(rot);
  ctx.beginPath();
  path.forEach(([x, y], i) => {
    const px = x * r * 0.55, py = y * r * 0.55;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  });
  ctx.stroke();
  ctx.restore();

  // tick marks around the ring
  const ticks = 12 + Math.floor(rng() * 12);
  for (let i = 0; i < ticks; i++) {
    const a = (i / ticks) * Math.PI * 2;
    const r0 = r * 0.92, r1 = r * (rng() > 0.75 ? 1.08 : 1.0);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
    ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
    ctx.stroke();
  }

  // a few via dots + one PCB trace escaping the ring
  const viaCount = 3 + Math.floor(rng() * 3);
  for (let i = 0; i < viaCount; i++) {
    const a = rng() * Math.PI * 2;
    const rr = r * (1.15 + rng() * 0.35);
    const vx = Math.cos(a) * rr, vy = Math.sin(a) * rr;
    ctx.beginPath();
    ctx.arc(vx, vy, r * 0.022, 0, Math.PI * 2);
    ctx.fillStyle = ink;
    ctx.globalAlpha = alpha * 0.8;
    ctx.fill();
    ctx.globalAlpha = alpha * 0.35;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 1.02, Math.sin(a) * r * 1.02);
    const midR = (r * 1.02 + rr) / 2;
    ctx.lineTo(Math.cos(a + 0.15) * midR, Math.sin(a + 0.15) * midR);
    ctx.lineTo(vx, vy);
    ctx.stroke();
  }

  ctx.restore();
}

function fitCanvas(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

function renderSigilField(canvas, opts) {
  const { seed = 1, ink = "#c17a4a", satellites = 6 } = opts || {};
  const { ctx, w, h } = fitCanvas(canvas);
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2;
  const R = Math.min(w, h) * 0.34;
  drawSigil(ctx, cx, cy, R, seed, ink, 0.9);

  const rng = mulberry32(seed + 777);
  for (let i = 0; i < satellites; i++) {
    const a = (i / satellites) * Math.PI * 2 + rng() * 0.3;
    const orbit = R * (1.9 + rng() * 0.5);
    const sx = cx + Math.cos(a) * orbit;
    const sy = cy + Math.sin(a) * orbit;
    if (sx < -20 || sx > w + 20 || sy < -20 || sy > h + 20) continue;
    drawSigil(ctx, sx, sy, R * (0.14 + rng() * 0.08), seed + i * 91, ink, 0.35 + rng() * 0.2);
  }
}

window.Cindersmith = { mulberry32, renderSigilField };
