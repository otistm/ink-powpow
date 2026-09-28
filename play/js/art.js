/* =====================================================================
   Ink drawings. Targets are drawn on canvas once per screen size and kept
   as sprites (front, and a hatched back for when they're knocked flat).
   Heads with hats for the rivals and barkers, the prizes, and the SVG
   icons for shells and upgrades.
   Every target is drawn facing right in a 48 × 48 box centred on 0, 0.
   ===================================================================== */
"use strict";
const TAU = Math.PI * 2;
let LW = 2.4; // line width in drawing units, set per sprite so lines come out about 2.3px on screen

function sh(c, fill = '#fff', stroke = '#000') { c.fillStyle = fill; c.fill(); c.lineWidth = LW; c.strokeStyle = stroke; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(); }
function ell(c, x, y, rx, ry, rot = 0) { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU); }
function circ(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, TAU); }
function dot(c, x, y, r, col = '#000') { circ(c, x, y, r); c.fillStyle = col; c.fill(); }
function poly(c, pts, close = true) { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); if (close) c.closePath(); }
function stroke(c, w = LW, col = '#000') { c.lineWidth = w; c.strokeStyle = col; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(); }
function fat(c, pts, w) { poly(c, pts, false); stroke(c, w + LW * 2); poly(c, pts, false); stroke(c, w, '#fff'); }
// diagonal ink hatching inside whatever path is current
function hatch(c, gap = 3.6, ang = -1) { c.save(); c.clip(); c.beginPath(); for (let x = -60; x < 60; x += gap) { c.moveTo(x, -40); c.lineTo(x + ang * 50, 40); } c.lineWidth = LW * .45; c.strokeStyle = '#000'; c.stroke(); c.restore(); }
function dots(c, gap = 4) { c.save(); c.clip(); c.fillStyle = '#000'; for (let y = -30; y < 30; y += gap) for (let x = -30 + (y / gap % 2 ? gap / 2 : 0); x < 30; x += gap) { c.beginPath(); c.arc(x, y, LW * .28, 0, TAU); c.fill(); } c.restore(); }
function starPath(c, x, y, R, r, n = 5, rot = -Math.PI / 2) { c.beginPath(); for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n, rr = i % 2 ? r : R; i ? c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); }

