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
  const { seed = 1, ink = "#c17a4a", satellites = 6 } = opts || {};
  const { ctx, w, h } = fitCanvas(canvas);
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2;
  const R = Math.min(w, h) * 0.34;
  const lw = Math.max(1, R * 0.02);

  const rng = mulberry32(seed + 777);
  for (let i = 0; i < satellites; i++) {
    const a = (i / satellites) * Math.PI * 2 + rng() * 0.35;
    const orbit = R * (1.85 + rng() * 0.55);
    const sx = cx + Math.cos(a) * orbit;
    const sy = cy + Math.sin(a) * orbit;
    if (sx < -20 || sx > w + 20 || sy < -20 || sy > h + 20) continue;
    ctx.globalAlpha = 0.4 + rng() * 0.25;
    drawAlchemyCircleAt(ctx, sx, sy, R * (0.16 + rng() * 0.1), seed + i * 91 + 1, ink, lw * 0.85);
    ctx.globalAlpha = 1;
  }

  drawAlchemyCircleAt(ctx, cx, cy, R, seed, ink, lw);
}

window.Cindersmith = { mulberry32, alchemyPrimitives, renderPrims, drawAlchemyCircleAt, renderSigilField };
