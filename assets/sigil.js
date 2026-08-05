// Cindersmith sigil engine — ported from the gravure-card generator's
// alchemyPrimitives/renderPrims (tmp/content-pipeline-generator/gravure-card-v2.html).
// Same seeded-PRNG vector approach: circles, punched polygons, spokes.

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function alchemyPrimitives(radius, seed) {
  const rng = mulberry32(seed);
  const randInt = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const out = [];

  function circle(r) { out.push({ t: "circle", c: [0, 0], r }); }
  function polyPoints(sides, rotDeg, r) {
    const pts = [];
    const rot = (rotDeg * Math.PI) / 180;
    for (let k = 0; k < sides; k++) {
      const ang = ((2 * Math.PI) / sides) * k + rot;
      pts.push([r * Math.cos(ang), r * Math.sin(ang)]);
    }
    return pts;
  }
  function strokePoly(pts) { out.push({ t: "poly", pts }); }
  function punchPoly(pts) { out.push({ t: "punchPoly", pts }); }
  function punchArc(r) { out.push({ t: "punchCircle", c: [0, 0], r }); }
  function line(x1, y1, x2, y2) { out.push({ t: "line", a: [x1, y1, x2, y2] }); }
  function spokes(sides, rotDeg, len) {
    const rot = (rotDeg * Math.PI) / 180;
    for (let k = 0; k < sides; k++) {
      const ang = ((2 * Math.PI) / sides) * k + rot;
      line(0, 0, len * Math.cos(ang), len * Math.sin(ang));
    }
  }

  circle(radius);
  const lati = randInt(4, 8);
  strokePoly(polyPoints(lati, 0, radius));
  spokes(lati, 0, radius);

  let latis;
  if (lati % 2 === 0) {
    do { latis = randInt(2, 6); } while (latis % 2 !== 0);
    const pts = polyPoints(latis, 180, radius);
    punchPoly(pts);
    strokePoly(pts);
    spokes(latis, 180, radius);
  } else {
    latis = randInt(2, 3) * 2;
    const pts = polyPoints(latis, 180, radius);
    punchPoly(pts);
    strokePoly(pts);
  }

  if (randInt(0, 1) === 0) {
    const ronad = randInt(0, 4);
    if (ronad % 2 === 1) {
      const n = lati + 4;
      spokes(n, 0, (radius / 8) * 5 + 2);
      const pts = polyPoints(n, 0, radius / 2);
      punchPoly(pts);
      strokePoly(pts);
    } else if (ronad % 2 === 0 && lati > 5) {
      const n = lati - 2;
      spokes(n, 0, (radius / 8) * 5 + 2);
      const pts = polyPoints(n, 0, radius / 4);
      punchPoly(pts);
      strokePoly(pts);
    }
  }

  if (randInt(0, 4) % 2 === 0) {
    circle((radius / 8) * 11);
    let latis2;
    if (lati % 2 === 0) {
      do { latis2 = randInt(2, 8); } while (latis2 % 2 !== 0);
    } else {
      latis2 = 2 * randInt(1, 3) + 1;
    }
    strokePoly(polyPoints(latis2, 180, (radius / 3) * 2));
    latis = latis2;
  }

  const kase = randInt(0, 3);
  const dotR = (radius / 44) * 12;
  if (kase === 0 || kase === 1) {
    for (let i = 0; i < latis; i++) {
      const ang = ((2 * Math.PI) / latis) * i;
      const dist = kase === 0 ? (radius / 18) * 11 : radius;
      const px = dist * Math.cos(ang);
      const py = dist * Math.sin(ang);
      out.push({ t: "punchCircle", c: [px, py], r: dotR });
      out.push({ t: "circle", c: [px, py], r: dotR });
    }
  } else if (kase === 2) {
    circle((radius / 18) * 12);
    punchArc((radius / 22) * 12);
    circle((radius / 22) * 12);
  } else if (kase === 3) {
    for (let i = 0; i < latis; i++) {
      const ang = ((2 * Math.PI) / latis) * i;
      line(
        (radius / 3) * 2 * Math.cos(ang),
        (radius / 3) * 2 * Math.sin(ang),
        radius * Math.cos(ang),
        radius * Math.sin(ang)
      );
    }
    if (latis !== lati) {
      punchArc((radius / 3) * 4);
      circle((radius / 3) * 4);
      const newLati = randInt(3, 6);
      strokePoly(polyPoints(newLati, 0, (radius / 4) * 5));
      strokePoly(polyPoints(newLati, 180, (radius / 3) * 2));
    }
  }
  return out;
}