const ART = {
  duck(c) {
    poly(c, [[-22, 2], [-16, -6], [-8, 0], [6, -2], [14, 6], [10, 16], [-14, 16]]); sh(c);
    c.beginPath(); c.moveTo(-8, 6); c.quadraticCurveTo(0, 12, 6, 5); stroke(c);
    circ(c, 10, -8, 8); sh(c);
    poly(c, [[16, -10], [24, -7], [16, -5]]); sh(c, '#000');
    dot(c, 11, -10, 1.8);
  },
  rabbit(c) {
    ell(c, -5, -18, 3.2, 9, -.25); sh(c); ell(c, 3, -18, 3.2, 9, .2); sh(c);
    ell(c, -2, 10, 13, 11); sh(c);
    circ(c, -14, 12, 4.5); sh(c);
    circ(c, 0, -4, 9); sh(c);
    dot(c, 3, -6, 1.6); dot(c, 8, -2, 1.6);
    c.beginPath(); c.moveTo(-6, 21); c.lineTo(4, 21); stroke(c);
  },
  fish(c) {
    poly(c, [[-12, 0], [-24, -10], [-22, 0], [-24, 10]]); sh(c);
    ell(c, 2, 0, 16, 10); sh(c);
    c.beginPath(); c.moveTo(-4, -9); c.quadraticCurveTo(0, -16, 6, -9); sh(c);
    c.beginPath(); c.moveTo(-2, -8); c.quadraticCurveTo(3, 0, -2, 8); stroke(c);
    dot(c, 10, -2, 2);
    ell(c, 2, 0, 16, 10); c.save(); c.beginPath(); c.rect(-2, -12, 14, 24); c.clip(); ell(c, 2, 0, 16, 10); c.restore();
  },
  bottle(c) {
    poly(c, [[-4, -24], [4, -24], [4, -12], [9, -5], [9, 22], [-9, 22], [-9, -5], [-4, -12]]); sh(c);
    c.beginPath(); c.rect(-9, 2, 18, 11); c.fillStyle = '#fff'; c.fill(); hatch(c, 3); c.beginPath(); c.rect(-9, 2, 18, 11); stroke(c);
    c.beginPath(); c.moveTo(-5, -3); c.lineTo(-5, -1); stroke(c, LW * .8);
    c.beginPath(); c.rect(-5, -26, 10, 4); sh(c, '#000');
  },
  can(c) {
    c.beginPath(); c.rect(-12, -14, 24, 30); sh(c);
    c.beginPath(); c.rect(2, -14, 10, 30); hatch(c, 3); c.beginPath(); c.rect(-12, -14, 24, 30); stroke(c);
    ell(c, 0, -14, 12, 3.5); sh(c);
    [-4, 4, 12].forEach(y => { c.beginPath(); c.moveTo(-12, y); c.lineTo(12, y); stroke(c, LW * .6); });
  },
  star(c) { starPath(c, 0, 1, 23, 10); sh(c); starPath(c, 0, 1, 11, 5); sh(c, '#000'); },
  moon(c) {
    circ(c, 0, 0, 21); sh(c);
    c.save(); c.globalCompositeOperation = 'destination-out'; circ(c, 11, -5, 17); c.fill(); c.restore();
    c.save(); circ(c, 0, 0, 21); c.clip(); circ(c, 11, -5, 17); stroke(c); c.restore();
    dot(c, -11, -3, 2); c.beginPath(); c.arc(-9, 6, 4, .3, 1.6); stroke(c, LW * .8);
  },
  pig(c) {
    [[-12, 12], [6, 12]].forEach(([x, y]) => { c.beginPath(); c.rect(x, y, 5, 8); sh(c); });
    ell(c, -3, 3, 17, 12); sh(c);
    c.beginPath(); c.moveTo(-20, 0); c.bezierCurveTo(-27, -4, -27, 6, -22, 4); stroke(c);
    circ(c, 12, -4, 9); sh(c);
    poly(c, [[6, -11], [8, -20], [13, -12]]); sh(c);
    ell(c, 21, -2, 4, 5); sh(c); dot(c, 20, -3.5, 1); dot(c, 22, -.5, 1);
    dot(c, 12, -6, 1.6);
  },
  owl(c) {
    poly(c, [[-14, -12], [-13, -24], [-5, -16]]); sh(c); poly(c, [[14, -12], [13, -24], [5, -16]]); sh(c);
    ell(c, 0, 3, 15, 20); sh(c);
    ell(c, 0, 10, 9, 11); c.save(); c.fillStyle = '#fff'; c.fill(); hatch(c, 3); c.restore(); ell(c, 0, 10, 9, 11); stroke(c, LW * .7);
    circ(c, -6, -7, 6); sh(c); circ(c, 6, -7, 6); sh(c);
    dot(c, -5, -7, 2.8); dot(c, 7, -7, 2.8);
    poly(c, [[-2, -2], [2, -2], [0, 3]]); sh(c, '#000');
  },
  pipe(c) {
    fat(c, [[-2, 4], [10, 0], [23, -6]], 4.5);
    c.beginPath(); c.moveTo(-15, -12); c.lineTo(-1, -12); c.lineTo(-2, 2); c.quadraticCurveTo(-8, 12, -14, 2); c.closePath(); sh(c);
    ell(c, -8, -12, 7, 2.4); sh(c, '#000');
  },
  bell(c) {
    circ(c, 0, -20, 3.5); stroke(c);
    c.beginPath(); c.moveTo(-19, 14); c.quadraticCurveTo(-14, 11, -13, -3); c.quadraticCurveTo(-12, -17, 0, -17); c.quadraticCurveTo(12, -17, 13, -3); c.quadraticCurveTo(14, 11, 19, 14); c.closePath(); sh(c);
    c.beginPath(); c.moveTo(4, -13); c.quadraticCurveTo(10, -10, 10, 4); stroke(c, LW * .7);
    ell(c, 0, 14, 19, 3.5); sh(c);
    dot(c, 0, 19, 4);
  },
  balloon(c) {
    ell(c, 0, -3, 16, 19); sh(c);
    poly(c, [[-3, 19], [3, 19], [0, 15]]); sh(c);
    c.beginPath(); c.arc(0, -3, 11, -2.6, -1.8); stroke(c, LW * 1.2);
  },
  bullseye(c) { [[22, '#fff'], [16, '#000'], [10, '#fff'], [4.5, '#000']].forEach(([r, f]) => { circ(c, 0, 0, r); sh(c, f); }); },
  croc(c) {
    c.beginPath(); c.moveTo(-24, 8); c.lineTo(-24, 0);
    for (let x = -24; x < 4; x += 5) { c.lineTo(x + 2.5, -5); c.lineTo(x + 5, 0); }
    c.quadraticCurveTo(8, -12, 12, -4); c.lineTo(25, -2); c.lineTo(25, 3); c.lineTo(10, 3);
    c.lineTo(25, 5); c.lineTo(24, 9); c.closePath(); sh(c);
    c.beginPath(); for (let x = 12; x < 24; x += 3) { c.moveTo(x, 3); c.lineTo(x + 1.5, 5.5); } stroke(c, LW * .7);
    circ(c, 8, -7, 3); sh(c); dot(c, 8.6, -7, 1.3);
  },
  ghost(c) {
    c.beginPath(); c.moveTo(-16, 21); c.lineTo(-16, -4); c.quadraticCurveTo(-16, -22, 0, -22); c.quadraticCurveTo(16, -22, 16, -4); c.lineTo(16, 21);
    for (let i = 0; i < 4; i++) { const x = 16 - i * 8; c.quadraticCurveTo(x - 2, 15, x - 4, 19); c.quadraticCurveTo(x - 6, 23, x - 8, 19); }
    c.closePath(); sh(c);
    ell(c, -6, -6, 3, 4.5); c.fillStyle = '#000'; c.fill(); ell(c, 6, -6, 3, 4.5); c.fill();
    ell(c, 0, 6, 3.5, 4.5); c.fill();
  },
  chicken(c) {
    ell(c, -5, 10, 14, 9); sh(c);
    fat(c, [[4, 6], [8, -6], [7, -14]], 5);
    circ(c, 8, -15, 6); sh(c);
    poly(c, [[3, -20], [5, -25], [8, -21], [11, -25], [13, -20]]); sh(c);
    poly(c, [[13, -16], [22, -14], [13, -12]]); sh(c);
    dot(c, 9, -16, 1.4);
    [[-8, 18], [-2, 18]].forEach(([x, y]) => { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 5); c.lineTo(x + 3, y + 6); stroke(c); });
    c.beginPath(); c.moveTo(-12, 8); c.quadraticCurveTo(-4, 14, 2, 8); stroke(c, LW * .7);
  },
  teapot(c) {
    c.beginPath(); c.moveTo(-14, 0); c.bezierCurveTo(-26, -6, -26, 14, -12, 10); stroke(c, LW * 1.9); c.beginPath(); c.moveTo(-14, 0); c.bezierCurveTo(-26, -6, -26, 14, -12, 10); stroke(c, LW * .4, '#fff');
    c.beginPath(); c.moveTo(12, 6); c.quadraticCurveTo(20, 4, 24, -8); c.lineTo(26, -6); c.quadraticCurveTo(22, 10, 12, 12); c.closePath(); sh(c);
    ell(c, 0, 4, 15, 12); sh(c);
    c.beginPath(); c.moveTo(-15, 4); c.quadraticCurveTo(0, 12, 15, 4); stroke(c, LW * .7);
    c.beginPath(); c.moveTo(-9, -6); c.quadraticCurveTo(0, -16, 9, -6); c.closePath(); sh(c);
    circ(c, 0, -13, 2.8); sh(c, '#000');
  },
  bandit(c) {
    c.beginPath(); c.rect(-11, 12, 22, 12); sh(c);
    circ(c, 0, 2, 13); sh(c);
    c.beginPath(); c.rect(-13, -4, 26, 7); sh(c, '#000');
    ell(c, -5, -.5, 2.8, 2); c.fillStyle = '#fff'; c.fill(); ell(c, 5, -.5, 2.8, 2); c.fill();
    c.beginPath(); c.moveTo(-7, 8); c.quadraticCurveTo(0, 5, 7, 8); stroke(c, LW * 1.2);
    ell(c, 0, -10, 20, 3.5); sh(c, '#000');
    c.beginPath(); c.moveTo(-10, -10); c.quadraticCurveTo(-10, -22, 0, -21); c.quadraticCurveTo(10, -22, 10, -10); c.closePath(); sh(c, '#000');
  },
  bat(c) {
    c.beginPath(); c.moveTo(0, -4);
    c.quadraticCurveTo(-12, -14, -24, -6); c.quadraticCurveTo(-20, 0, -21, 5); c.quadraticCurveTo(-16, 1, -13, 7); c.quadraticCurveTo(-9, 2, -5, 8);
    c.lineTo(5, 8); c.quadraticCurveTo(9, 2, 13, 7); c.quadraticCurveTo(16, 1, 21, 5); c.quadraticCurveTo(20, 0, 24, -6); c.quadraticCurveTo(12, -14, 0, -4); c.closePath(); sh(c);
    ell(c, 0, 1, 5.5, 7.5); sh(c);
    poly(c, [[-4, -5], [-4, -10], [-1, -6]]); sh(c); poly(c, [[4, -5], [4, -10], [1, -6]]); sh(c);
    dot(c, -2, 0, 1.2); dot(c, 2, 0, 1.2);
  },
  ufo(c) {
    c.beginPath(); c.moveTo(0, -12); c.lineTo(0, -19); stroke(c); dot(c, 0, -20, 2);
    c.beginPath(); c.arc(0, -2, 11, Math.PI, 0); sh(c);
    c.beginPath(); c.arc(0, -2, 11, Math.PI, 0); c.closePath(); c.save(); c.clip(); c.beginPath(); c.arc(4, -2, 11, Math.PI, 0); c.restore();
    ell(c, 0, 3, 24, 7); sh(c);
    ell(c, 0, 1, 24, 3); stroke(c, LW * .6);
    [-16, -8, 0, 8, 16].forEach(x => dot(c, x, 5, 1.8));
  },
  goose(c) {
    poly(c, [[-22, 4], [-17, -3], [-6, 2], [6, 0], [12, 8], [8, 16], [-14, 16]]); sh(c); poly(c, [[-22, 4], [-17, -3], [-6, 2], [6, 0], [12, 8], [8, 16], [-14, 16]]); dots(c, 3.4); poly(c, [[-22, 4], [-17, -3], [-6, 2], [6, 0], [12, 8], [8, 16], [-14, 16]]); stroke(c);
    fat(c, [[6, 4], [10, -8], [9, -14]], 5);
    circ(c, 10, -15, 6); sh(c);
    poly(c, [[15, -17], [23, -14], [15, -12]]); sh(c, '#000');
    dot(c, 11, -16, 1.5);
    c.beginPath(); [[-18, -12], [-14, -18], [20, 2], [16, -24]].forEach(([x, y]) => { c.moveTo(x - 3, y); c.lineTo(x + 3, y); c.moveTo(x, y - 3); c.lineTo(x, y + 3); }); stroke(c, LW * .8);
  },
  clock(c) {
    circ(c, -10, -14, 5); sh(c); circ(c, 10, -14, 5); sh(c);
    c.beginPath(); c.moveTo(-9, 15); c.lineTo(-12, 21); c.moveTo(9, 15); c.lineTo(12, 21); stroke(c, LW * 1.3);
    circ(c, 0, 1, 16); sh(c);
    circ(c, 0, 1, 12); stroke(c, LW * .6);
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; c.beginPath(); c.moveTo(Math.cos(a) * 10, 1 + Math.sin(a) * 10); c.lineTo(Math.cos(a) * 12, 1 + Math.sin(a) * 12); stroke(c, LW * .5); }
    c.beginPath(); c.moveTo(0, 1); c.lineTo(0, -7); c.moveTo(0, 1); c.lineTo(6, 3); stroke(c);
    dot(c, 0, 1, 1.8);
  },
  box(c) {
    c.beginPath(); c.rect(-17, -12, 34, 30); sh(c);
    c.beginPath(); c.rect(-17, -12, 34, 30); hatch(c, 5, 1);
    c.beginPath(); c.rect(-19, -18, 38, 8); sh(c);
    c.beginPath(); c.rect(-4, -18, 8, 36); sh(c, '#000');
    circ(c, 0, 4, 9); sh(c);
    c.fillStyle = '#000'; c.font = 'italic 900 15px Fraunces, Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', 0, 5);
  },
  knight(c, dent) {
    c.beginPath(); c.moveTo(0, -20); c.quadraticCurveTo(10, -30, 16, -24); c.quadraticCurveTo(8, -24, 4, -18); stroke(c, LW * 2.2); c.beginPath(); c.moveTo(0, -20); c.quadraticCurveTo(10, -30, 16, -24); stroke(c, LW * .6, '#fff');
    c.beginPath(); c.moveTo(-14, 20); c.lineTo(-14, -4); c.quadraticCurveTo(-14, -20, 0, -20); c.quadraticCurveTo(14, -20, 14, -4); c.lineTo(14, 20); c.closePath(); sh(c);
    c.beginPath(); c.rect(-14, -4, 28, 5); sh(c, '#000');
    [-8, -3, 2, 7].forEach(x => { c.beginPath(); c.rect(x, 6, 2, 8); c.fillStyle = '#000'; c.fill(); });
    c.beginPath(); c.moveTo(0, -20); c.lineTo(0, -4); stroke(c, LW * .6);
    if (dent) { c.beginPath(); c.moveTo(-10, -14); c.lineTo(-4, -10); c.lineTo(-7, -6); c.lineTo(-1, -2); stroke(c, LW * 1.1); }
  },
  cactus(c) {
    const col = () => { c.beginPath(); c.moveTo(-5, 22); c.lineTo(-5, -18); c.arc(0, -18, 5, Math.PI, 0); c.lineTo(5, 22); c.closePath(); };
    c.beginPath(); c.moveTo(-5, 6); c.lineTo(-13, 6); c.arc(-13, 1, 5, Math.PI / 2, Math.PI); c.lineTo(-18, -8); c.arc(-14, -8, 4, Math.PI, 0); c.lineTo(-10, 1); c.lineTo(-5, 1); sh(c);
    c.beginPath(); c.moveTo(5, 0); c.lineTo(13, 0); c.arc(13, -5, 5, Math.PI / 2, 0, true); c.lineTo(18, -12); c.arc(14, -12, 4, 0, Math.PI, true); c.lineTo(10, -5); c.lineTo(5, -5); sh(c);
    col(); sh(c);
    c.beginPath(); c.moveTo(0, -18); c.lineTo(0, 20); stroke(c, LW * .5);
    c.beginPath(); [[-6, -10], [6, -4], [-6, 4], [6, 12], [-6, 16]].forEach(([x, y]) => { c.moveTo(x, y); c.lineTo(x + (x < 0 ? -3 : 3), y - 2); }); stroke(c, LW * .6);
    c.beginPath(); c.rect(-9, 20, 18, 4); sh(c, '#000');
  },
  rocket(c) {
    poly(c, [[-18, -4], [-26, -3], [-22, 0], [-26, 3], [-18, 4]]); c.save(); c.fillStyle = '#fff'; c.fill(); hatch(c, 2.4); c.restore(); poly(c, [[-18, -4], [-26, -3], [-22, 0], [-26, 3], [-18, 4]]); stroke(c, LW * .7);
    poly(c, [[-14, -6], [-20, -14], [-8, -6]]); sh(c, '#000'); poly(c, [[-14, 6], [-20, 14], [-8, 6]]); sh(c, '#000');
    c.beginPath(); c.moveTo(-18, -7); c.lineTo(8, -7); c.quadraticCurveTo(20, -6, 25, 0); c.quadraticCurveTo(20, 6, 8, 7); c.lineTo(-18, 7); c.closePath(); sh(c);
    circ(c, 6, 0, 3.5); sh(c); c.beginPath(); c.moveTo(14, -6); c.lineTo(14, 6); stroke(c, LW * .7);
  },
  // black targets: shooting them costs points
  sheriff(c) {
    c.beginPath(); c.rect(-11, 12, 22, 12); sh(c, '#000');
    circ(c, 0, 2, 13); sh(c, '#000');
    dot(c, -5, 0, 1.8, '#fff'); dot(c, 5, 0, 1.8, '#fff');
    c.beginPath(); c.moveTo(-6, 7); c.quadraticCurveTo(-3, 5, 0, 7); c.quadraticCurveTo(3, 5, 6, 7); stroke(c, LW * 1.1, '#fff');
    starPath(c, 5, 18, 5, 2.2); sh(c, '#fff');
    ell(c, 0, -10, 22, 4); sh(c, '#000');
    c.beginPath(); c.moveTo(-11, -10); c.quadraticCurveTo(-12, -24, -4, -20); c.quadraticCurveTo(0, -17, 4, -20); c.quadraticCurveTo(12, -24, 11, -10); c.closePath(); sh(c, '#000');
    c.beginPath(); c.moveTo(-11, -13); c.lineTo(11, -13); stroke(c, LW * .8, '#fff');
  },
  tophat(c) {
    ell(c, 0, 12, 22, 5); sh(c, '#000');
    c.beginPath(); c.moveTo(-13, 12); c.lineTo(-12, -18); c.quadraticCurveTo(0, -22, 12, -18); c.lineTo(13, 12); c.closePath(); sh(c, '#000');
    c.beginPath(); c.rect(-13, 2, 26, 6); sh(c, '#fff');
    c.beginPath(); c.moveTo(-7, -14); c.lineTo(-7, -2); stroke(c, LW * .7, '#fff');
  },
  cat(c) {
    c.beginPath(); c.moveTo(10, 18); c.bezierCurveTo(26, 18, 24, -2, 16, -6); stroke(c, LW * 2.4); c.beginPath(); c.moveTo(10, 18); c.bezierCurveTo(26, 18, 24, -2, 16, -6); stroke(c, LW * .5, '#fff');
    c.beginPath(); c.moveTo(-13, 21); c.quadraticCurveTo(-16, 0, -6, -4); c.lineTo(6, -4); c.quadraticCurveTo(16, 0, 13, 21); c.closePath(); sh(c, '#000');
    circ(c, 0, -10, 10); sh(c, '#000');
    poly(c, [[-9, -14], [-9, -24], [-2, -18]]); sh(c, '#000'); poly(c, [[9, -14], [9, -24], [2, -18]]); sh(c, '#000');
    ell(c, -4, -11, 2.4, 3); c.fillStyle = '#fff'; c.fill(); ell(c, 4, -11, 2.4, 3); c.fill();
    dot(c, -4, -11, 1); dot(c, 4, -11, 1);
    c.beginPath(); c.moveTo(-12, -6); c.lineTo(-4, -6); c.moveTo(12, -6); c.lineTo(4, -6); stroke(c, LW * .5, '#fff');
  },
};

