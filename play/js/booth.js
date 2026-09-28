/* =====================================================================
   The booth, seen first person: a camera zoomed into the gallery follows
   your sights; your rifle, the counter and your rivals' shoulders are in
   the foreground. Drag to aim like a mouse, press Pow! to fire. Also the effects, the
   scoreboard and the shell belt.
   startRound() runs a round; the rules themselves are in gallery.js.
   ===================================================================== */
"use strict";
let R = null, PLAY = null, paused = false, raf = 0, lastT = 0, endAt = 0;
const cv = $('cv'), ctx = cv.getContext('2d');
const V = { D: 1, cw: 0, ch: 0, sc: 1, k: 1, ox: 0, oy: 0, pat: null, patFor: '' };
// the first-person camera: how far it's zoomed in, where it looks (world units), and where on screen that point sits
const ZOOM = 1.55, EYE = .46, COUNTER = .8; // counter: the foreground counter starts this far down the screen
const CAM = { x: 200, y: 300 };
// your sights, in world units, and the drag that moves them
const SIGHT = { x: 200, y: 300, wx: 0, wy: 0, drag: null, keys: {} };
// Aiming is like a mouse: screen px of sight per px of thumb when moving slowly, how much faster moves add, up to a limit.
// SLOW: below this thumb speed (px per ms) it stays 1 to 1. Otis wants zero delay: never add easing or glide to the sights.
const THUMB = { BASE: 1, SLOW: .25, ACCEL: 1.6, MAX: 4 };
let FX = [], HOLES = [], BLOTS = [], SHAKE = 0;
const AIM = [{ x: 110, y: 300, kick: 0 }, { x: 200, y: 300, kick: 0 }, { x: 290, y: 300, kick: 0 }];

// ---------- layout ----------
function resize() {
  const r = $('stage').getBoundingClientRect();
  V.D = dpr(); V.cw = Math.max(1, r.width); V.ch = Math.max(1, r.height);
  cv.width = Math.round(V.cw * V.D); cv.height = Math.round(V.ch * V.D);
  V.sc = Math.min(V.cw / E.W, V.ch * COUNTER / E.GH);
  V.k = V.sc * ZOOM;
  resetSprites(V.k * V.D); V.patFor = '';
  camera(1);
}
// The camera eases toward the sights, but never so far that you'd see past the booth's poles, awning or counter.
function camera(f) {
  const hw = V.cw / 2 / V.k, up = V.ch * EYE / V.k, down = V.ch * (COUNTER - EYE) / V.k;
  const clampTo = (v, lo, hi) => lo > hi ? (lo + hi) / 2 : Math.max(lo, Math.min(hi, v));
  const tx = clampTo(SIGHT.x, hw - 70, E.W + 70 - hw), ty = clampTo(SIGHT.y, up - 4, E.GH + 14 - down);
  CAM.x += (tx - CAM.x) * f; CAM.y += (ty - CAM.y) * f;
  V.ox = V.cw / 2 - CAM.x * V.k; V.oy = V.ch * EYE - CAM.y * V.k;
}
addEventListener('resize', () => { if (R && $('play').classList.contains('on')) { resize(); draw(); } });
const world = () => ctx.setTransform(V.D * V.k, 0, 0, V.D * V.k, V.D * (V.ox + (SHAKE ? (Math.random() - .5) * SHAKE : 0)), V.D * (V.oy + (SHAKE ? (Math.random() - .5) * SHAKE : 0)));
const screenXY = (x, y) => [V.ox + x * V.k, V.oy + y * V.k];
const viewLeft = () => -V.ox / V.k, viewRight = () => (V.cw - V.ox) / V.k, viewTop = () => -V.oy / V.k, viewBottom = () => (V.ch - V.oy) / V.k;