function renderPrims(ctx, prims, color, lineWidth) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const tracePoly = (pts) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();
  };
  const punch = (draw) => {
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    draw();
    ctx.fill();
    ctx.restore();
  };

  for (const p of prims) {
    if (p.t === "circle") {
      ctx.beginPath();
      ctx.arc(p.c[0], p.c[1], p.r, 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.t === "poly") {
      tracePoly(p.pts);
      ctx.stroke();
    } else if (p.t === "line") {
      ctx.beginPath();
      ctx.moveTo(p.a[0], p.a[1]);
      ctx.lineTo(p.a[2], p.a[3]);
      ctx.stroke();
    } else if (p.t === "dot") {
      ctx.beginPath();
      ctx.arc(p.c[0], p.c[1], p.r, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.t === "punchPoly") {
      punch(() => tracePoly(p.pts));
    } else if (p.t === "punchCircle") {
      punch(() => {
        ctx.beginPath();
        ctx.arc(p.c[0], p.c[1], p.r, 0, Math.PI * 2);
      });
    }
  }
  ctx.restore();
}

function drawAlchemyCircleAt(ctx, cx, cy, radius, seed, color, lineWidth) {
  ctx.save();
  ctx.translate(cx, cy);
  renderPrims(ctx, alchemyPrimitives(radius, seed), color, lineWidth);
  ctx.restore();
}

/* ---------- alchemical symbols (subset, ported from SYMBOL_SHAPES) ---------- */
const _L = (x1, y1, x2, y2) => ({ t: "line", a: [x1, y1, x2, y2] });
const _C = (x, y, r) => ({ t: "circle", c: [x, y], r });
const _D = (x, y, r) => ({ t: "dot", c: [x, y], r });
const PI = Math.PI;
const TRI_UP = [[0, -0.85], [0.8, 0.55], [-0.8, 0.55]];
const TRI_DOWN = [[0, 0.85], [0.8, -0.55], [-0.8, -0.55]];

const SYMBOL_SHAPES = [
  () => [{ t: "poly", pts: TRI_UP }],
  () => [{ t: "poly", pts: TRI_DOWN }],
  () => [{ t: "poly", pts: TRI_UP }, _L(-0.42, 0.02, 0.42, 0.02)],
  () => [_C(0, 0, 0.8), _D(0, 0, 0.15)],
  () => [_C(0, 0, 0.8), _L(-0.8, 0, 0.8, 0)],
  () => [_C(0, 0, 0.8), _L(-0.8, 0, 0.8, 0), _L(0, -0.8, 0, 0.8)],
  () => [_C(-0.14, 0.2, 0.44), _L(0.17, -0.11, 0.72, -0.66), _L(0.72, -0.66, 0.36, -0.66), _L(0.72, -0.66, 0.72, -0.3)],
  () => [_L(-0.18, -0.72, -0.18, 0.28), _L(-0.6, -0.36, 0.24, -0.36)],
  () => [_C(0, 0, 0.8), _L(-0.56, -0.56, 0.56, 0.56), _L(-0.56, 0.56, 0.56, -0.56)],
  () => [{ t: "poly", pts: [[0, -0.95], [0.5, 0.69], [-0.81, -0.26], [0.81, -0.26], [-0.5, 0.69]] }],
];

function scalePrims(prims, s) {
  return prims.map((p) => {
    const q = { t: p.t };
    if (p.c) q.c = [p.c[0] * s, p.c[1] * s];
    if (p.r !== undefined) q.r = p.r * s;
    if (p.a) q.a = p.a.map((v) => v * s);
    if (p.pts) q.pts = p.pts.map(([x, y]) => [x * s, y * s]);
    return q;
  });
}

function drawSymbolAt(ctx, cx, cy, r, seed, color, lineWidth) {
  const shape = SYMBOL_SHAPES[Math.floor(mulberry32(seed)() * SYMBOL_SHAPES.length)];
  ctx.save();
  ctx.translate(cx, cy);
  renderPrims(ctx, scalePrims(shape(), r), color, lineWidth);
  ctx.restore();
}

/* ---------- metallic sheen (ported from shadeHex/shineStops/paint) ---------- */
function hexToRgb(hex) {
  const v = hex.replace("#", "");
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}
function shadeHex(hex, amt) {
  const [r, g, b] = hexToRgb(hex);
  const t = amt < 0 ? 0 : 255;
  const p = Math.abs(amt);
  const mix = (c) => Math.round(c + (t - c) * p);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}
function metallicGradient(ctx, color, x0, y0, x1, y1, amt, bands) {
  const warm = shadeHex(color, amt * 0.3);
  const sheen = shadeHex(color, amt);
  const ang = -0.65; // fixed light angle, radians
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const r = Math.max(1, Math.hypot(x1 - x0, y1 - y0) / 2);
  const g = ctx.createLinearGradient(cx - Math.cos(ang) * r, cy - Math.sin(ang) * r, cx + Math.cos(ang) * r, cy + Math.sin(ang) * r);
  g.addColorStop(0, warm);
  for (let b = 0; b < bands; b++) {
    const c = (b + 0.5) / bands;
    const w = 0.5 / bands;
    g.addColorStop(Math.max(0.01, c - w * 0.75), color);
    g.addColorStop(c, sheen);
    g.addColorStop(Math.min(0.99, c + w * 0.75), color);
  }
  g.addColorStop(1, warm);
  return g;
}

/* ---------- PCB-style elbow traces with square pads ---------- */
function drawPad(ctx, x, y, s, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x - s / 2, y - s / 2, s, s);
}
function drawTrace(ctx, x0, y0, x1, y1, color, lw, bendFirst) {
  const midX = bendFirst ? x1 : x0;
  const midY = bendFirst ? y0 : y1;
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineJoin = "round";
  ctx.lineCap = "square";
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(midX, midY);
  ctx.lineTo(x1, y1);
  ctx.stroke();
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

// Renders one main alchemy circle plus a ring of smaller satellite circles,
// each its own seed — mirrors how the generator scatters satellites around
// the main sigil.
function renderSigilField(canvas, opts) {
  const { seed = 1, ink = "#c17a4a", highlight = "#e0996a", satellites = 6 } = opts || {};
  const { ctx, w, h } = fitCanvas(canvas);
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2;
  const R = Math.min(w, h) * 0.32;
  const lw = Math.max(1.4, R * 0.026);

  const rng = mulberry32(seed + 777);
  const sats = [];
  for (let i = 0; i < satellites; i++) {
    const a = (i / satellites) * Math.PI * 2 + rng() * 0.3;
    const orbit = R * (1.75 + rng() * 0.6);
    const sx = cx + Math.cos(a) * orbit;
    const sy = cy + Math.sin(a) * orbit;
    const sr = R * (0.15 + rng() * 0.11);
    if (sx < -sr || sx > w + sr || sy < -sr || sy > h + sr) continue;
    sats.push({ x: sx, y: sy, r: sr, a });
  }

  // PCB-style elbow traces from the core ring out to each satellite pad,
  // right-angle bends instead of straight wires, with square via pads
  const traceMetal = metallicGradient(ctx, ink, cx - R * 2, cy - R * 2, cx + R * 2, cy + R * 2, 0.5, 3);
  sats.forEach((s, i) => {
    const x0 = cx + Math.cos(s.a) * R, y0 = cy + Math.sin(s.a) * R;
    ctx.globalAlpha = 0.65;
    drawTrace(ctx, x0, y0, s.x, s.y, traceMetal, lw * 0.55, i % 2 === 0);
    ctx.globalAlpha = 0.9;
    drawPad(ctx, x0, y0, lw * 1.3, ink);
    drawPad(ctx, s.x, s.y, lw * 1.3, ink);
    ctx.globalAlpha = 1;
  });

  // a couple of decorative dead-end stub traces for circuit-board density
  const stubRng = mulberry32(seed + 55);
  for (let i = 0; i < 4; i++) {
    const a = stubRng() * Math.PI * 2;
    const x0 = cx + Math.cos(a) * R * 1.02, y0 = cy + Math.sin(a) * R * 1.02;
    const len = R * (0.14 + stubRng() * 0.16);
    const horizFirst = stubRng() > 0.5;
    const x1 = x0 + (horizFirst ? Math.cos(a) : 0) * len;
    const y1 = y0 + (horizFirst ? 0 : Math.sin(a)) * len;
    ctx.globalAlpha = 0.35;
    drawTrace(ctx, x0, y0, x1, y1, ink, lw * 0.4, horizFirst);
    drawPad(ctx, x1, y1, lw * 0.9, ink);
    ctx.globalAlpha = 1;
  }

  // satellite sigils in brushed metal, each with a small alchemical symbol inside
  sats.forEach((s, i) => {
    const satMetal = metallicGradient(ctx, ink, s.x - s.r, s.y - s.r, s.x + s.r, s.y + s.r, 0.45, 2);
    ctx.globalAlpha = 0.85;
    drawAlchemyCircleAt(ctx, s.x, s.y, s.r, seed + i * 91 + 1, satMetal, lw * 0.75);
    drawSymbolAt(ctx, s.x, s.y, s.r * 0.42, seed + i * 91 + 2, satMetal, lw * 0.7);
    ctx.globalAlpha = 1;
  });

  // main circle in bright brushed metal with a soft bloom, symbol at the core
  const coreMetal = metallicGradient(ctx, highlight, cx - R, cy - R, cx + R, cy + R, 0.6, 4);
  ctx.save();
  ctx.shadowColor = highlight;
  ctx.shadowBlur = R * 0.08;
  drawAlchemyCircleAt(ctx, cx, cy, R, seed, coreMetal, lw);
  ctx.restore();
  drawSymbolAt(ctx, cx, cy, R * 0.3, seed + 501, coreMetal, lw * 0.85);
}

window.Cindersmith = { mulberry32, alchemyPrimitives, renderPrims, drawAlchemyCircleAt, renderSigilField };