// ---------- sprites ----------
function tint(src, col) {
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
  const x = c.getContext('2d'); x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height);
  return c;
}
let SPR = {}, SPR_K = 0;
// k: device pixels per world unit. Returns { img, w, h } where w, h are in world units.
function sprite(type, kind = 'front') {
  const key = type + '/' + kind;
  if (SPR[key]) return SPR[key];
  const t = E.T[type], k = SPR_K, s = t.sz / 24, pad = 8, size = Math.ceil((t.sz * 2 + pad * 2) * k);
  const raw = document.createElement('canvas'); raw.width = raw.height = size;
  const c = raw.getContext('2d');
  c.translate(size / 2, size / 2); c.scale(s * k, s * k);
  LW = 2.3 * (dpr()) / (s * k);
  ART[type](c, kind === 'dent');
  const out = document.createElement('canvas'); out.width = out.height = size;
  const o = out.getContext('2d'), px = dpr();
  if (kind === 'back') {
    // knocked flat: the back of the tin, hatched
    const blk = tint(raw, '#000'), wht = tint(raw, '#fff');
    o.drawImage(blk, -px, 0); o.drawImage(blk, px, 0); o.drawImage(blk, 0, -px); o.drawImage(blk, 0, px);
    o.drawImage(wht, 0, 0);
    o.globalCompositeOperation = 'source-atop'; o.strokeStyle = '#000'; o.lineWidth = px * 1.2; o.beginPath();
    for (let x = -size; x < size; x += px * 4) { o.moveTo(x, 0); o.lineTo(x + size, size); } o.stroke();
  } else {
    if (t.bad) { const w = tint(raw, '#fff'); for (let a = 0; a < 8; a++) o.drawImage(w, Math.cos(a / 8 * TAU) * 3 * px, Math.sin(a / 8 * TAU) * 3 * px); }
    o.drawImage(tint(raw, '#000'), 3 * px, 4 * px);
    o.drawImage(raw, 0, 0);
  }
  return (SPR[key] = { img: out, w: size / k, h: size / k });
}
function resetSprites(k) { if (Math.abs(k - SPR_K) > .01) { SPR = {}; SPR_K = k; } }
function dpr() { return Math.min(2, window.devicePixelRatio || 1); }