// ---------- the back wall ----------
function wallPattern(kind) {
  const k = V.k * V.D, tw = { waves: 48, bricks: 48, planks: 36, night: 120, harlequin: 40 }[kind], th = { waves: 26, bricks: 26, planks: 90, night: 120, harlequin: 60 }[kind];
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(tw * k)); c.height = Math.max(1, Math.round(th * k));
  const x = c.getContext('2d'); x.scale(c.width / tw, c.height / th);
  x.fillStyle = kind === 'night' ? '#000' : '#fff'; x.fillRect(0, 0, tw, th);
  x.strokeStyle = '#000'; x.fillStyle = '#000'; x.lineWidth = .9; x.lineCap = 'round';
  if (kind === 'waves') { x.globalAlpha = .28; x.beginPath(); x.moveTo(0, 13); x.quadraticCurveTo(12, 7, 24, 13); x.quadraticCurveTo(36, 19, 48, 13); x.stroke(); }
  if (kind === 'bricks') { x.globalAlpha = .26; x.strokeRect(0, 0, 48, 13); x.beginPath(); x.moveTo(24, 13); x.lineTo(24, 26); x.moveTo(0, 26); x.lineTo(48, 26); x.stroke(); }
  if (kind === 'planks') { x.globalAlpha = .3; x.beginPath(); x.moveTo(.5, 0); x.lineTo(.5, 90); x.moveTo(12, 10); x.quadraticCurveTo(16, 30, 11, 50); x.moveTo(24, 40); x.quadraticCurveTo(20, 60, 25, 85); x.stroke(); x.beginPath(); x.arc(4, 6, 1, 0, TAU); x.arc(4, 84, 1, 0, TAU); x.fill(); }
  if (kind === 'night') { x.fillStyle = '#fff'; const r = E.rng(7); for (let i = 0; i < 14; i++) { const px = r() * 120, py = r() * 120, s = .6 + r() * 1.4; if (i % 3) { x.beginPath(); x.arc(px, py, s * .6, 0, TAU); x.fill(); } else { x.strokeStyle = '#fff'; x.lineWidth = .8; x.beginPath(); x.moveTo(px - s * 2, py); x.lineTo(px + s * 2, py); x.moveTo(px, py - s * 2); x.lineTo(px, py + s * 2); x.stroke(); } } }
  if (kind === 'harlequin') { x.globalAlpha = .26; x.beginPath(); x.moveTo(20, 0); x.lineTo(40, 30); x.lineTo(20, 60); x.lineTo(0, 30); x.closePath(); x.stroke(); x.globalAlpha = .12; x.fill(); }
  return ctx.createPattern(c, 'repeat');
}
function drawWall() {
  const kind = R.B.wall;
  if (V.patFor !== kind) { V.pat = wallPattern(kind); V.patFor = kind; }
  // the wall pans with the camera
  ctx.setTransform(1, 0, 0, 1, V.D * V.ox, V.D * V.oy); ctx.fillStyle = V.pat; ctx.fillRect(-V.D * V.ox, -V.D * V.oy, cv.width, cv.height);
}
function drawAwning() {
  const l = viewLeft() - 2, r = viewRight() + 2, t = viewTop() - 2, y = 34, w = 32;
  ctx.lineJoin = 'round';
  // the shadow it throws
  ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.beginPath(); ctx.rect(l, t, r - l, y + 8 - t);
  for (let x = Math.floor(l / w) * w; x < r; x += w) ctx.arc(x + w / 2, y + 8, w / 2, 0, Math.PI);
  ctx.fill();
  for (let x = Math.floor(l / w) * w, i = Math.floor(l / w); x < r; x += w, i++) {
    ctx.beginPath(); ctx.moveTo(x, t); ctx.lineTo(x, y); ctx.arc(x + w / 2, y, w / 2, Math.PI, 0, true); ctx.lineTo(x + w, t); ctx.closePath();
    ctx.fillStyle = '#fff'; ctx.fill();
    if (i % 2) { ctx.save(); ctx.clip(); ctx.beginPath(); for (let k = -40; k < 60; k += 4.2) { ctx.moveTo(x + k, t); ctx.lineTo(x + k - 30, y + 20); } ctx.lineWidth = 1.1; ctx.strokeStyle = '#000'; ctx.stroke(); ctx.restore(); }
    ctx.beginPath(); ctx.moveTo(x, t); ctx.lineTo(x, y); ctx.arc(x + w / 2, y, w / 2, Math.PI, 0, true); ctx.lineTo(x + w, t); ctx.lineWidth = 2.3; ctx.strokeStyle = '#000'; ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(l, 18); ctx.lineTo(r, 18); ctx.lineWidth = 2.3; ctx.stroke();
  // bulbs along the valance
  for (let x = Math.floor(l / w) * w; x < r; x += w) { const on = (Math.floor(PLAY.clock * 3) + x / w) % 2 === 0; ctx.beginPath(); ctx.arc(x + w / 2, 18, 3.4, 0, TAU); ctx.fillStyle = on || R.lastCall ? '#fff' : '#000'; ctx.fill(); ctx.lineWidth = 1.6; ctx.stroke(); }
}
function drawPoles() {
  [[-4], [E.W + 4]].forEach(([x]) => {
    ctx.beginPath(); ctx.rect(x - 6, 20, 12, E.GH - 10); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.save(); ctx.clip(); ctx.beginPath(); for (let y = 0; y < E.GH + 20; y += 14) { ctx.moveTo(x - 8, y); ctx.lineTo(x + 8, y + 10); } ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.stroke(); ctx.restore();
    ctx.beginPath(); ctx.rect(x - 6, 20, 12, E.GH - 10); ctx.lineWidth = 2.3; ctx.stroke();
  });
}
// ---------- the machinery ----------
function drawRigBack(r) {
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (r.k === 'rail' && !r.water) {
    const ty = r.y + (r.wire ? 16 : 28);
    for (const sl of r.slots) if (sl.vis) { const t = E.T[sl.type]; ctx.beginPath(); ctx.moveTo(sl.x, sl.y + t.ry * .5); ctx.lineTo(sl.x, ty); ctx.lineWidth = 5.5; ctx.strokeStyle = '#000'; ctx.stroke(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-40, ty); ctx.lineTo(E.W + 40, ty);
    if (r.wire) { ctx.lineWidth = 4; ctx.strokeStyle = '#000'; ctx.stroke(); ctx.lineWidth = 1.4; ctx.strokeStyle = '#fff'; ctx.stroke(); }
    else {
      ctx.lineWidth = 9; ctx.strokeStyle = '#000'; ctx.stroke(); ctx.lineWidth = 5; ctx.strokeStyle = '#fff'; ctx.stroke();
      ctx.lineDashOffset = -(r.dir * r.speed * R.mt) % 12; ctx.setLineDash([5, 7]); ctx.lineWidth = 5; ctx.strokeStyle = '#000'; ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
    }
  }
  if (r.k === 'pop' && r.frame) r.slots.forEach(sl => {
    const x = r.xs[sl.k];
    ctx.beginPath(); ctx.rect(x - 28, r.y - 32, 56, 56); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.save(); ctx.clip(); ctx.beginPath(); for (let k = -60; k < 60; k += 3.4) { ctx.moveTo(x + k, r.y - 32); ctx.lineTo(x + k + 40, r.y + 24); } ctx.lineWidth = 1; ctx.strokeStyle = '#000'; ctx.stroke(); ctx.restore();
    ctx.lineWidth = 5; ctx.strokeStyle = '#000'; ctx.strokeRect(x - 28, r.y - 32, 56, 56);
  });
  if (r.k === 'wheel') {
    const a0 = r.spin * R.mt;
    r.slots.forEach(sl => { ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(sl.x, sl.y); ctx.lineWidth = 6; ctx.strokeStyle = '#000'; ctx.stroke(); ctx.lineWidth = 2.4; ctx.strokeStyle = '#fff'; ctx.stroke(); });
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU); ctx.lineWidth = 8; ctx.strokeStyle = '#000'; ctx.stroke(); ctx.lineWidth = 3.6; ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.setLineDash([2, 9]); ctx.lineDashOffset = -a0 * r.r; ctx.lineWidth = 3.6; ctx.strokeStyle = '#000'; ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
    // the hub: a sun with a face
    ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(a0);
    ctx.beginPath(); for (let i = 0; i < 24; i++) { const a = i / 24 * TAU, rr = i % 2 ? 15 : 24; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = '#000'; ctx.stroke();
    ctx.restore();
    ctx.beginPath(); ctx.arc(r.x, r.y, 13, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(r.x - 4.5, r.y - 2, 1.6, 0, TAU); ctx.arc(r.x + 4.5, r.y - 2, 1.6, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(r.x, r.y + 2, 5, .3, Math.PI - .3); ctx.lineWidth = 1.6; ctx.stroke();
  }
  if (r.k === 'swing') { const sl = r.slots[0]; ctx.beginPath(); ctx.moveTo(r.x, r.y + 20); ctx.lineTo(sl.x, sl.y - 16); ctx.lineWidth = 5; ctx.strokeStyle = '#000'; ctx.stroke(); ctx.lineWidth = 1.8; ctx.strokeStyle = '#fff'; ctx.stroke(); }
  if (r.k === 'float') r.slots.forEach(sl => {
    if (!sl.vis || sl.down) return;
    ctx.beginPath(); ctx.moveTo(sl.x, sl.y + 18); for (let i = 1; i <= 6; i++) ctx.lineTo(sl.x + Math.sin(PLAY.clock * 3 + i + sl.k) * 3, sl.y + 18 + i * 8);
    ctx.lineWidth = 3.4; ctx.strokeStyle = '#000'; ctx.stroke(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#fff'; ctx.stroke();
  });
}
function drawRigFront(r) {
  if (r.k === 'pop') {
    const x0 = r.xs[0] - 34, x1 = r.xs[r.xs.length - 1] + 34, y = r.y + 24;
    if (r.frame) r.slots.forEach(sl => { const x = r.xs[sl.k]; ctx.beginPath(); ctx.rect(x - 34, y, 68, 9); ctx.fillStyle = '#000'; ctx.fillRect(x - 31, y + 3, 68, 9); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 2.3; ctx.strokeStyle = '#000'; ctx.stroke(); });
    else { ctx.fillStyle = '#000'; ctx.fillRect(x0 + 4, y + 5, x1 - x0, 12); ctx.beginPath(); ctx.rect(x0, y, x1 - x0, 12); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 2.3; ctx.strokeStyle = '#000'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x0, y + 6); ctx.lineTo(x1, y + 6); ctx.lineWidth = .8; ctx.stroke(); }
  }
  if (r.k === 'rail' && r.water) {
    // water in front, lapping
    const y = r.y + 8, ph = PLAY.clock * 1.6;
    ctx.beginPath(); ctx.moveTo(-50, y + 40);
    for (let x = -50; x <= E.W + 50; x += 8) ctx.lineTo(x, y + Math.sin(x / 18 + ph) * 3 + Math.sin(x / 7 - ph * 1.7) * 1.2);
    ctx.lineTo(E.W + 50, y + 40); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.save(); ctx.clip(); ctx.beginPath(); for (let yy = y + 8; yy < y + 40; yy += 6) for (let x = -50 + (yy % 12); x < E.W + 50; x += 24) { ctx.moveTo(x, yy); ctx.quadraticCurveTo(x + 5, yy - 3, x + 10, yy); } ctx.lineWidth = 1.1; ctx.strokeStyle = '#000'; ctx.stroke(); ctx.restore();
    ctx.beginPath(); for (let x = -50; x <= E.W + 50; x += 8) { const yy = y + Math.sin(x / 18 + ph) * 3 + Math.sin(x / 7 - ph * 1.7) * 1.2; x === -50 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); } ctx.lineWidth = 2.3; ctx.strokeStyle = '#000'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-50, y + 40); ctx.lineTo(E.W + 50, y + 40); ctx.stroke();
  }
}
function drawTarget(sl) {
  const r = sl.rig, t = E.T[sl.type];
  if (r.k === 'fly' && sl.hide && !sl.down) return;
  if (!sl.vis && !sl.down && !(r.k === 'pop' && sl.up > 0) && !(t.fade && sl.x > -30 && sl.x < E.W + 30)) return;
  const age = R.t - sl.kt;
  let sy = 1, kind = 'front', rot = 0, dy = 0, alpha = t.fade ? Math.max(.08, sl.alpha) : 1;
  if (sl.down) {
    if (sl.type === 'balloon') return;
    if (r.k === 'fly') { if (age > 1.2) return; dy = 380 * age * age; rot = age * 5 * sl.face; alpha = 1 - age / 1.2; }
    else if (r.k === 'swing') kind = 'back';
    else if (age < .22) sy = Math.cos(age / .22 * Math.PI / 2);
    else { kind = 'back'; sy = .16 + (age < .4 ? Math.sin((age - .22) / .18 * Math.PI) * .08 : 0); }
    if (t.fade) alpha = 1;
  } else if (t.hp > 1 && sl.hp < t.hp) kind = 'dent';
  const born = R.t - sl.born, pop = sl.born > -2 && born < .25 && r.k !== 'rail' && r.k !== 'fly' ? .5 + .5 * Math.sin(born / .25 * Math.PI / 2) : 1;
  const sp = sprite(sl.type, kind), base = t.ry * .95;
  ctx.save(); ctx.globalAlpha = alpha;
  if (r.k === 'pop') { ctx.beginPath(); ctx.rect(sl.x - 40, r.y - 70, 80, 94); ctx.clip(); }
  ctx.translate(sl.x, sl.y + base + dy);
  if (rot) ctx.rotate(rot);
  if (r.k === 'swing') { ctx.translate(0, -base); ctx.rotate(-sl.th); ctx.translate(0, base); }
  if (sl.hit && R.t - sl.hit < .15) ctx.translate((Math.random() - .5) * 3, 0);
  ctx.scale((sl.face < 0 && (r.k === 'rail' || r.k === 'fly') ? -1 : 1) * pop, sy * pop);
  ctx.drawImage(sp.img, -sp.w / 2, -base - sp.h / 2, sp.w, sp.h);
  ctx.restore();
}

// ---------- the foreground: counter, rivals, your rifle ----------
// Everything here is drawn in screen pixels. u is one "foreground unit", so it all scales with the phone.
const fgU = () => Math.min(V.cw, V.ch * .62) / 390;
function drawRifle(x, y, ang, s, loaded, kick) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s); ctx.translate(-kick, 0);
  ctx.lineJoin = 'round'; ctx.lineWidth = 2.3 / s; ctx.strokeStyle = '#000';
  const body = () => { ctx.beginPath(); ctx.moveTo(-8, -8); ctx.lineTo(30, -5); ctx.lineTo(96, -3.5); ctx.lineTo(96, 3.5); ctx.lineTo(40, 5); ctx.lineTo(30, 9); ctx.lineTo(-8, 11); ctx.closePath(); };
  ctx.save(); ctx.translate(3 / s, 4 / s); body(); ctx.fillStyle = '#000'; ctx.fill(); ctx.restore();
  body(); ctx.fillStyle = '#fff'; ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.rect(-10, -12, 42, 26); ctx.clip(); body(); ctx.clip(); ctx.beginPath(); for (let k = -20; k < 40; k += 3.5) { ctx.moveTo(k, -12); ctx.lineTo(k + 18, 14); } ctx.lineWidth = .9 / s; ctx.stroke(); ctx.restore();
  body(); ctx.stroke();
  ctx.fillStyle = '#000'; [48, 70, 90].forEach(bx => ctx.fillRect(bx, -4, 3, 8));
  ctx.beginPath(); ctx.moveTo(38, 5); ctx.quadraticCurveTo(40, 14, 34, 16); ctx.stroke();
  if (loaded) { ctx.beginPath(); ctx.moveTo(96, -3); ctx.lineTo(103, -4); ctx.lineTo(103, 4); ctx.lineTo(96, 3); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke(); }
  ctx.restore();
}
// where your sights are right now, with the little wobble of holding a rifle up
function sightNow() { return [SIGHT.x + SIGHT.wx, SIGHT.y + SIGHT.wy]; }
// Your rivals aren't drawn: their corks fly in from the side of the screen they sit on.
function muzzleScreen(i) {
  if (i === 1) return yourRifle().muzzle;
  return [i === 0 ? -20 : V.cw + 20, V.ch * .62];
}
// Your rifle: a toy cork gun, built in 3D and seen from just behind and above it.
// x is right, y is down, z is forward from your eye, in metres-ish. The barrel runs straight along z,
// so it recedes toward your sights; both ring sights are centred on your eye line, so they frame the aim.
const GUN = {
  hb: .13, rb: .024,             // barrel: how far below your eye, and how thick
  zb: .7, zm: 2.05,             // barrel: from where it leaves the stock to the muzzle
  zs0: .3, zs1: .86,            // stock: near end (at your shoulder) and far end
  ys0: .23, ys1: .165,          // stock: height of its top at each end (it slopes up away from you)
  top: .02, side: .036, bev: .016, // stock: half-width of the flat top, half-width at the bevels, bevel depth
  zr: .67, rr: .021,            // rear ring sight: where, and how big
  zf: 1.9, rf: .018,
  ax: .034, ay0: .098, ay1: .16, az0: .6, az1: .76, // the tin action block the barrel comes out of            // front ring sight
};
function yourRifle() {
  const u = fgU(), [wx, wy] = sightNow(), [sx, sy] = screenXY(wx, wy);
  const f = Math.min(V.ch * 1.24, V.cw * 2.2), dz = -AIM[1].kick * .005; // the rifle jolts back toward you when it fires
  const pr = (x, y, z) => [sx + f * x / (z + dz), sy + f * y / (z + dz)];
  return { u, sx, sy, f, dz, pr, muzzle: pr(0, GUN.hb - GUN.rb * .4, GUN.zm + .04) };
}
function drawYourRifle() {
  const S = R.seats[1], g = yourRifle(), { pr, f, dz } = g, G = GUN, u = g.u;
  const Z = z => z + dz;
  const poly = pts => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); };
  const ink = (fill = '#fff', w = 2.4) => { ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = w; ctx.strokeStyle = '#000'; ctx.stroke(); };
  const hatch = (gap, lean, w = 1) => { ctx.save(); ctx.clip(); ctx.beginPath(); for (let x = -V.ch; x < V.cw + V.ch; x += gap) { ctx.moveTo(x, 0); ctx.lineTo(x + V.ch * lean, V.ch); } ctx.lineWidth = w; ctx.strokeStyle = '#000'; ctx.stroke(); ctx.restore(); };
  // a cylinder along z, seen from above: its outline between two cross-sections
  const tube = (y, r, z0, z1) => { const [cx, y0] = pr(0, y, z0), r0 = f * r / Z(z0), [, y1] = pr(0, y, z1), r1 = f * r / Z(z1);
    ctx.beginPath(); ctx.moveTo(cx - r0, y0); ctx.lineTo(cx - r1, y1); ctx.arc(cx, y1, r1, Math.PI, 0); ctx.lineTo(cx + r0, y0); ctx.arc(cx, y0, r0, 0, Math.PI); ctx.closePath(); };
  const seam = (y, r, z, w = 2) => { const [cx, yy] = pr(0, y, z), rr = f * r / Z(z); ctx.beginPath(); ctx.arc(cx, yy, rr, Math.PI, 0); ctx.lineWidth = w; ctx.strokeStyle = '#000'; ctx.stroke(); };
  // a circle lying flat on a surface (a screw head), projected
  const flat = (x, y, z, r) => { ctx.beginPath(); for (let i = 0; i <= 16; i++) { const a = i / 16 * TAU, p = pr(x + Math.cos(a) * r, y, z + Math.sin(a) * r); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); } ctx.closePath(); };
  // a ring sight standing on a post, facing you
  const ringSight = (z, r, band, baseY, postW) => {
    const [cx, cy] = pr(0, 0, z), R = f * r / Z(z), bw = Math.max(3, f * band / Z(z));
    const [px0, py0] = pr(-postW, r, z), [px1, py1] = pr(postW, baseY, z);
    ctx.beginPath(); ctx.rect(px0, py0, px1 - px0, py1 - py0); ink('#000', 1.4);
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.lineWidth = bw + 4.4; ctx.strokeStyle = '#000'; ctx.stroke(); ctx.lineWidth = bw; ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, R + bw / 2, Math.PI * .8, Math.PI * 1.35); ctx.lineWidth = 1.6; ctx.strokeStyle = '#000'; ctx.stroke(); // a little shading on the ring
  };
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const loaded = S.ammo > 0 && S.reloadT <= 0;

  // --- first the stock: a chunky bevelled block of wood under the barrel, sloping down toward your shoulder
  const T = (x, t) => { const z = G.zs0 + (G.zs1 - G.zs0) * t, y = G.ys0 + (G.ys1 - G.ys0) * t; return [x, y, z]; };
  const P = ([x, y, z], dy = 0) => pr(x, y + dy, z);
  const nl = T(-G.top, 0), nr = T(G.top, 0), fl = T(-G.top, 1), fr = T(G.top, 1);
  const nL = T(-G.side, 0), nR = T(G.side, 0), fL = T(-G.side, 1), fR = T(G.side, 1);
  // shadow
  ctx.save(); ctx.translate(6 * u, 7 * u); poly([P(nL, G.bev), P(fL, G.bev), P(fl), P(fr), P(fR, G.bev), P(nR, G.bev), P(nR, .6), P(nL, .6)]); ctx.fillStyle = '#000'; ctx.fill(); ctx.restore();
  // the end facing you (your shoulder end), mostly below the screen
  poly([P(nl), P(nr), P(nR, G.bev), P(nR, .6), P(nL, .6), P(nL, G.bev)]); ink();
  { const a = P(nL, G.bev + .03), b = P(nR, G.bev + .03), c = P(nR, .6), d = P(nL, .6); poly([a, b, c, d]); ink('#000'); } // a rubber butt pad
  // the two bevels: the left one in shadow
  poly([P(nl), P(fl), P(fL, G.bev), P(nL, G.bev)]); ink(); poly([P(nl), P(fl), P(fL, G.bev), P(nL, G.bev)]); hatch(3, .5, 1.1);
  poly([P(nl), P(fl), P(fL, G.bev), P(nL, G.bev)]); ctx.lineWidth = 2.4; ctx.stroke();
  poly([P(nr), P(fr), P(fR, G.bev), P(nR, G.bev)]); ink(); poly([P(nr), P(fr), P(fR, G.bev), P(nR, G.bev)]); hatch(7, .5, .9);
  poly([P(nr), P(fr), P(fR, G.bev), P(nR, G.bev)]); ctx.lineWidth = 2.4; ctx.stroke();
  // the flat top, with wood grain running away from you
  poly([P(nl), P(nr), P(fr), P(fl)]); ink();
  ctx.beginPath(); [-.016, -.005, .009, .019].forEach((x, i) => { for (let k = 0; k <= 10; k++) { const t = k / 10, p = P(T(x + Math.sin(t * 5 + i) * .002, t)); k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); } }); ctx.lineWidth = 1; ctx.strokeStyle = '#000'; ctx.stroke();
  // the far end of the stock, where the barrel goes in: a tin collar
  { const a = P(fl), b = P(fr), c = P(fR, G.bev), d = P(fL, G.bev); ctx.beginPath(); ctx.moveTo(d[0], d[1]); ctx.lineTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineWidth = 3.4; ctx.strokeStyle = '#000'; ctx.stroke(); }
  // screws
  [[-.017, .32], [.017, .32], [0, .78]].forEach(([x, t]) => { const [px, py, pz] = T(x, t); flat(px, py, pz, .0065); ink('#fff', 1.6); const a = pr(px - .005, py, pz), b = pr(px + .005, py, pz); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineWidth = 1.4; ctx.stroke(); });
  // --- then the barrel resting on it: the cork sticking out of the muzzle, the barrel, the front sight, the cork's string
  if (loaded) { tube(G.hb, G.rb * 1.15, G.zm - .01, G.zm + .05); ink(); tube(G.hb, G.rb * 1.15, G.zm - .01, G.zm + .05); ctx.save(); ctx.clip(); for (let i = 0; i < 7; i++) { const p = pr((i % 3 - 1) * .012, G.hb - G.rb * (.3 + (i % 2) * .5), G.zm + .005 + i * .006); ctx.beginPath(); ctx.arc(p[0], p[1], 1.2, 0, TAU); ctx.fillStyle = '#000'; ctx.fill(); } ctx.restore(); }
  // the barrel: candy stripes that get shorter as they go away from you
  tube(G.hb, G.rb, G.zb, G.zm); ctx.save(); ctx.translate(4 * u, 5 * u); ctx.fillStyle = '#000'; ctx.fill(); ctx.restore();
  tube(G.hb, G.rb, G.zb, G.zm); ink();
  const bands = 9;
  for (let i = 0; i < bands; i++) {
    const z0 = G.zb + (G.zm - G.zb) * i / bands, z1 = G.zb + (G.zm - G.zb) * (i + 1) / bands;
    if (i % 2) { tube(G.hb, G.rb, z0, z1); hatch(3.2, -.6, 1.1); }
    seam(G.hb, G.rb, z0, 1.6);
  }
  // a shine along the top of the barrel, and the shadow side
  { const a = pr(-.006, G.hb - G.rb * .96, G.zb), b = pr(-.004, G.hb - G.rb * .96, G.zm); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineWidth = 3 * u; ctx.strokeStyle = '#fff'; ctx.stroke(); }
  tube(G.hb, G.rb, G.zb, G.zm); ctx.lineWidth = 2.6; ctx.strokeStyle = '#000'; ctx.stroke();
  // the muzzle rim
  { const [cx, cy] = pr(0, G.hb, G.zm), R = f * G.rb * 1.2 / Z(G.zm); ctx.beginPath(); ctx.arc(cx, cy, R, Math.PI, 0); ctx.lineWidth = 4; ctx.strokeStyle = '#000'; ctx.stroke(); }
  ringSight(G.zf, G.rf, .006, G.hb - G.rb, .003);
  // the cork's string, sagging from the muzzle back to a screw on the stock
  if (loaded) { ctx.beginPath(); for (let i = 0; i <= 12; i++) { const t = i / 12, z = G.zm - t * (G.zm - .62), sag = Math.sin(t * Math.PI) * .05, p = pr(.03 * t + .004, G.hb + G.rb * .6 + sag - t * .005, z); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); } ctx.lineWidth = 1.5; ctx.strokeStyle = '#000'; ctx.stroke(); }

  // --- the tin action block the barrel comes out of, sitting on the stock
  { const A = (x, y, z) => pr(x, y, z);
    const tl0 = A(-G.ax, G.ay0, G.az0), tr0 = A(G.ax, G.ay0, G.az0), tl1 = A(-G.ax, G.ay0, G.az1), tr1 = A(G.ax, G.ay0, G.az1);
    const bl0 = A(-G.ax, G.ay1, G.az0), br0 = A(G.ax, G.ay1, G.az0);
    ctx.save(); ctx.translate(5 * u, 6 * u); poly([tl1, tr1, tr0, br0, bl0, tl0]); ctx.fillStyle = '#000'; ctx.fill(); ctx.restore();
    poly([tl0, tr0, br0, bl0]); ink(); poly([tl0, tr0, br0, bl0]); hatch(3.4, -.5, 1.1); poly([tl0, tr0, br0, bl0]); ctx.lineWidth = 2.6; ctx.stroke(); // the end facing you, in shadow
    poly([tl0, tr0, tr1, tl1]); ink();                                                                                                        // the top
    // a groove down the middle of the top, and rivets at the corners
    { const a = A(0, G.ay0, G.az0), b = A(0, G.ay0, G.az1); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineWidth = 1.2; ctx.stroke(); }
    [[-1, .63], [1, .63], [-1, .73], [1, .73]].forEach(([sd, z]) => { flat(sd * (G.ax - .009), G.ay0, z, .005); ink('#000', 1); });
    // the cocking knob sticking out on the right
    { const k = A(G.ax + .012, G.ay0 + .02, G.az0 + .05), r = f * .012 / Z(G.az0 + .05); ctx.beginPath(); ctx.arc(k[0], k[1], r, 0, TAU); ink(); ctx.beginPath(); ctx.arc(k[0] - r * .3, k[1] - r * .3, r * .35, 0, TAU); ctx.fillStyle = '#000'; ctx.fill(); } }
  // the rear ring sight, nearest to your eye, standing on the action block
  ringSight(G.zr, G.rr, .0045, G.ay0, .0028);
  // while reloading, a ring fills around the rear sight
  if (S.reloadT > 0) { const [cx, cy] = pr(0, 0, G.zr), R0 = f * G.rr / Z(G.zr) + 12 * u; ctx.beginPath(); ctx.arc(cx, cy, R0, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - S.reloadT / (S.reloadFull || 1))); ctx.lineWidth = 4 * u; ctx.strokeStyle = '#000'; ctx.stroke(); }
}

