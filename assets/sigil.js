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
    } else if (p.t === "arc") {
      ctx.beginPath();
      ctx.arc(p.c[0], p.c[1], p.r, p.a0, p.a1);
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

/* ---------- PCB net routing (ported from pcbPath/lanePrims/tracePrims) ---------- */
function offsetPolyPts(pts, dirs, off) {
  return pts.map((p, j) => {
    const dPrev = dirs[Math.min(Math.max(j - 1, 0), dirs.length - 1)];
    const dNext = dirs[Math.min(j, dirs.length - 1)];
    const mx = (Math.cos(dPrev + Math.PI / 2) + Math.cos(dNext + Math.PI / 2)) / 2;
    const my = (Math.sin(dPrev + Math.PI / 2) + Math.sin(dNext + Math.PI / 2)) / 2;
    const m2 = mx * mx + my * my || 1;
    return [p[0] + (mx * off) / m2, p[1] + (my * off) / m2];
  });
}

function pcbPath(p0, e) {
  const vx = e[0] - p0[0], vy = e[1] - p0[1];
  const d = Math.min(Math.abs(vx), Math.abs(vy));
  const pts = [p0];
  const dirs = [];
  const straight = Math.abs(vx) >= Math.abs(vy)
    ? [vx - Math.sign(vx) * d, 0]
    : [0, vy - Math.sign(vy) * d];
  if (Math.hypot(straight[0], straight[1]) > 0.5) {
    pts.push([p0[0] + straight[0], p0[1] + straight[1]]);
    dirs.push(Math.atan2(straight[1], straight[0]));
  }
  if (d > 0.5) {
    const pl = pts[pts.length - 1];
    pts.push([pl[0] + Math.sign(vx) * d, pl[1] + Math.sign(vy) * d]);
    dirs.push(Math.atan2(Math.sign(vy) * Math.SQRT1_2, Math.sign(vx) * Math.SQRT1_2));
  }
  return { pts, dirs };
}

function lanePrims(prims, path, lanes, spacing, viaStart, viaEnd, viaR) {
  for (let l = 0; l < lanes; l++) {
    const off = (l - (lanes - 1) / 2) * spacing;
    const pts = offsetPolyPts(path.pts, path.dirs, off);
    for (let k = 0; k < pts.length - 1; k++) {
      prims.push({ t: "line", a: [pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1]] });
    }
    if (viaStart) prims.push({ t: "circle", c: pts[0], r: viaR }, { t: "punchCircle", c: pts[0], r: viaR * 0.45 });
    if (viaEnd) {
      const pe = pts[pts.length - 1];
      prims.push({ t: "circle", c: pe, r: viaR }, { t: "punchCircle", c: pe, r: viaR * 0.45 });
    }
  }
}

function ptSegDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l2)) : 0;
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function corridorClear(pts, halfW, env, corridors, exempt) {
  const step = 8 * env.u;
  for (let k = 0; k < pts.length - 1; k++) {
    const [x1, y1] = pts[k], [x2, y2] = pts[k + 1];
    const n = Math.max(2, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / step));
    for (let t = 0; t <= n; t++) {
      const x = x1 + ((x2 - x1) * t) / n, y = y1 + ((y2 - y1) * t) / n;
      const dC = Math.hypot(x - env.cx, y - env.cy);
      if (dC < env.coreR) return false;
      if (dC > env.ringIn - halfW && dC < env.ringOut + halfW) return false;
      for (const r of env.rects) {
        if (x > r[0] - halfW && x < r[2] + halfW && y > r[1] - halfW && y < r[3] + halfW) return false;
      }
      for (const sOb of env.sats) {
        if (!exempt.has(sOb) && Math.hypot(x - sOb.x, y - sOb.y) < sOb.r + halfW * 0.5) return false;
      }
      for (const c of corridors) {
        for (let m = 0; m < c.pts.length - 1; m++) {
          if (ptSegDist(x, y, c.pts[m][0], c.pts[m][1], c.pts[m + 1][0], c.pts[m + 1][1]) < halfW + c.halfW + env.gap) return false;
        }
      }
    }
  }
  return true;
}