// ---------- heads and hats ----------
// A head of radius 20 at 0, 0. front: a face; otherwise the back of their head, as they sit beside you.
function drawHead(c, hat, front = true) {
  c.lineJoin = 'round'; c.lineCap = 'round';
  if (front) {
    c.beginPath(); c.moveTo(-26, 44); c.quadraticCurveTo(-24, 22, 0, 22); c.quadraticCurveTo(24, 22, 26, 44); c.closePath(); sh(c);
    circ(c, 0, 0, 19); sh(c);
    if (hat !== 'goggles') { dot(c, -7, -1, 2.2); dot(c, 7, -1, 2.2); }
    c.beginPath(); c.arc(0, 5, 7, .4, Math.PI - .4); stroke(c);
    if (hat === 'helmet' || hat === 'sheriffhat' || hat === 'boater' || hat === 'tophat') { c.beginPath(); c.moveTo(-9, 8); c.quadraticCurveTo(-4, 4, 0, 7); c.quadraticCurveTo(4, 4, 9, 8); c.quadraticCurveTo(4, 11, 0, 8); c.quadraticCurveTo(-4, 11, -9, 8); sh(c, '#000'); }
  } else {
    c.beginPath(); c.moveTo(-30, 50); c.quadraticCurveTo(-28, 22, 0, 22); c.quadraticCurveTo(28, 22, 30, 50); c.closePath(); sh(c);
    circ(c, 0, 0, 19); sh(c);
    circ(c, 0, 0, 19); hatch(c, 3.2); circ(c, 0, 0, 19); stroke(c);
    ell(c, -19, 2, 3, 5); sh(c); ell(c, 19, 2, 3, 5); sh(c);
  }
  const H = {
    none() { c.beginPath(); c.moveTo(-17, -8); c.quadraticCurveTo(-14, -22, 0, -20); c.quadraticCurveTo(14, -22, 17, -8); c.quadraticCurveTo(8, -14, 0, -10); c.quadraticCurveTo(-8, -14, -17, -8); sh(c, '#000'); },
    cap() { c.beginPath(); c.moveTo(-19, -4); c.quadraticCurveTo(-19, -22, 0, -22); c.quadraticCurveTo(19, -22, 19, -4); c.closePath(); sh(c); c.beginPath(); c.moveTo(-19, -4); c.quadraticCurveTo(-19, -22, 0, -22); c.quadraticCurveTo(19, -22, 19, -4); c.closePath(); hatch(c, 4); dot(c, 0, -22, 2.5);
      if (front) { ell(c, 0, -4, 22, 4.5); sh(c, '#000'); } },
    bonnet() { c.beginPath(); c.moveTo(-24, 12); c.quadraticCurveTo(-28, -26, 0, -26); c.quadraticCurveTo(28, -26, 24, 12); c.quadraticCurveTo(18, 0, 16, -8); c.quadraticCurveTo(0, -18, -16, -8); c.quadraticCurveTo(-18, 0, -24, 12); c.closePath(); sh(c);
      c.beginPath(); c.moveTo(-18, -14); c.quadraticCurveTo(0, -24, 18, -14); stroke(c, LW * .6);
      if (front) { poly(c, [[0, 20], [-9, 15], [-9, 25]]); sh(c, '#000'); poly(c, [[0, 20], [9, 15], [9, 25]]); sh(c, '#000'); } },
    bandana() { c.beginPath(); c.moveTo(-20, -2); c.quadraticCurveTo(-18, -22, 0, -21); c.quadraticCurveTo(18, -22, 20, -2); c.quadraticCurveTo(0, -8, -20, -2); sh(c, '#000');
      [[-10, -12], [0, -16], [10, -12], [-4, -8], [6, -8]].forEach(([x, y]) => dot(c, x, y, 1.6, '#fff'));
      poly(c, [[18, -4], [28, -8], [26, 2]]); sh(c, '#000'); },
    bowler() { ell(c, 0, -10, 24, 4.5); sh(c, '#000'); c.beginPath(); c.moveTo(-15, -10); c.quadraticCurveTo(-16, -30, 0, -30); c.quadraticCurveTo(16, -30, 15, -10); c.closePath(); sh(c, '#000'); c.beginPath(); c.moveTo(-15, -14); c.lineTo(15, -14); stroke(c, LW * .8, '#fff'); },
    cowboy(white) { c.beginPath(); c.moveTo(-32, -12); c.quadraticCurveTo(0, -2, 32, -12); c.quadraticCurveTo(0, -14, -32, -12); sh(c, white ? '#fff' : '#000');
      c.beginPath(); c.moveTo(-13, -11); c.quadraticCurveTo(-15, -32, -5, -28); c.quadraticCurveTo(0, -24, 5, -28); c.quadraticCurveTo(15, -32, 13, -11); c.closePath(); sh(c, white ? '#fff' : '#000');
      c.beginPath(); c.rect(-13, -17, 26, 5); sh(c, white ? '#000' : '#fff'); },
    stetson() { H.cowboy(true); },
    sheriffhat() { H.cowboy(false); starPath(c, 0, -21, 5, 2.2); sh(c, '#fff'); },
    goggles() { H.none(); c.beginPath(); c.moveTo(-19, -4); c.lineTo(19, -4); stroke(c, LW * 2.4); circ(c, -7, -3, 6); sh(c); circ(c, 7, -3, 6); sh(c); if (front) { dot(c, -7, -3, 2.4); dot(c, 7, -3, 2.4); } },
    bow() { H.none(); poly(c, [[0, -20], [-14, -30], [-14, -12]]); sh(c); poly(c, [[0, -20], [14, -30], [14, -12]]); sh(c); circ(c, 0, -20, 3.5); sh(c, '#000'); },
    helmet() { c.beginPath(); c.moveTo(-24, -6); c.quadraticCurveTo(-22, -30, 0, -30); c.quadraticCurveTo(22, -30, 24, -6); c.closePath(); sh(c); c.beginPath(); c.rect(-22, -12, 44, 5); sh(c, '#000'); dot(c, 0, -31, 2.4); },
    feather() { c.beginPath(); c.moveTo(8, -20); c.quadraticCurveTo(26, -34, 34, -46); c.quadraticCurveTo(20, -30, 12, -18); c.closePath(); sh(c); c.beginPath(); c.moveTo(10, -19); c.quadraticCurveTo(22, -30, 32, -44); stroke(c, LW * .5);
      ell(c, -2, -16, 20, 7, -.15); sh(c, '#000'); dot(c, -2, -23, 2.5); },
    boater() { ell(c, 0, -12, 26, 5); sh(c); ell(c, 0, -12, 26, 5); hatch(c, 3, 1); ell(c, 0, -12, 26, 5); stroke(c);
      c.beginPath(); c.rect(-15, -24, 30, 12); sh(c); c.beginPath(); c.rect(-15, -18, 30, 5); sh(c, '#000'); ell(c, 0, -24, 15, 2.5); sh(c); },
    tophat() { ell(c, 0, -12, 24, 4.5); sh(c, '#000'); c.beginPath(); c.moveTo(-14, -12); c.lineTo(-13, -42); c.quadraticCurveTo(0, -45, 13, -42); c.lineTo(14, -12); c.closePath(); sh(c, '#000'); c.beginPath(); c.rect(-14, -20, 28, 5); sh(c, '#fff'); },
    scarf() { c.beginPath(); c.moveTo(-22, 14); c.quadraticCurveTo(-26, -24, 0, -24); c.quadraticCurveTo(26, -24, 22, 14); c.quadraticCurveTo(18, -2, 14, -10); c.quadraticCurveTo(0, -16, -14, -10); c.quadraticCurveTo(-18, -2, -22, 14); c.closePath(); sh(c, '#000');
      [[-14, -12], [-4, -18], [8, -18], [16, -8], [-18, 2], [18, 4]].forEach(([x, y]) => dot(c, x, y, 1.8, '#fff'));
      if (front) { circ(c, -20, 10, 4.5); stroke(c, LW * 1.2); } },
    turban() { c.beginPath(); c.moveTo(-20, -4); c.quadraticCurveTo(-24, -32, 0, -32); c.quadraticCurveTo(24, -32, 20, -4); c.quadraticCurveTo(0, -10, -20, -4); sh(c);
      c.beginPath(); c.moveTo(-20, -8); c.quadraticCurveTo(0, -26, 20, -14); c.moveTo(-18, -16); c.quadraticCurveTo(4, -32, 18, -22); stroke(c, LW * .7);
      if (front) { circ(c, 0, -12, 4); sh(c, '#000'); poly(c, [[0, -16], [-3, -26], [3, -26]]); sh(c); } },
  };
  (H[hat] || H.none)();
}
// A head as a picture for the page, kept once made.
const FACES = {};
function faceURL(hat, size = 96) {
  const key = hat + size;
  if (FACES[key]) return FACES[key];
  const c = document.createElement('canvas'); c.width = c.height = size * 2;
  const x = c.getContext('2d'); x.scale(size * 2 / 100, size * 2 / 100); x.translate(50, 56); LW = 2.6;
  x.save(); x.beginPath(); x.arc(0, -6, 48, 0, TAU); x.clip(); drawHead(x, hat, true); x.restore();
  return (FACES[key] = c.toDataURL());
}
function faceImg(hat, cls = 'face') { return `<img class="${cls}" src="${faceURL(hat)}" alt="">`; }
// A target as a little picture for the page
function targetURL(type) {
  const c = document.createElement('canvas'); c.width = c.height = 96; const x = c.getContext('2d');
  x.translate(48, 48); x.scale(1.7, 1.7); LW = 2.4; ART[type](x); return c.toDataURL();
}