function drawCounterFg() {
  const u = fgU(), y = V.ch * COUNTER, shift = -(CAM.x - E.W / 2) * V.k * .35, w = 38 * u;
  ctx.fillStyle = '#000'; ctx.fillRect(0, y - 6 * u, V.cw, 10 * u);
  ctx.beginPath(); ctx.rect(-4, y + 18 * u, V.cw + 8, V.ch); ctx.fillStyle = '#fff'; ctx.fill();
  ctx.save(); ctx.clip(); ctx.beginPath();
  for (let x = ((shift % w) + w) % w - w; x < V.cw + w; x += w) { ctx.moveTo(x, y + 18 * u); ctx.lineTo(x + (x - V.cw / 2) * .25, V.ch); }
  ctx.lineWidth = 2; ctx.strokeStyle = '#000'; ctx.stroke();
  ctx.globalAlpha = .45; ctx.beginPath(); for (let x = -V.ch; x < V.cw; x += 6 * u) { ctx.moveTo(x, y + 18 * u); ctx.lineTo(x + 140 * u, V.ch); } ctx.lineWidth = .8; ctx.stroke();
  ctx.restore();
  ctx.beginPath(); ctx.rect(-4, y, V.cw + 8, 18 * u); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#000'; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, y + 29 * u); ctx.lineTo(V.cw, y + 29 * u); ctx.setLineDash([8 * u, 6 * u]); ctx.lineDashOffset = -shift; ctx.lineWidth = 1.6; ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
}
// cork lines are drawn in screen space, from each rifle's muzzle to where the cork landed
function drawShotLines() {
  for (const f of FX) {
    if (f.k !== 'line') continue;
    const u = f.t / f.life, [x0, y0] = muzzleScreen(f.seat), [x1, y1] = screenXY(f.x1, f.y1);
    ctx.save(); ctx.globalAlpha = 1 - u; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
    ctx.setLineDash(f.seat === 1 ? [] : [5, 6]); ctx.lineWidth = f.seat === 1 ? 2.6 : 2; ctx.strokeStyle = '#000'; ctx.stroke();
    ctx.beginPath(); ctx.arc(x0, y0, (6 + u * 10) * fgU(), 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); ctx.setLineDash([]); ctx.lineWidth = 1.8; ctx.stroke();
    ctx.restore();
  }
}