function tracePrims(seed, sats, viaR, env, edgeCount, linkCount, maxLanes) {
  const rng = mulberry32(seed * 13 + 4211);
  const nets = [], anchors = [], corridors = [];
  const spacing = viaR * 2.2;
  const { cx, cy } = env;
  const commitCorridor = (pts, halfW) => corridors.push({ pts, halfW });
  const via = (nP, p) => {
    nP.push({ t: "circle", c: [p[0], p[1]], r: viaR }, { t: "punchCircle", c: [p[0], p[1]], r: viaR * 0.45 });
    anchors.push([p[0], p[1]]);
  };

  /* edge bundles — slot-packed down each side */
  let made = 0;
  const yCursor = [env.yMin + viaR * 4, env.yMin + viaR * 4];
  let safety = 0;
  while (made < edgeCount && safety++ < 300) {
    const side = safety % 2;
    const left = side === 0;
    const y = yCursor[side];
    if (y > env.yMax - viaR * 4) {
      if (yCursor[1 - side] > env.yMax - viaR * 4) break;
      continue;
    }
    const lanes = 1 + Math.floor(rng() * maxLanes);
    const halfW = ((lanes - 1) * spacing) / 2 + viaR * 1.5;
    yCursor[side] = y + halfW * 2 + env.gap + rng() * 24 * env.u;
    const p0 = [left ? -viaR * 2 : env.w + viaR * 2, y];
    const xInnerL = cx - env.ringOut - halfW;
    const xInnerR = cx + env.ringOut + halfW;
    const ex = left
      ? 20 * env.u + rng() * Math.max(20 * env.u, xInnerL - 20 * env.u)
      : env.w - 20 * env.u - rng() * Math.max(20 * env.u, env.w - 20 * env.u - xInnerR);
    const ey = Math.min(env.yMax - viaR * 3, Math.max(env.yMin + viaR * 3, y + (rng() - 0.5) * 90 * env.u));
    const path = pcbPath(p0, [ex, ey]);
    if (!path.dirs.length) continue;
    if (!corridorClear(path.pts, halfW, env, corridors, new Set())) continue;
    const netP = [];
    lanePrims(netP, path, lanes, spacing, false, true, viaR);
    const pe = path.pts[path.pts.length - 1];
    anchors.push([pe[0], pe[1]]);
    nets.push({ prims: netP });
    commitCorridor(path.pts, halfW);
    made++;
  }

  /* satellite links — routed around the core on a bus arc */
  const norm = (a) => ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const byAngle = [...sats].sort(
    (a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx)
  );
  const used = new Map();
  let links = 0;
  for (const step of [1, 2]) {
    for (let k = 0; k < byAngle.length && links < linkCount; k++) {
      const s1 = byAngle[k], s2 = byAngle[(k + step) % byAngle.length];
      if (s1 === s2) continue;
      if ((used.get(s1) || 0) >= 2 || (used.get(s2) || 0) >= 2) continue;
      const a1 = Math.atan2(s1.y - cy, s1.x - cx);
      const a2 = Math.atan2(s2.y - cy, s2.x - cx);
      const d1 = Math.hypot(s1.x - cx, s1.y - cy) - s1.r - viaR * 1.6;
      const d2 = Math.hypot(s2.x - cx, s2.y - cy) - s2.r - viaR * 1.6;
      const lanes = 1 + Math.floor(rng() * maxLanes);
      const halfW = ((lanes - 1) * spacing) / 2 + viaR * 1.5;
      const minD = Math.min(d1, d2);
      const cands = [];
      const outMin = env.ringOut + halfW + viaR * 0.7;
      if (minD - viaR * 1.5 > outMin) {
        cands.push([outMin + rng() * viaR, lanes, halfW]);
        cands.push([(outMin + minD - viaR * 1.5) / 2, lanes, halfW]);
        cands.push([minD - viaR * 1.5, 1, viaR * 1.2]);
      }
      const ccwSweep = norm(a2 - a1);
      const sweeps = ccwSweep <= Math.PI
        ? [[1, ccwSweep], [-1, Math.PI * 2 - ccwSweep]]
        : [[-1, Math.PI * 2 - ccwSweep], [1, ccwSweep]];
      let done = false;
      for (const [busR, lanesL, halfWL] of cands) {
        if (done) break;
        for (const [dirSign, sweep] of sweeps) {
          if (done || sweep < 0.02) continue;
          const p1 = [cx + Math.cos(a1) * d1, cy + Math.sin(a1) * d1];
          const q1 = [cx + Math.cos(a1) * busR, cy + Math.sin(a1) * busR];
          const p2 = [cx + Math.cos(a2) * d2, cy + Math.sin(a2) * d2];
          const q2 = [cx + Math.cos(a2) * busR, cy + Math.sin(a2) * busR];
          const samples = [p1, q1];
          const n = Math.max(4, Math.ceil((sweep * busR) / (10 * env.u)));
          for (let t = 1; t < n; t++) {
            const a = a1 + dirSign * sweep * (t / n);
            samples.push([cx + Math.cos(a) * busR, cy + Math.sin(a) * busR]);
          }
          samples.push(q2, p2);
          if (!corridorClear(samples, halfWL, env, corridors, new Set([s1, s2]))) continue;
          const netP = [];
          for (let l = 0; l < lanesL; l++) {
            const off = (l - (lanesL - 1) / 2) * spacing;
            const bR = busR + off;
            const da1 = off / ((d1 + busR) / 2), da2 = off / ((d2 + busR) / 2);
            const lp1 = [cx + Math.cos(a1 + da1) * d1, cy + Math.sin(a1 + da1) * d1];
            const lq1a = a1 + da1;
            const lq2a = a2 + da2;
            const lp2 = [cx + Math.cos(a2 + da2) * d2, cy + Math.sin(a2 + da2) * d2];
            netP.push({ t: "line", a: [lp1[0], lp1[1], cx + Math.cos(lq1a) * bR, cy + Math.sin(lq1a) * bR] });
            const from = dirSign > 0 ? lq1a : lq2a;
            const sw = dirSign > 0 ? norm(lq2a - lq1a) || sweep : norm(lq1a - lq2a) || sweep;
            netP.push({ t: "arc", c: [cx, cy], r: bR, a0: from, a1: from + sw });
            netP.push({ t: "line", a: [cx + Math.cos(lq2a) * bR, cy + Math.sin(lq2a) * bR, lp2[0], lp2[1]] });
            via(netP, lp1);
            via(netP, lp2);
          }
          nets.push({ prims: netP });
          commitCorridor(samples, halfWL);
          used.set(s1, (used.get(s1) || 0) + 1);
          used.set(s2, (used.get(s2) || 0) + 1);
          links++;
          done = true;
        }
      }
    }
  }
  return { prims: nets.flatMap((n) => n.prims), anchors };
}

