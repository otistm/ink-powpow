/* =====================================================================
   The booth: drawing the gallery, the rivals and rifles at the counter,
   tapping to shoot, the effects, the scoreboard and the shell belt.
   startRound() runs a round; the rules themselves are in gallery.js.
   ===================================================================== */
"use strict";
let R = null, PLAY = null, paused = false, raf = 0, lastT = 0, endAt = 0;
const cv = $('cv'), ctx = cv.getContext('2d');
const V = { D: 1, cw: 0, ch: 0, sc: 1, ox: 0, oy: 0, pat: null, patFor: '' };
let FX = [], HOLES = [], BLOTS = [], SHAKE = 0;
const AIM = [{ x: 110, y: 300, kick: 0 }, { x: 200, y: 300, kick: 0 }, { x: 290, y: 300, kick: 0 }];
// where each seat sits: the rivals' heads, and the rifle pivots
const SEAT = [{ hx: 42, hy: 632, px: 60, py: 640, len: 96, s: 1 }, { px: 200, py: 716, len: 150, s: 1.45 }, { hx: 358, hy: 632, px: 340, py: 640, len: 96, s: 1 }];

// ---------- layout ----------
function resize() {
  const r = $('stage').getBoundingClientRect();
  V.D = dpr(); V.cw = Math.max(1, r.width); V.ch = Math.max(1, r.height);
  cv.width = Math.round(V.cw * V.D); cv.height = Math.round(V.ch * V.D);
  V.sc = Math.min(V.cw / E.W, V.ch / E.WH);
  V.ox = (V.cw - E.W * V.sc) / 2; V.oy = (V.ch - E.WH * V.sc) / 2;
  resetSprites(V.sc * V.D); V.patFor = '';
}
addEventListener('resize', () => { if (R) { resize(); draw(); } });
const world = () => ctx.setTransform(V.D * V.sc, 0, 0, V.D * V.sc, V.D * (V.ox + (SHAKE ? (Math.random() - .5) * SHAKE : 0)), V.D * (V.oy + (SHAKE ? (Math.random() - .5) * SHAKE : 0)));
const screenXY = (x, y) => [V.ox + x * V.sc, V.oy + y * V.sc];
const viewLeft = () => -V.ox / V.sc, viewRight = () => (V.cw - V.ox) / V.sc, viewTop = () => -V.oy / V.sc, viewBottom = () => (V.ch - V.oy) / V.sc;