// ---------- effects ----------
function fx(o) { o.t = 0; FX.push(o); return o; }
function burst(x, y, n, kind = 'bit') {
  for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = 60 + Math.random() * 140; fx({ k: kind, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, rot: Math.random() * 6, vr: (Math.random() - .5) * 20, life: .5 + Math.random() * .4, s: 2 + Math.random() * 3 }); }
}
function floatText(x, y, text, style = 'solid', life = .95) { fx({ k: 'float', x, y, text, style, life }); }
function drawFx(dt) {
  FX = FX.filter(f => (f.t += dt) < f.life);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const f of FX) {
    const u = f.t / f.life;
    ctx.save();
    if (f.k === 'line') { /* drawn in the foreground, see drawShotLines */ }
    else if (f.k === 'puff') { const r = f.r * (.5 + u); ctx.globalAlpha = 1 - u; ctx.beginPath(); ctx.arc(f.x, f.y - u * 10, r, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 1.8; ctx.strokeStyle = '#000'; ctx.stroke(); }
    else if (f.k === 'ring') { ctx.globalAlpha = 1 - u; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (.3 + u * .9), 0, TAU); ctx.lineWidth = 6 * (1 - u) + 1; ctx.strokeStyle = '#000'; ctx.setLineDash(f.dash ? [5, 6] : []); ctx.stroke();
      if (!f.dash) for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, r0 = f.r * (.4 + u), r1 = r0 + 12 * (1 - u); ctx.beginPath(); ctx.moveTo(f.x + Math.cos(a) * r0, f.y + Math.sin(a) * r0); ctx.lineTo(f.x + Math.cos(a) * r1, f.y + Math.sin(a) * r1); ctx.lineWidth = 2.4; ctx.stroke(); } }
    else if (f.k === 'zig') { ctx.globalAlpha = 1 - u; ctx.beginPath(); ctx.moveTo(f.x0, f.y0); const mx = (f.x0 + f.x1) / 2, my = (f.y0 + f.y1) / 2 - 18; ctx.quadraticCurveTo(mx, my, f.x1, f.y1); ctx.setLineDash([6, 4]); ctx.lineWidth = 2.4; ctx.strokeStyle = '#000'; ctx.stroke(); ctx.setLineDash([]); ctx.beginPath(); ctx.arc(f.x1, f.y1, 4, 0, TAU); ctx.fillStyle = '#000'; ctx.fill(); }
    else if (f.k === 'skewer') { ctx.globalAlpha = 1 - u; ctx.beginPath(); ctx.moveTo(f.x, 40); ctx.lineTo(f.x, E.GH); ctx.lineWidth = 7 * (1 - u) + 1; ctx.strokeStyle = '#000'; ctx.stroke(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.setLineDash([3, 6]); ctx.stroke(); }
    else if (f.k === 'bit') { f.vy += 500 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.rot += f.vr * dt; ctx.globalAlpha = 1 - u * u; ctx.translate(f.x, f.y); ctx.rotate(f.rot); ctx.fillStyle = '#000'; ctx.fillRect(-f.s, -f.s * .4, f.s * 2, f.s * .8); }
    else if (f.k === 'shred') { f.vy += 300 * dt; f.x += f.vx * dt * .6; f.y += f.vy * dt * .6; f.rot += f.vr * dt; ctx.globalAlpha = 1 - u; ctx.translate(f.x, f.y); ctx.rotate(f.rot); ctx.beginPath(); ctx.moveTo(-f.s, 0); ctx.quadraticCurveTo(0, -f.s, f.s, 0); ctx.lineWidth = 1.8; ctx.strokeStyle = '#000'; ctx.stroke(); }
    else if (f.k === 'star') { f.vy += 200 * dt; f.x += f.vx * dt * .7; f.y += f.vy * dt * .7; ctx.globalAlpha = 1 - u; ctx.translate(f.x, f.y); ctx.rotate(f.rot + u * 4); starPath(ctx, 0, 0, f.s * 1.8, f.s * .8); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = '#000'; ctx.stroke(); }
    ctx.restore();
  }
}
// numbers and words, drawn at screen size so they stay crisp and readable
function drawFloats() {
  ctx.setTransform(V.D, 0, 0, V.D, 0, 0);
  for (const f of FX) {
    if (f.k !== 'float') continue;
    const u = f.t / f.life, [sx, sy0] = screenXY(f.x, f.y), sy = sy0 - 10 - u * 34, sc = u < .2 ? .6 + u * 3 : 1;
    const big = f.style === 'big';
    ctx.save(); ctx.globalAlpha = u > .75 ? 1 - (u - .75) / .25 : 1; ctx.translate(sx, sy); ctx.scale(sc, sc);
    ctx.font = big ? 'italic 900 34px Fraunces, Georgia, serif' : '800 14px Figtree, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(f.text).width + (big ? 0 : 18);
    if (big) { ctx.lineWidth = 6; ctx.strokeStyle = '#fff'; ctx.strokeText(f.text, 0, 0); ctx.fillStyle = '#000'; ctx.fillText(f.text, 0, 0); }
    else {
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-w / 2, -12, w, 24, 12) : ctx.rect(-w / 2, -12, w, 24);
      ctx.fillStyle = f.style === 'solid' ? '#000' : '#fff'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#000'; ctx.stroke();
      ctx.fillStyle = f.style === 'solid' ? '#fff' : '#000'; ctx.fillText(f.text, 0, 1);
    }
    ctx.restore();
  }
}
function drawHoles(dt) {
  HOLES = HOLES.filter(h => (h.t += dt) < 2.5);
  for (const h of HOLES) {
    ctx.globalAlpha = h.t > 1.8 ? 1 - (h.t - 1.8) / .7 : 1;
    ctx.beginPath(); ctx.arc(h.x, h.y, 3.2, 0, TAU); ctx.fillStyle = '#000'; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.beginPath(); for (let i = 0; i < 4; i++) { const a = h.a + i * 1.6; ctx.moveTo(h.x + Math.cos(a) * 4, h.y + Math.sin(a) * 4); ctx.lineTo(h.x + Math.cos(a) * 8, h.y + Math.sin(a) * 8); } ctx.lineWidth = 1.1; ctx.strokeStyle = '#000'; ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
function drawBlots() {
  const S = R.seats[1]; if (S.sootT <= 0) { BLOTS.length = 0; return; }
  ctx.globalAlpha = Math.min(1, S.sootT / .8);
  const u = fgU();
  for (const b of BLOTS) {
    const x = b.x * V.cw, y = b.y * V.ch * COUNTER, r = b.r * u;
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    for (let i = 0; i < 9; i++) { const a = b.a + i * .7, d = r * (.8 + (i % 3) * .25); ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r * (.18 + (i % 2) * .12), 0, TAU); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
}

// ---------- drawing a frame ----------
function draw(dt = 0) {
  if (!R) return;
  drawWall();
  world();
  drawHoles(dt);
  for (const r of R.rigs) { drawRigBack(r); for (const sl of r.slots) drawTarget(sl); drawRigFront(r); }
  drawPoles(); drawAwning();
  drawFx(dt);
  // the foreground, in screen pixels
  ctx.setTransform(V.D, 0, 0, V.D, 0, 0);
  drawCounterFg(); drawShotLines(); drawYourRifle(); drawBlots();
  drawFloats();
}

// ---------- what the rules report ----------
function onEvents() {
  const you = R.seats[1];
  for (const e of R.ev) {
    const seat = e.seat, mine = seat === 1;
    switch (e.k) {
      case 'shot': {
        AIM[seat].x = e.x; AIM[seat].y = e.y; AIM[seat].kick = 9;
        fx({ k: 'line', x1: e.x, y1: e.y, seat, life: .16 });
        fx({ k: 'puff', x: e.x, y: e.y, r: 5, life: .25 });
        sfx('pop', seat);
        break; }
      case 'hit': {
        const t = E.T[e.type];
        const txt = (e.pts > 0 ? '+' : '−') + Math.abs(e.pts);
        floatText(e.x, e.y - t.ry, seat === 0 ? '◂ ' + txt : seat === 2 ? txt + ' ▸' : txt, mine ? 'solid' : 'ghost');
        if (e.type === 'balloon') { sfx('balloon', seat); burst(e.x, e.y, 8, 'shred'); }
        else if (e.type === 'bell') { sfx('bell', seat); fx({ k: 'ring', x: e.x, y: e.y, r: 34, life: .6, dash: true }); }
        else if (t.bad) { sfx('bad', seat); if (mine) { nope($('pl1')); SHAKE = 4; } }
        else { sfx(e.type === 'knight' ? 'clank' : 'tin', seat); burst(e.x, e.y, mine ? 6 : 3); }
        if (t.gold || e.pts >= 60) for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; fx({ k: 'star', x: e.x, y: e.y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120 - 60, rot: a, s: 3, life: .8 }); }
        if (mine) squash($('pl1'));
        break; }
      case 'dent': sfx('clank', seat); floatText(e.x, e.y - 22, mine ? '+5 dent' : 'dent', mine ? 'solid' : 'ghost'); burst(e.x, e.y, 4); break;
      case 'miss': HOLES.push({ x: e.x, y: e.y, t: 0, a: Math.random() * 6 }); sfx('miss', seat); break;
      case 'pellet': fx({ k: 'puff', x: e.x, y: e.y, r: 4, life: .25 }); break;
      case 'boom': sfx('boom', seat); fx({ k: 'ring', x: e.x, y: e.y, r: 70, life: .5 }); burst(e.x, e.y, 16); SHAKE = 7; break;
      case 'skewer': fx({ k: 'skewer', x: e.x, life: .4 }); sfx('clank', seat); break;
      case 'ric': fx({ k: 'zig', x0: e.x, y0: e.y, x1: e.tx, y1: e.ty, life: .45 }); tone(2400, .08, 'triangle', .06, 3600, SEAT_PAN[seat]); break;
      case 'pull': fx({ k: 'zig', x0: e.x, y0: e.y, x1: e.tx, y1: e.ty, life: .4 }); break;
      case 'jam': sfx('jam'); banner(mine ? 'Jammed!' : `${R.seats[seat].short} jammed it`, 'Everything stands still for 3 seconds', 1200, true); break;
      case 'soot':
        sfx('soot', seat);
        if (mine) banner('Soot bomb!', 'Your rivals can barely see', 1100, true);
        else { banner(`${R.seats[seat].short} sooted you!`, 'Shoot through it', 1100, true); sootMe(); }
        break;
      case 'gift':
        if (mine) { sfx('gift'); floatText(e.x, e.y - 40, E.SHELLS[e.shell].name + '!', 'solid', 1.3); tipOnce('shell', `You won a <b>${E.SHELLS[e.shell].name}</b> shell. Tap it in your belt to load it into your next shot.`); }
        else floatText(e.x, e.y - 40, 'Shell', 'ghost');
        break;
      case 'full': if (mine) floatText(e.x, e.y - 40, 'Belt full', 'ghost'); break;
      case 'combo': if (mine) { sfx('combo', 1, e.mult); floatText(E.W / 2, 150, 'x' + e.mult + '!', 'big', 1); } break;
      case 'drop': if (mine) sfx('drop'); break;
      case 'reload': sfx('reload', seat); break;
      case 'loaded': if (mine) sfx('loaded'); break;
      case 'time': sfx('time'); floatText(e.x, e.y - 40, '+' + e.secs + ' seconds', mine ? 'solid' : 'ghost', 1.2); break;
      case 'go': sfx('go'); banner('Fire!', '', 650); break;
      case 'lastcall': sfx('lastcall'); musicTempo(200); banner('Last call!', 'Everything speeds up', 1100, true); $('play').classList.add('late'); break;
      case 'end': sfx('end'); banner('Time!', '', 1200); endAt = PLAY.clock + 1.5; break;
    }
  }
  R.ev.length = 0;
}
function sootMe() {
  BLOTS = [];
  for (let i = 0; i < 4; i++) BLOTS.push({ x: .12 + Math.random() * .76, y: .1 + Math.random() * .8, r: 22 + Math.random() * 20, a: Math.random() * 6 });
}

// ---------- the scoreboard, clock, corks and shells ----------
function buildHud() {
  $('scores').innerHTML = R.seats.map((S, i) => `
    <div class="plq${i === 1 ? ' you' : ''}" id="pl${i}">
      ${i === 1 ? '' : faceImg(S.hat || 'none', 'pf')}
      <div class="pn"><b>${esc(S.short)}</b><span class="pts" id="ps${i}">0</span></div>
      ${i === 1 ? '<span class="mul" id="mul">x1</span>' : `<i class="side">${i === 0 ? '◂' : '▸'}</i>`}
      <span class="ldr">${icon("crown")}</span>
    </div>`).join('');
  HUD.key = '';
  hud(true);
}
const HUD = { key: '', shells: '' };
function hud(force) {
  const S = R.seats[1], lead = Math.max(...R.seats.map(s => s.score));
  const key = R.seats.map(s => s.score).join() + '|' + E.multOf(S);
  if (force || key !== HUD.key) {
    HUD.key = key;
    R.seats.forEach((s, i) => { $('ps' + i).textContent = s.score; $('pl' + i).classList.toggle('lead', s.score === lead && lead > 0); });
    const m = E.multOf(S); $('mul').textContent = 'x' + m; $('mul').classList.toggle('hot', m > 1);
  }
  const secs = Math.max(0, Math.ceil(R.phase === 'count' ? E.ROUND : R.left));
  $('secs').textContent = secs;
  $('fuseBar').style.transform = `scaleX(${Math.min(1, Math.max(0, R.left / E.ROUND))})`;
  $('fuse').classList.toggle('late', R.lastCall);
  // corks in the tube
  const reloading = S.reloadT > 0;
  let ck = '';
  for (let i = 0; i < S.mag; i++) ck += `<i class="${i < S.ammo ? 'on' : ''}"></i>`;
  if ($('corks').dataset.k !== S.ammo + '/' + S.mag + reloading) { $('corks').innerHTML = ck; $('corks').dataset.k = S.ammo + '/' + S.mag + reloading; }
  $('tube').classList.toggle('reloading', reloading);
  $('tubeFill').style.transform = `scaleX(${reloading ? 1 - S.reloadT / (S.reloadFull || 1) : 0})`;
  $('tubeLbl').textContent = reloading ? 'Reloading' : 'Reload';
  $('fire').classList.toggle('empty', reloading);
  // shells
  const sk = S.shells.join() + '|' + S.load + '|' + E.beltSize(S);
  if (force || sk !== HUD.shells) {
    HUD.shells = sk;
    let h = '';
    for (let i = 0; i < E.beltSize(S); i++) {
      const id = S.shells[i];
      h += id ? `<button class="shell${S.load === id && S.shells.indexOf(id) === i ? ' on' : ''}" data-s="${id}" type="button" aria-label="${E.SHELLS[id].name}">${icon(id)}<small>${E.SHELLS[id].name}</small></button>` : '<span class="shell empty"></span>';
    }
    $('shells').innerHTML = h;
    $('loadNote').innerHTML = S.load ? `<b>${E.SHELLS[S.load].name} loaded.</b> ${E.SHELLS[S.load].text}` : '';
    $('loadNote').classList.toggle('on', !!S.load);
  }
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- input ----------
// Touch: drag a thumb anywhere on the screen (not on a button) to move your sights, like a mouse. Nothing fires until you press Pow!.
// Two thumbs work at once: one dragging, one on the button. Mouse: move to aim, click to fire. Keyboard: arrows, space or enter.
const clampSight = () => { SIGHT.x = Math.max(4, Math.min(E.W - 4, SIGHT.x)); SIGHT.y = Math.max(30, Math.min(E.GH - 4, SIGHT.y)); };
function pull() {
  if (!R || paused || R.phase !== 'go') return;
  const S = R.seats[1];
  if (S.reloadT > 0) { sfx('empty'); nope($('tube')); return; }
  const [x, y] = sightNow();
  E.shoot(R, 1, x, y);
  hideTip();
}
const PLAYEL = $('play');
PLAYEL.addEventListener('pointerdown', e => {
  audioInit();
  if (!R || paused || e.target.closest('button')) return;
  if (e.pointerType === 'mouse') { if (e.button === 0 && e.target === cv) pull(); return; }
  if (SIGHT.drag) return;
  try { PLAYEL.setPointerCapture(e.pointerId); } catch (_) {}
  SIGHT.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp };
});
// The sights move the instant your thumb does, like a mouse, and stop the instant it stops.
// Pointer acceleration: slow moves are 1 to 1 for fine aim, a quick flick carries the sights up to THUMB.MAX times further.
function thumbMove(x, y, t) {
  const d = SIGHT.drag, dx = x - d.x, dy = y - d.y, ms = Math.max(1, t - d.t);
  const speed = Math.hypot(dx, dy) / ms; // px per millisecond
  const gain = Math.min(THUMB.MAX, THUMB.BASE + THUMB.ACCEL * Math.max(0, speed - THUMB.SLOW));
  SIGHT.x += dx * gain / V.k; SIGHT.y += dy * gain / V.k; clampSight();
  d.x = x; d.y = y; d.t = t;
}
// pointerrawupdate arrives as soon as the finger moves, without waiting for the next frame, where the browser has it
PLAYEL.addEventListener('onpointerrawupdate' in window ? 'pointerrawupdate' : 'pointermove', e => {
  if (!R || paused) return;
  if (e.pointerType === 'mouse') { if (e.target === cv) { SIGHT.x += (e.movementX || 0) / V.k; SIGHT.y += (e.movementY || 0) / V.k; clampSight(); } return; }
  const d = SIGHT.drag; if (!d || d.id !== e.pointerId) return;
  const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
  (evs.length ? evs : [e]).forEach(c => thumbMove(c.clientX, c.clientY, c.timeStamp));
});
const letGo = e => { const d = SIGHT.drag; if (d && d.id === e.pointerId) SIGHT.drag = null; };
PLAYEL.addEventListener('pointerup', letGo);
PLAYEL.addEventListener('pointercancel', letGo);
// the fire button fires the moment it's pressed, not on release, so it feels like a trigger
const FIRE = $('fire');
FIRE.addEventListener('pointerdown', e => { e.preventDefault(); audioInit(); FIRE.classList.add('down'); pull(); });
['pointerup', 'pointercancel', 'pointerleave'].forEach(t => FIRE.addEventListener(t, () => FIRE.classList.remove('down')));
FIRE.addEventListener('click', e => { if (e.detail === 0) pull(); }); // a keyboard press on the focused button
addEventListener('keyup', e => { SIGHT.keys[e.key] = false; });
$('tube').onclick = () => { if (R && !paused && E.reload(R, 1)) squash($('tube')); };
$('shells').onclick = e => {
  const b = e.target.closest('.shell[data-s]'); if (!b || !R || paused) return;
  const got = E.loadShell(R, 1, b.dataset.s); sfx(got ? 'loaded' : 'tick'); hud(true); squash(b);
};
addEventListener('keydown', e => {
  if (!R || !$('play').classList.contains('on')) return;
  if (e.key === 'Escape' || e.key === 'p') { paused ? resumeRound() : pauseRound(); return; }
  if (paused) return;
  if (e.key.startsWith('Arrow')) { SIGHT.keys[e.key] = true; e.preventDefault(); }
  if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { pull(); e.preventDefault(); }
  if (e.key === 'r') E.reload(R, 1);
  const n = parseInt(e.key, 10); if (n >= 1 && n <= 6 && R.seats[1].shells[n - 1]) { E.loadShell(R, 1, R.seats[1].shells[n - 1]); hud(true); }
});
$('pause').onclick = () => pauseRound();
document.addEventListener('visibilitychange', () => { if (document.hidden && R && R.phase !== 'done' && $('play').classList.contains('on')) pauseRound(); });

// ---------- running a round ----------
// o: { booth, seed, seats, onEnd(R, results), quitLabel, onQuit, restart }
function startRound(o) {
  cancelAnimationFrame(raf);
  PLAY = Object.assign({ clock: 0, beeps: 0 }, o);
  R = E.newRound({ booth: o.booth, seed: o.seed, seats: o.seats });
  FX = []; HOLES = []; BLOTS = []; SHAKE = 0; endAt = 0; paused = false;
  AIM.forEach((a, i) => { a.x = [110, 200, 290][i]; a.y = 300; a.kick = 0; });
  SIGHT.x = 200; SIGHT.y = 280; SIGHT.drag = null; SIGHT.keys = {}; CAM.x = 200; CAM.y = 280;
  $('play').classList.remove('late');
  show('play');
  requestAnimationFrame(() => { resize(); buildHud(); draw(); });
  musicTempo(150); musicStart();
  lastT = performance.now();
  // the first time, a word from the barker before the round starts
  if (!save.tips.firstRound) {
    paused = true;
    sheet(`<h2>Step right up</h2>
      <div class="how">
        <p><b>Drag a thumb anywhere to aim.</b> Your sights follow it like a mouse. Move slowly for fine aim, flick to swing across the booth.</p>
        <p><b>Press Pow! to fire.</b> Reload is right beside it, or it reloads by itself when you run out.</p>
        <p>Knock down more than the rivals either side of you before the clock runs out.</p>
        <p>They shoot the same targets as you. If they get there first, it’s theirs.</p>
        <p><b>Hit 3 in a row</b> and your points double. 6 in a row triples them. A miss starts you over.</p>
        <p><b>Black targets cost points.</b> Leave them be.</p>
      </div>
      <button class="btn" id="goBtn" type="button">Ready</button>`, false);
    $('goBtn').onclick = () => { save.tips.firstRound = 1; writeSave(); closeSheet(); paused = false; lastT = performance.now(); };
  }
  raf = requestAnimationFrame(loop);
}
function loop(now) {
  raf = requestAnimationFrame(loop);
  let dt = Math.min(.05, (now - lastT) / 1000); lastT = now;
  if (paused) dt = 0;
  if (dt) {
    PLAY.clock += dt;
    E.step(R, dt);
    // Ready… Aim… (Fire! comes from the rules)
    if (R.phase === 'count') {
      if (PLAY.beeps === 0) { PLAY.beeps = 1; sfx('beep'); banner('Ready…', R.B.name, 1100); }
      else if (PLAY.beeps === 1 && R.t >= -1.4) { PLAY.beeps = 2; sfx('beep'); banner('Aim…', '', 1000); }
    }
    onEvents();
    for (const a of AIM) a.kick *= Math.pow(.0005, dt);
    // arrow keys move the sights; the sights wobble a little as you hold the rifle up; the camera follows
    const k = SIGHT.keys, sp = 260 * dt;
    SIGHT.x += ((k.ArrowRight ? 1 : 0) - (k.ArrowLeft ? 1 : 0)) * sp; SIGHT.y += ((k.ArrowDown ? 1 : 0) - (k.ArrowUp ? 1 : 0)) * sp; clampSight();
    SIGHT.wx = SIGHT.wy = 0; // no wobble: the sights sit exactly where you put them
    camera(1); // the view stays locked on your sights
    SHAKE = SHAKE > .3 ? SHAKE * Math.pow(.001, dt) : 0;
    if (R.freeze > 0) SHAKE = Math.max(SHAKE, .8);
    hud();
    if (endAt && PLAY.clock >= endAt) { endAt = 0; finishRound(); return; }
  }
  draw(dt);
}
function finishRound() {
  cancelAnimationFrame(raf); musicStop();
  const res = E.results(R);
  sfx(res.won ? 'win' : 'lose');
  PLAY.onEnd(R, res);
}
function pauseRound() {
  if (paused || !R || R.phase === 'done') return;
  paused = true; musicStop();
  sheet(`<h2>Paused</h2>
    <p>${esc(R.B.name)}. ${Math.ceil(R.left)} seconds left.</p>
    <button class="btn" id="resumeBtn" type="button">Carry on</button>
    ${PLAY.restart ? '<button class="btn ghost" id="restartBtn" type="button">Start the round again</button>' : ''}
    <button class="btn ghost" id="quitBtn" type="button">${PLAY.quitLabel || 'Leave the booth'}</button>
    <div class="toggles">${soundToggles()}</div>`, false);
  $('resumeBtn').onclick = resumeRound;
  if (PLAY.restart) $('restartBtn').onclick = () => { closeSheet(); PLAY.restart(); };
  $('quitBtn').onclick = () => { closeSheet(); cancelAnimationFrame(raf); R = null; PLAY.onQuit(); };
  wireToggles();
}
function resumeRound() { closeSheet(); paused = false; lastT = performance.now(); musicStart(); }