function planTraceLabels(anchors, count, seed, env, size) {
  const rng = mulberry32(seed * 29 + 811);
  const pool = [...anchors];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const out = [];
  const w = size * 2.6, h = size * 1.2;
  const offs = [[0.9, -0.9], [0.9, 0.9], [-3.4, -0.9], [-3.4, 0.9]];
  for (const [ax, ay] of pool) {
    if (out.length >= count) break;
    for (const [ox, oy] of offs) {
      const x = ax + ox * size, y = ay + oy * size;
      if (x < 4 * env.u || x + w > env.w - 4 * env.u || y - h / 2 < 4 * env.u || y + h / 2 > env.h - 4 * env.u) continue;
      if (Math.hypot(x + w / 2 - env.cx, y - env.cy) < env.ringOut + w / 2) continue;
      if (env.sats.some((s) => Math.hypot(x + w / 2 - s.x, y - s.y) < s.r * 1.2 + w / 2)) continue;
      if (out.some((o) => Math.abs(o.x - x) < w * 1.2 && Math.abs(o.y - y) < h * 1.6)) continue;
      out.push({ x, y, sym: Math.floor(rng() * SYMBOL_SHAPES.length), num: 1 + Math.floor(rng() * 98) });
      break;
    }
  }
  return out;
}