// ---------- the back wall ----------
function wallPattern(kind) {
  const k = V.sc * V.D, tw = { waves: 48, bricks: 48, planks: 36, night: 120, harlequin: 40 }[kind], th = { waves: 26, bricks: 26, planks: 90, night: 120, harlequin: 60 }[kind];
  const c = document.createElement('canvas'); c.width = Math.round(tw * k); c.height = Math.round(th * k);
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
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = V.pat; ctx.fillRect(0, 0, cv.width, cv.height);
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
function drawCounter() {
  const l = viewLeft() - 2, r = viewRight() + 2, b = viewBottom() + 2, y = E.GH;
  ctx.fillStyle = '#000'; ctx.fillRect(l, y - 4, r - l, 8);
  ctx.beginPath(); ctx.rect(l, y + 14, r - l, b - y - 14); ctx.fillStyle = '#fff'; ctx.fill();
  ctx.save(); ctx.clip(); ctx.beginPath();
  for (let x = Math.floor(l / 30) * 30; x < r; x += 30) { ctx.moveTo(x, y + 14); ctx.lineTo(x, b); }
  ctx.lineWidth = 1.6; ctx.strokeStyle = '#000'; ctx.stroke();
  ctx.globalAlpha = .5; ctx.beginPath(); for (let x = l - 200; x < r; x += 5) { ctx.moveTo(x, y + 14); ctx.lineTo(x + 120, b); } ctx.lineWidth = .7; ctx.stroke();
  ctx.restore();
  ctx.beginPath(); ctx.rect(l, y + 14, r - l, b - y); ctx.lineWidth = 2.3; ctx.strokeStyle = '#000'; ctx.stroke();
  ctx.beginPath(); ctx.rect(l, y, r - l, 14); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(l, y + 23); ctx.lineTo(r, y + 23); ctx.setLineDash([6, 5]); ctx.lineWidth = 1.4; ctx.stroke(); ctx.setLineDash([]);
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

// ---------- the rivals and rifles ----------
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
function muzzle(i) {
  const q = SEAT[i], a = AIM[i], ang = Math.atan2(a.y - q.py, a.x - q.px), L = 100 * q.s;
  return [q.px + Math.cos(ang) * L, q.py + Math.sin(ang) * L];
}
function drawSeats() {
  [0, 2].forEach(i => {
    const S = R.seats[i], q = SEAT[i], a = AIM[i];
    ctx.save(); ctx.translate(q.hx, q.hy); ctx.scale(1.05, 1.05); LW = 2.3; drawHead(ctx, S.hat || 'none', false);
    if (S.sootT > 0) { ctx.globalAlpha = Math.min(1, S.sootT); for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(Math.cos(k * 1.3 + PLAY.clock * 2) * 14, -24 - k * 5 - (PLAY.clock * 20 + k * 9) % 20, 4 + k, 0, TAU); ctx.fillStyle = '#000'; ctx.fill(); } }
    ctx.restore();
    drawRifle(q.px, q.py, Math.atan2(a.y - q.py, a.x - q.px), q.s, S.ammo > 0 && S.reloadT <= 0, a.kick);
    if (S.reloadT > 0) { ctx.beginPath(); ctx.arc(q.hx, q.hy - 38, 7, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - S.reloadT / (S.reloadFull || 1))); ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.stroke(); }
  });
  const S = R.seats[1], q = SEAT[1], a = AIM[1];
  drawRifle(q.px, q.py, Math.atan2(a.y - q.py, a.x - q.px), q.s, S.ammo > 0 && S.reloadT <= 0, a.kick);
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
    if (f.k === 'line') { ctx.globalAlpha = 1 - u; ctx.beginPath(); ctx.moveTo(f.x0, f.y0); ctx.lineTo(f.x1, f.y1); ctx.setLineDash(f.seat === 1 ? [] : [4, 5]); ctx.lineWidth = f.seat === 1 ? 2.2 : 1.6; ctx.strokeStyle = '#000'; ctx.stroke(); }
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
  for (const b of BLOTS) {
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
    for (let i = 0; i < 9; i++) { const a = b.a + i * .7, d = b.r * (.8 + (i % 3) * .25); ctx.beginPath(); ctx.arc(b.x + Math.cos(a) * d, b.y + Math.sin(a) * d, b.r * (.18 + (i % 2) * .12), 0, TAU); ctx.fill(); }
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
  drawPoles(); drawAwning(); drawCounter(); drawSeats();
  drawFx(dt); drawBlots();
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
        const [mx, my] = muzzle(seat);
        fx({ k: 'line', x0: mx, y0: my, x1: e.x, y1: e.y, seat, life: .14 });
        fx({ k: 'puff', x: mx, y: my, r: 7, life: .35 });
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
  for (let i = 0; i < 4; i++) BLOTS.push({ x: 60 + Math.random() * 280, y: 90 + Math.random() * 380, r: 16 + Math.random() * 16, a: Math.random() * 6 });
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
  $('tubeLbl').textContent = reloading ? 'Reloading' : S.ammo < S.mag ? 'Tap to reload' : 'Corks';
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
cv.addEventListener('pointerdown', e => {
  audioInit();
  if (!R || paused || R.phase !== 'go') return;
  const r = cv.getBoundingClientRect(), x = (e.clientX - r.left - V.ox) / V.sc, y = (e.clientY - r.top - V.oy) / V.sc;
  if (y > E.GH + 6) return;
  const S = R.seats[1];
  if (S.reloadT > 0) { sfx('empty'); nope($('tube')); return; }
  if (!E.shoot(R, 1, x, y) && S.ammo > 0) return;
  hideTip();
});
cv.addEventListener('pointermove', e => {
  if (!R || e.pointerType !== 'mouse') return;
  const r = cv.getBoundingClientRect();
  AIM[1].x = (e.clientX - r.left - V.ox) / V.sc; AIM[1].y = Math.min(E.GH, (e.clientY - r.top - V.oy) / V.sc);
});
$('tube').onclick = () => { if (R && !paused && E.reload(R, 1)) squash($('tube')); };
$('shells').onclick = e => {
  const b = e.target.closest('.shell[data-s]'); if (!b || !R || paused) return;
  const got = E.loadShell(R, 1, b.dataset.s); sfx(got ? 'loaded' : 'tick'); hud(true); squash(b);
};
addEventListener('keydown', e => {
  if (!R || !$('play').classList.contains('on')) return;
  if (e.key === 'Escape' || e.key === 'p') { paused ? resumeRound() : pauseRound(); return; }
  if (paused) return;
  if (e.key === 'r' || e.key === ' ') { E.reload(R, 1); e.preventDefault(); }
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
        <p><b>Tap a target to shoot it.</b> Knock down more than the rivals either side of you before the clock runs out.</p>
        <p>They shoot the same targets as you. If they get there first, it’s theirs.</p>
        <p><b>Hit 3 in a row</b> and your points double. 6 in a row triples them. A miss starts you over.</p>
        <p><b>Black targets cost points.</b> Leave them be.</p>
        <p>6 corks a load. It reloads by itself, or tap the corks to reload early.</p>
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