// ---------- prizes ----------
const PRIZE_ART = {
  goldfish(c) {
    c.beginPath(); c.moveTo(-6, -30); c.lineTo(6, -30); c.lineTo(4, -22); c.quadraticCurveTo(30, -10, 26, 14); c.quadraticCurveTo(22, 34, 0, 34); c.quadraticCurveTo(-22, 34, -26, 14); c.quadraticCurveTo(-30, -10, -4, -22); c.closePath(); sh(c);
    c.beginPath(); c.moveTo(-24, 0); c.quadraticCurveTo(0, 6, 24, 0); c.lineTo(24, 8); c.quadraticCurveTo(22, 32, 0, 32); c.quadraticCurveTo(-22, 32, -24, 8); c.closePath(); c.save(); c.fillStyle = '#fff'; c.fill(); hatch(c, 5, 0); c.restore();
    c.beginPath(); c.moveTo(-8, -30); c.lineTo(8, -30); stroke(c, LW * 1.4);
    c.save(); c.translate(-2, 12); c.scale(.55, .55); ART.fish(c); c.restore();
    circ(c, 10, -4, 2); stroke(c, LW * .7); circ(c, 14, -12, 1.4); stroke(c, LW * .7);
  },
  kazoo(c) {
    c.save(); c.rotate(-.35);
    c.beginPath(); c.moveTo(-32, -7); c.lineTo(20, -9); c.quadraticCurveTo(32, -9, 32, 0); c.quadraticCurveTo(32, 9, 20, 9); c.lineTo(-32, 7); c.closePath(); sh(c);
    c.beginPath(); c.moveTo(-32, -7); c.lineTo(20, -9); c.quadraticCurveTo(32, -9, 32, 0); c.quadraticCurveTo(32, 9, 20, 9); c.lineTo(-32, 7); c.closePath(); c.save(); c.beginPath(); c.rect(-10, -12, 40, 30); c.clip(); c.beginPath(); c.moveTo(-32, -7); c.lineTo(20, -9); c.quadraticCurveTo(32, -9, 32, 0); c.quadraticCurveTo(32, 9, 20, 9); c.lineTo(-32, 7); c.closePath(); hatch(c, 3); c.restore();
    c.beginPath(); c.rect(-4, -16, 14, 8); sh(c); circ(c, 3, -16, 5); sh(c, '#000');
    c.restore();
    c.beginPath(); c.moveTo(22, -28); c.quadraticCurveTo(28, -34, 34, -28); c.moveTo(26, -38); c.quadraticCurveTo(32, -44, 38, -38); stroke(c, LW * .8);
  },
  badge(c) {
    starPath(c, 0, 2, 34, 17, 6, -Math.PI / 2); sh(c);
    for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i * TAU / 6; circ(c, Math.cos(a) * 34, 2 + Math.sin(a) * 34, 3.5); sh(c); }
    circ(c, 0, 2, 13); sh(c); circ(c, 0, 2, 13); dots(c, 3);
    c.fillStyle = '#000'; c.font = 'italic 900 13px Fraunces, Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('★', 0, 3);
  },
  moonb(c) {
    c.beginPath(); c.moveTo(0, 18); c.quadraticCurveTo(-8, 30, 4, 40); stroke(c, LW * .8);
    c.save(); c.translate(0, -8); c.scale(1.2, 1.2); ART.moon(c); c.restore();
  },
  bear(c) {
    circ(c, -20, -26, 9); sh(c); circ(c, 20, -26, 9); sh(c);
    circ(c, -20, -26, 4); sh(c, '#000'); circ(c, 20, -26, 4); sh(c, '#000');
    ell(c, 0, 20, 26, 22); sh(c);
    ell(c, -26, 34, 11, 9); sh(c); ell(c, 26, 34, 11, 9); sh(c);
    ell(c, -25, 12, 8, 12, .5); sh(c); ell(c, 25, 12, 8, 12, -.5); sh(c);
    ell(c, 0, 22, 14, 13); c.save(); c.fillStyle = '#fff'; c.fill(); dots(c, 3.4); c.restore(); ell(c, 0, 22, 14, 13); stroke(c, LW * .7);
    circ(c, 0, -14, 20); sh(c);
    ell(c, 0, -8, 8, 6); sh(c); ell(c, 0, -10, 3.5, 2.5); sh(c, '#000');
    dot(c, -8, -18, 2.4); dot(c, 8, -18, 2.4);
    c.beginPath(); c.moveTo(0, -7); c.lineTo(0, -4); c.moveTo(-4, -3); c.quadraticCurveTo(0, 0, 4, -3); stroke(c, LW * .8);
    poly(c, [[0, 4], [-12, -2], [-12, 10]]); sh(c, '#000'); poly(c, [[0, 4], [12, -2], [12, 10]]); sh(c, '#000'); circ(c, 0, 4, 3.5); sh(c, '#000');
  },
};
const PRIZES_URL = {};
function prizeURL(id, empty) {
  const key = id + (empty ? '0' : '1');
  if (PRIZES_URL[key]) return PRIZES_URL[key];
  const c = document.createElement('canvas'); c.width = c.height = 200; const x = c.getContext('2d');
  x.translate(100, 100); x.scale(2, 2); LW = 2.4;
  if (empty) {
    // not won yet: just a dashed outline where it will sit
    const tmp = document.createElement('canvas'); tmp.width = tmp.height = 200; const y = tmp.getContext('2d'); y.translate(100, 100); y.scale(2, 2); PRIZE_ART[id](y);
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = .16; x.drawImage(tint(tmp, '#000'), 0, 0);
  } else {
    const tmp = document.createElement('canvas'); tmp.width = tmp.height = 200; const y = tmp.getContext('2d'); y.translate(100, 100); y.scale(2, 2); PRIZE_ART[id](y);
    x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(tint(tmp, '#000'), 6, 8); x.drawImage(tmp, 0, 0);
  }
  return (PRIZES_URL[key] = c.toDataURL());
}