/* ---------- satellites & symbol ring ---------- */
function planSatellites(seed, count, cx, cy, orbitR, sizeScale, sizeVar, angleOffDeg, jitter, u) {
  const rng = mulberry32(seed * 7 + 991);
  const randInt = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const out = [];
  if (count <= 0) return out;
  const baseR = 46 * u * sizeScale;
  const slice = (Math.PI * 2) / count;
  for (let i = 0; i < count; i++) {
    const a = (angleOffDeg * Math.PI) / 180 + slice * i + (rng() - 0.5) * jitter * slice * 0.8;
    const r = Math.max(8 * u, baseR * (1 + (rng() - 0.5) * 1.2 * sizeVar));
    const dist = orbitR + r + rng() * jitter * 70 * u;
    const x = cx + Math.cos(a) * dist;
    const y = cy + Math.sin(a) * dist;
    let ok = true;
    for (const p of out) {
      if (Math.hypot(x - p.x, y - p.y) < (r + p.r) * 0.75) { ok = false; break; }
    }
    if (!ok) continue;
    out.push({ x, y, r, seed: randInt(0, 999999), t: rng(), rot: rng() * Math.PI * 2 });
  }
  return out;
}

function planSymbolRing(seed, count, radius, rot) {
  const rng = mulberry32(seed + 7717);
  const out = [];
  const pool = [...Array(SYMBOL_SHAPES.length).keys()];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  for (let i = 0; i < count; i++) {
    const a = ((Math.PI * 2) / count) * i - Math.PI / 2 + rot;
    out.push({ x: radius * Math.cos(a), y: radius * Math.sin(a), ang: a, i: pool[i % pool.length] });
  }
  return out;
}

function drawSymbolIdx(ctx, i, r, color, lineWidth) {
  renderPrims(ctx, scalePrims(SYMBOL_SHAPES[i % SYMBOL_SHAPES.length](), r), color, lineWidth);
}

/* ---------- surface texture ---------- */
function drawGlitter(ctx, cx, cy, radius, seed, color, count) {
  const rng = mulberry32(seed * 13 + 4177);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const ang = rng() * Math.PI * 2;
    const rr = radius * (0.22 + rng() * 0.9);
    ctx.globalAlpha = 0.3 + rng() * 0.55;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx + rr * Math.cos(ang), cy + rr * Math.sin(ang), radius * (0.004 + rng() * 0.008), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawGrain(canvas, ctx, seed, amount, cell) {
  if (amount <= 0) return;
  const rng = mulberry32(seed + 7);
  const w = canvas.width, h = canvas.height;
  const s = Math.max(1, Math.round(cell));
  const strength = 11 * amount;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let y = 0; y < h; y += s) {
    for (let x = 0; x < w; x += s) {
      const n = (rng() - 0.5) * 2 * strength;
      for (let dy = 0; dy < s && y + dy < h; dy++) {
        for (let dx = 0; dx < s && x + dx < w; dx++) {
          const i = ((y + dy) * w + (x + dx)) * 4;
          if (d[i + 3] === 0) continue;
          d[i] = Math.min(255, Math.max(0, d[i] + n));
          d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + n));
          d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + n));
        }
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}

function fitCanvas(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const w = canvas.clientWidth || canvas.width;
  const h = canvas.clientHeight || canvas.height;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext("2d");
  // Derive the scale from the rounded backing store, not from dpr — a rounded
  // width against a fractional CSS box leaves every stroke a half-pixel off.
  ctx.setTransform(canvas.width / w, 0, 0, canvas.height / h, 0, 0);
  return { ctx, w, h, dpr };
}

/* Layer order mirrors renderCard: PCB nets underneath, then designators, then
   satellites, then the core circle, glitter, symbol ring, and grain on top. */
function renderSigilField(canvas, opts) {
  const o = opts || {};
  const seed = o.seed === undefined ? 1 : o.seed;
  const ink = o.ink || "#c17a4a";
  const highlight = o.highlight || "#e0996a";
  const voidCol = o.void || "#061a1c";
  const satCount = o.satellites === undefined ? 6 : o.satellites;
  const edgeCount = o.edges === undefined ? 5 : o.edges;
  const labelCount = o.labels === undefined ? 6 : o.labels;
  const symRingCount = o.symRing === undefined ? 8 : o.symRing;
  const grainAmt = o.grain === undefined ? 0.16 : o.grain;

  const { ctx, w, h, dpr } = fitCanvas(canvas);
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2;
  const R = Math.min(w, h) * 0.3;
  const u = R / 200;
  // One stroke weight for the whole plate; every layer is a fixed ratio of it,
  // so nothing reads heavier than its place in the stack. Vias stay clearly
  // wider than the trace that feeds them or they collapse into blobs.
  const lw = Math.max(1, R * 0.016);
  const viaR = Math.max(2.2, R * 0.032);

  const sats = planSatellites(seed, satCount, cx, cy, R + 40 * u, 1.0, 0.5, -18, 0.55, u)
    .filter((s) => s.x > -s.r && s.x < w + s.r && s.y > -s.r && s.y < h + s.r);

  const env = {
    u, w, h, cx, cy,
    coreR: R + 6 * u,
    ringIn: 1e9,
    ringOut: R + 6 * u,
    gap: 6 * u,
    yMin: 4 * u,
    yMax: h - 4 * u,
    rects: [],
    sats,
  };

  const metal = (color, x0, y0, x1, y1, amt, bands) =>
    metallicGradient(ctx, color, x0, y0, x1, y1, amt, bands);

  /* PCB layer */
  const traceData = tracePrims(seed, sats, viaR, env, edgeCount, sats.length, 3);
  ctx.save();
  ctx.globalAlpha = 0.55;
  renderPrims(ctx, traceData.prims, metal(ink, 0, 0, w, h, 0.45, 3), lw * 0.6);
  ctx.restore();

  /* silkscreen designators at net anchors */
  if (labelCount > 0) {
    const size = Math.max(6, R * 0.055);
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.font = `500 ${size}px ${getComputedStyle(document.documentElement).getPropertyValue("--font-mono") || "monospace"}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    for (const d of planTraceLabels(traceData.anchors, labelCount, seed, env, size)) {
      ctx.save();
      ctx.translate(d.x, d.y);
      drawSymbolIdx(ctx, d.sym, size * 0.42, ink, lw * 0.55);
      ctx.fillStyle = ink;
      ctx.fillText(String(d.num).padStart(2, "0"), size * 0.75, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  /* satellites — punched shapes filled with void first, then stroked */
  for (const s of sats) {
    ctx.save();
    ctx.globalAlpha = 0.9 * (0.5 + s.t * 0.5);
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rot);
    const satPr = alchemyPrimitives(s.r, s.seed);
    ctx.save();
    ctx.globalAlpha *= 0.85;
    ctx.fillStyle = voidCol;
    for (const p of satPr) {
      if (p.t === "punchCircle") {
        ctx.beginPath();
        ctx.arc(p.c[0], p.c[1], p.r, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.t === "punchPoly") {
        ctx.beginPath();
        p.pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
    renderPrims(
      ctx,
      satPr.filter((p) => p.t !== "punchPoly" && p.t !== "punchCircle"),
      metal(ink, -s.r, -s.r, s.r, s.r, 0.45, 2),
      lw * 0.75
    );
    ctx.restore();
  }

  /* core circle — gradient built in local coords so it lands on the circle */
  drawAlchemyCircleAt(ctx, cx, cy, R, seed, metal(highlight, -R, -R, R, R, 0.6, 4), lw * 1.35);
  drawGlitter(ctx, cx, cy, R, seed, highlight, 26);

  /* symbol ring, each glyph tangent to the orbit */
  if (symRingCount > 0) {
    const symSize = R * 0.11;
    ctx.save();
    ctx.globalAlpha = 0.9;
    for (const p of planSymbolRing(seed, symRingCount, R * 1.22, 0)) {
      ctx.save();
      ctx.translate(cx + p.x, cy + p.y);
      ctx.rotate(p.ang + Math.PI / 2);
      drawSymbolIdx(ctx, p.i, symSize, metal(highlight, -symSize, -symSize, symSize, symSize, 0.5, 2), lw * 0.75);
      ctx.restore();
    }
    ctx.restore();
  }

  drawGrain(canvas, ctx, seed, grainAmt, 2.5 * dpr);
}

window.Cindersmith = {
  mulberry32, alchemyPrimitives, renderPrims, drawAlchemyCircleAt,
  planSatellites, tracePrims, renderSigilField,
};