// ---------- shell and upgrade icons (SVG, 32 × 32) ----------
const svg = (inner, cls = 'ico') => `<svg class="${cls}" viewBox="0 0 32 32" aria-hidden="true"><g fill="#fff" stroke="#000" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round">${inner}</g></svg>`;
const ICON = {
  cork: '<path d="M11 7h10l-2 20h-6z"/><path d="M11 7h10" stroke-width="3"/><path d="M14 13h4M14 19h4" stroke-width="1.4"/>',
  ricochet: '<path d="M4 26L12 8l8 14 8-16" fill="none"/><path d="M24 6h4v4" fill="none"/><circle cx="4" cy="26" r="2.5" fill="#000"/>',
  buck: '<circle cx="16" cy="10" r="3.5" fill="#000"/><circle cx="8" cy="16" r="3.5" fill="#000"/><circle cx="24" cy="16" r="3.5" fill="#000"/><circle cx="11" cy="24" r="3.5" fill="#000"/><circle cx="21" cy="24" r="3.5" fill="#000"/>',
  bang: '<rect x="8" y="12" width="14" height="16" rx="2"/><path d="M8 17h14M8 23h14" stroke-width="1.4"/><path d="M15 12q0-5 5-6" fill="none"/><path d="M23 3l1 3 3-1-2 3 3 2h-4l-1 3-1-3" fill="#000" stroke-width="1.2"/>',
  skewer: '<path d="M16 3v26" /><path d="M11 8l5-5 5 5" fill="none"/><circle cx="16" cy="13" r="4"/><circle cx="16" cy="23" r="4"/>',
  gold: '<path d="M11 9h10l-2 17h-6z" fill="#000"/><path d="M16 2v3M5 8l3 2M27 8l-3 2M4 18h3M28 18h-3" stroke-width="1.8"/>',
  magnet: '<path d="M7 5h6v12a3 3 0 0 0 6 0V5h6v12a9 9 0 0 1-18 0z"/><path d="M7 5h6v5H7zM19 5h6v5h-6z" fill="#000"/>',
  spanner: '<path d="M20 4a7 7 0 0 0-6 9L4 23l5 5 10-10a7 7 0 0 0 9-6l-4 2-4-4z"/>',
  soot: '<path d="M8 22a6 6 0 0 1 1-12 8 8 0 0 1 15 2 5 5 0 0 1 0 10z" fill="#000"/><circle cx="7" cy="27" r="1.6" fill="#000"/><circle cx="14" cy="28" r="1.2" fill="#000"/><circle cx="24" cy="27" r="1.8" fill="#000"/>',
  tube: '<rect x="3" y="11" width="26" height="10" rx="5"/><path d="M9 11v10M15 11v10M21 11v10" stroke-width="1.4"/>',
  pump: '<path d="M4 16h14" stroke-width="4"/><path d="M18 11h8v10h-8z"/><path d="M8 9l-4 7 4 7" fill="none"/>',
  steady: '<path d="M4 24l7-7 5 4 9-11" fill="none"/><path d="M20 10h5v5" fill="none"/>',
  pockets: '<path d="M6 7h20v11a10 10 0 0 1-20 0z"/><path d="M6 12h20" stroke-width="1.4"/><circle cx="16" cy="20" r="3" fill="#000"/>',
  lucky: '<path d="M8 6a8 8 0 0 0 0 20h4v-4h-4a4 4 0 0 1 0-12h16a4 4 0 0 1 0 12h-4v4h4a8 8 0 0 0 0-20z" transform="rotate(90 16 16)"/>',
  keen: '<path d="M3 16q13-12 26 0q-13 12-26 0z"/><circle cx="16" cy="16" r="5" fill="#000"/><circle cx="18" cy="14" r="1.5" fill="#fff" stroke="none"/>',
  ticket: '<path d="M4 9h24v4a3 3 0 0 0 0 6v4H4v-4a3 3 0 0 0 0-6z"/><path d="M20 9v14" stroke-dasharray="2 2" stroke-width="1.4"/>',
  token: '<circle cx="16" cy="16" r="12"/><circle cx="16" cy="16" r="7" fill="#000"/>',
  sound: '<path d="M5 12h5l7-6v20l-7-6H5z"/><path d="M21 11q4 5 0 10M24 8q7 8 0 16" fill="none"/>',
  mute: '<path d="M5 12h5l7-6v20l-7-6H5z"/><path d="M22 12l7 8M29 12l-7 8" fill="none"/>',
  music: '<path d="M12 24V8l14-3v16" fill="none"/><ellipse cx="9" cy="24" rx="4" ry="3" fill="#000"/><ellipse cx="23" cy="21" rx="4" ry="3" fill="#000"/>',
  crown: '<path d="M3 24l2-14 6 6 5-10 5 10 6-6 2 14z" fill="#000"/>',
};
const icon = (id, cls) => svg(ICON[id] || '', cls);
