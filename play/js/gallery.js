/* =====================================================================
   The rules, with no drawing: every target, the special shells, the
   slingshot upgrades, the rivals and their brains, the five booths and the
   machinery in them, and a round of shooting. Exposed as `E`.
   Nothing in here touches the page, so tools/check.js can run it in Node.
   ===================================================================== */
"use strict";
const E = (() => {

// ---------- tuning ----------
const W = 400, GH = 560, WH = 670;   // the booth in world units: 400 wide, back wall 560 tall, counter below
const ROUND = 40;                    // seconds in a round
const LAST_CALL = 10, LAST_SPEED = 1.35; // the last 10 seconds, the machinery runs faster
const COUNT = 3;                     // Ready, aim, fire
const MAG = 6, RELOAD = 1.1, PUMP = .12; // corks per load, seconds to reload, fastest you can pump
const NPC_RELOAD = 1.3;
// Shots fly: the ball lands this many seconds after it leaves the slingshot, and only then does it hit whatever is there.
// A full pull flies fastest (FLIGHT_MIN), a weak one slowest (FLIGHT_MAX). Rivals pull fairly hard (NPC_FLIGHT) and lead their targets.
const FLIGHT_MIN = .2, FLIGHT_MAX = .38, NPC_FLIGHT = .25;
const COMBO_EVERY = 3, COMBO_MAX = 3; // every 3 hits in a row adds x1, up to x3
const BELT = 4;                       // special shells you can carry
const FREEZE = 3, SOOT = 4;           // spanner and soot bomb, in seconds
const TAP_PAD = 5;                    // your taps get a little extra reach; fingers are fat
const TAU = Math.PI * 2;

// ---------- random ----------
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// The same numbers in always give the same number out, so a booth runs the same way for everyone on one seed.
function hash(...n) { let h = 2166136261; for (const x of n) { h ^= x | 0; h = Math.imul(h, 16777619); h ^= h >>> 13; } h = Math.imul(h ^ h >>> 16, 2246822507); h ^= h >>> 13; return (h >>> 0) / 4294967296; }
const lerp = (a, b, u) => a + (b - a) * u;

// ---------- targets ----------
// pts: points. sz: drawing size. rx, ry: how far from the middle a cork still counts.
// bad: black targets that cost points. hp: hits to knock down. fade: comes and goes. time: seconds added to the round. gift: gives a shell.
const T = {
  duck:     { name: 'Tin duck',       pts: 10, sz: 22, rx: 21, ry: 17 },
  rabbit:   { name: 'Rabbit',         pts: 15, sz: 22, rx: 17, ry: 21 },
  fish:     { name: 'Goldfish',       pts: 10, sz: 20, rx: 20, ry: 12 },
  bottle:   { name: 'Bottle',         pts: 10, sz: 20, rx: 10, ry: 21 },
  can:      { name: 'Tin can',        pts: 5,  sz: 17, rx: 12, ry: 14 },
  star:     { name: 'Star',           pts: 20, sz: 19, rx: 18, ry: 18 },
  moon:     { name: 'Moon',           pts: 25, sz: 19, rx: 16, ry: 19 },
  pig:      { name: 'Pig',            pts: 15, sz: 22, rx: 21, ry: 15 },
  owl:      { name: 'Owl',            pts: 20, sz: 21, rx: 15, ry: 20 },
  pipe:     { name: 'Clay pipe',      pts: 25, sz: 16, rx: 15, ry: 10 },
  bell:     { name: 'Bell',           pts: 30, sz: 20, rx: 18, ry: 18 },
  balloon:  { name: 'Balloon',        pts: 10, sz: 20, rx: 15, ry: 18 },
  bullseye: { name: 'Bullseye',       pts: 15, sz: 18, rx: 18, ry: 18 },
  croc:     { name: 'Crocodile',      pts: 20, sz: 26, rx: 25, ry: 10 },
  ghost:    { name: 'Ghost',          pts: 25, sz: 20, rx: 16, ry: 20, fade: true },
  chicken:  { name: 'Rubber chicken', pts: 10, sz: 21, rx: 16, ry: 20 },
  teapot:   { name: 'Teapot',         pts: 15, sz: 19, rx: 19, ry: 15 },
  bandit:   { name: 'Bandit',         pts: 20, sz: 20, rx: 16, ry: 20 },
  bat:      { name: 'Bat',            pts: 20, sz: 22, rx: 22, ry: 12 },
  ufo:      { name: 'Flying saucer',  pts: 50, sz: 24, rx: 24, ry: 13 },
  goose:    { name: 'Golden goose',   pts: 60, sz: 22, rx: 20, ry: 17, gold: true },
  clock:    { name: 'Wind-up clock',  pts: 5,  sz: 18, rx: 16, ry: 17, time: 3 },
  box:      { name: 'Mystery box',    pts: 5,  sz: 17, rx: 17, ry: 17, gift: true },
  knight:   { name: 'Tin knight',     pts: 40, sz: 20, rx: 15, ry: 20, hp: 2 },
  cactus:   { name: 'Cactus',         pts: 10, sz: 20, rx: 14, ry: 20 },
  rocket:   { name: 'Rocket',         pts: 30, sz: 22, rx: 22, ry: 10 },
  sheriff:  { name: 'The sheriff',    pts: -20, sz: 20, rx: 16, ry: 20, bad: true },
  tophat:   { name: "The barker's hat", pts: -25, sz: 18, rx: 17, ry: 18, bad: true },
  cat:      { name: 'The booth cat',  pts: -30, sz: 20, rx: 17, ry: 19, bad: true },
};

// ---------- special shells ----------
// Load one and your next cork is special. You carry up to 4.
const SHELLS = {
  ricochet: { name: 'Ricochet',    price: 6, text: 'After a hit it bounces on to 2 more targets.' },
  buck:     { name: 'Buckshot',    price: 6, text: '5 pellets at once, in a spread.' },
  bang:     { name: 'Firecracker', price: 8, text: 'Knocks down everything near where it lands, black targets too.' },
  skewer:   { name: 'Skewer',      price: 6, text: 'Goes through every target straight above and below where it lands.' },
  gold:     { name: 'Golden cork', price: 5, text: 'Whatever it hits is worth 3 times the points.' },
  magnet:   { name: 'Magnet',      price: 5, text: 'Finds the best target near your tap all by itself.' },
  spanner:  { name: 'Spanner',     price: 7, text: 'Jams the machinery. Everything stands still for 3 seconds.' },
  soot:     { name: 'Soot bomb',   price: 6, text: 'Soot in both rivals’ sights. They shoot slow and wild for 4 seconds.' },
};
const SHELL_IDS = Object.keys(SHELLS);

// ---------- slingshot upgrades (last the whole midway) ----------
const UPS = {
  tube:    { name: 'Cork bag',        price: 16, text: 'Hold 8 corks instead of 6.' },
  pump:    { name: 'Quick hands',     price: 14, text: 'Reload a third faster.' },
  steady:  { name: 'Steady streak',   price: 14, text: 'A miss only drops your streak one step, not all the way.' },
  pockets: { name: 'Deep pockets',    price: 12, text: 'Carry 6 shells instead of 4.' },
  lucky:   { name: 'Lucky horseshoe', price: 12, text: 'Mystery boxes give you 2 shells instead of 1.' },
  keen:    { name: 'Keen eye',        price: 18, text: 'Your streak can climb to x4.' },
};

// ---------- rivals ----------
// react: seconds to pick a target and aim. gap: seconds between shots. acc: how often an aimed cork hits.
// greed: how much they chase big points. use: how keen they are to load a shell. shells: what they bring.
const RIVALS = {
  timmy:   { name: 'Timmy Toffee', short: 'Timmy',      hat: 'cap',     blurb: 'Nine years old. Sticky fingers. Wants the duck.',       ai: { react: .95, gap: .55, acc: .55, greed: .3 } },
  nan:     { name: 'Nan Bramble', short: 'Nan',       hat: 'bonnet',  blurb: 'Has shot here every Saturday since 1961.',              ai: { react: .85, gap: .55, acc: .68, greed: .6 } },
  sal:     { name: 'Big Sal', short: 'Sal',           hat: 'bandana', blurb: 'Shoots fast. Aims later.',                              ai: { react: .66, gap: .38, acc: .6, greed: .4 } },
  percy:   { name: 'Percy Pips', short: 'Percy',        hat: 'bowler',  blurb: 'Only shoots the clay pipes. Mostly.',                   ai: { react: .72, gap: .45, acc: .72, greed: .9 } },
  kid:     { name: 'Kid Cactus', short: 'Kid',        hat: 'cowboy',  blurb: 'Quickest draw in the Dustbowl, he says.',               ai: { react: .64, gap: .34, acc: .64, greed: .5 } },
  lou:     { name: 'Lefty Lou', short: 'Lou',         hat: 'stetson', blurb: 'Plays dirty. Brought soot bombs.',                     ai: { react: .64, gap: .36, acc: .7, greed: .6, use: .5 }, shells: ['soot', 'soot'] },
  crank:   { name: 'Professor Crank', short: 'Crank',   hat: 'goggles', blurb: 'Built half this machinery. Knows how to jam it.',       ai: { react: .62, gap: .32, acc: .7, greed: .7, use: .3 }, shells: ['spanner', 'magnet'] },
  stella:  { name: 'Stella Wink', short: 'Stella',       hat: 'bow',     blurb: 'Never misses a star. Sometimes misses the moon.',       ai: { react: .6, gap: .3, acc: .72, greed: .55, use: .3 }, shells: ['gold'] },
  colonel: { name: 'Colonel Clockwork', short: 'Colonel', hat: 'helmet',  blurb: 'Ticks. Nobody knows why.',                              ai: { react: .56, gap: .28, acc: .75, greed: .6, use: .3 }, shells: ['bang', 'ricochet'] },
  dot:     { name: 'Deadeye Dot', short: 'Dot',       hat: 'feather', blurb: 'Champion of the Grand Gallery, 11 summers running.',    ai: { react: .54, gap: .3, acc: .8, greed: .75, use: .3 }, shells: ['ricochet', 'buck', 'soot'] },
};

// ---------- booths ----------
// Rigs are the machinery, back to front:
// rail: a chain that carries targets across and round again. pop: targets that pop up and duck down.
// wheel: a turning wheel. swing: a pendulum. float: balloons drifting up. fly: something rare crossing the top now and then.
const BOOTHS = [
  { id: 'pond', name: 'The Duck Pond', barker: 'Ma Pickett', bhat: 'scarf', wall: 'waves',
    line: 'Three rows of ducks, dearie. Knock down more than the two either side of you.',
    prize: { id: 'goldfish', name: 'A goldfish in a bag' }, rivals: ['timmy', 'nan'],
    rigs: [
      { k: 'rail', y: 130, dir: 1, speed: 42, gap: 78, pool: ['star', 'star', 'moon', 'bullseye'] },
      { k: 'fly', y: 72, every: 14, fly: 4, pool: ['goose'] },
      { k: 'rail', y: 275, dir: -1, speed: 52, gap: 70, pool: ['duck', 'duck', 'duck', 'rabbit', 'rabbit', 'box'] },
      { k: 'rail', y: 425, dir: 1, speed: 38, gap: 62, water: true, pool: ['duck', 'duck', 'duck', 'duck', 'fish', 'fish', 'box'] },
    ] },
  { id: 'cans', name: 'Tin Can Alley', barker: 'Rattles', bhat: 'boater', wall: 'bricks',
    line: 'Cans, bottles and my good teapot. Leave the cat alone, she lives here.',
    prize: { id: 'kazoo', name: 'A tin kazoo' }, rivals: ['sal', 'percy'],
    rigs: [
      { k: 'pop', y: 150, xs: [56, 128, 200, 272, 344], up: 1.7, hide: [.5, 2.6], pool: ['can', 'can', 'bottle', 'teapot', 'clock'] },
      { k: 'rail', y: 232, dir: -1, speed: 80, gap: 92, wire: true, pool: ['pipe', 'pipe', 'pipe', 'box'] },
      { k: 'pop', y: 340, xs: [56, 128, 200, 272, 344], up: 1.5, hide: [.5, 2.4], pool: ['can', 'bottle', 'bottle', 'teapot', 'box'] },
      { k: 'rail', y: 470, dir: 1, speed: 45, gap: 80, pool: ['can', 'bottle', 'pig', 'pig', 'cat'] },
    ] },
  { id: 'saloon', name: 'The Dustbowl Saloon', barker: 'Sheriff Tumble', bhat: 'sheriffhat', wall: 'planks',
    line: 'Bandits in the windows. Shoot the sheriff and it’ll cost you. I’m the sheriff.',
    prize: { id: 'badge', name: 'A tin sheriff’s star' }, rivals: ['kid', 'lou'],
    rigs: [
      { k: 'swing', x: 200, y: 20, len: 64, amp: .75, period: 2.6, pool: ['bell'] },
      { k: 'pop', y: 180, xs: [66, 156, 244, 334], up: 1.25, hide: [.6, 2.2], frame: true, pool: ['bandit', 'bandit', 'bandit', 'bandit', 'sheriff'] },
      { k: 'rail', y: 322, dir: 1, speed: 68, gap: 84, pool: ['bottle', 'bottle', 'cactus', 'chicken', 'box'] },
      { k: 'rail', y: 462, dir: -1, speed: 50, gap: 88, pool: ['cactus', 'chicken', 'croc', 'bottle'] },
    ] },
  { id: 'stars', name: 'Moon & Stars', barker: 'Madame Nyx', bhat: 'turban', wall: 'night',
    line: 'The wheel turns, the ghosts come and go. The saucer only visits once in a while.',
    prize: { id: 'moonb', name: 'A moon balloon' }, rivals: ['crank', 'stella'],
    rigs: [
      { k: 'fly', y: 66, every: 11, fly: 3.2, pool: ['ufo'] },
      { k: 'wheel', x: 200, y: 232, r: 112, n: 8, spin: .55, pool: ['star', 'star', 'moon', 'owl', 'bat'] },
      { k: 'float', n: 4, period: 8, pool: ['balloon', 'balloon', 'balloon', 'box'] },
      { k: 'rail', y: 452, dir: -1, speed: 60, gap: 80, pool: ['owl', 'bat', 'ghost', 'ghost', 'star'] },
    ] },
  { id: 'grand', name: 'The Grand Gallery', barker: 'The Ringmaster', bhat: 'tophat', wall: 'harlequin', champ: true,
    line: 'Everything at once, and the champion herself on your right. Don’t shoot my hat.',
    prize: { id: 'bear', name: 'The giant bear' }, rivals: ['colonel', 'dot'],
    rigs: [
      { k: 'swing', x: 200, y: 20, len: 48, amp: .6, period: 2.2, pool: ['bell'] },
      { k: 'rail', y: 100, dir: -1, speed: 88, gap: 74, pool: ['star', 'moon', 'bat', 'rocket'] },
      { k: 'wheel', x: 104, y: 250, r: 66, n: 6, spin: -.9, pool: ['bullseye', 'star', 'clock', 'bullseye'] },
      { k: 'pop', y: 250, xs: [252, 338], up: 1.2, hide: [.4, 1.8], frame: true, pool: ['bandit', 'knight', 'knight', 'tophat'] },
      { k: 'fly', y: 168, every: 13, fly: 3, pool: ['goose'] },
      { k: 'rail', y: 372, dir: 1, speed: 74, gap: 72, pool: ['duck', 'rabbit', 'pig', 'knight', 'croc', 'tophat', 'owl'] },
      { k: 'rail', y: 492, dir: -1, speed: 58, gap: 66, water: true, pool: ['duck', 'duck', 'fish', 'croc', 'box'] },
    ] },
];
const BOOTH = Object.fromEntries(BOOTHS.map((b, i) => [b.id, i]));

// ---------- the machinery ----------
const M = 44; // rails run this far past each side so targets change out of sight
function makeRig(g, idx) {
  const r = Object.assign({ idx, slots: [] }, g);
  let n = 1;
  if (g.k === 'rail') { r.L = W + 2 * M; n = Math.max(1, Math.round(r.L / g.gap)); r.step = r.L / n; }
  else if (g.k === 'pop') n = g.xs.length;
  else if (g.k === 'wheel' || g.k === 'float') n = g.n;
  for (let k = 0; k < n; k++) r.slots.push({ rig: r, k, type: null, cyc: null, down: false, kt: 0, hp: 1, by: -1, x: 0, y: 0, vx: 0, vis: false, up: 1, face: 1, alpha: 1, born: -9, cs: 0, pc: 0, left: 9 });
  return r;
}
function respawn(R, sl, c) {
  const pool = sl.rig.pool;
  sl.cyc = c; sl.type = pool[Math.floor(hash(R.seed, sl.rig.idx, sl.k, c) * pool.length)];
  sl.down = false; sl.hp = T[sl.type].hp || 1; sl.by = -1; sl.born = R.t;
}
// Where everything is, worked out from the machine clock (mt) alone. Two rounds on the same seed line up exactly.
function place(R) {
  const mt = R.mt;
  for (const r of R.rigs) for (const sl of r.slots) {
    const k = sl.k; let c = 0;
    sl.vis = true; sl.up = 1; sl.alpha = 1; sl.vx = 0; sl.left = 9;
    if (r.k === 'rail') {
      const u = k * r.step + r.dir * r.speed * mt;
      c = Math.floor(u / r.L); sl.x = u - c * r.L - M; sl.vx = r.dir * r.speed * (R.freeze > 0 ? 0 : R.rate);
      sl.y = r.y + (r.water ? Math.sin(mt * 2.2 + k * 1.7) * 3 : 0); sl.face = r.dir;
      sl.vis = sl.x > -26 && sl.x < W + 26;
    } else if (r.k === 'pop') {
      // cycles are laid end to end: hidden, rising, up, dropping
      const dur = cc => { const h = hash(R.seed, r.idx, k, cc, 7); return lerp(r.hide[0], r.hide[1], h) + .36 + r.up * lerp(.8, 1.2, hash(R.seed, r.idx, k, cc, 9)); };
      if (sl.cyc === null) { sl.pc = 0; sl.cs = -hash(R.seed, r.idx, k, 3) * 2; }
      while (mt >= sl.cs + dur(sl.pc)) { sl.cs += dur(sl.pc); sl.pc++; }
      c = sl.pc;
      const h = lerp(r.hide[0], r.hide[1], hash(R.seed, r.idx, k, c, 7)), upT = r.up * lerp(.8, 1.2, hash(R.seed, r.idx, k, c, 9)), p = mt - sl.cs;
      sl.up = p < h ? 0 : p < h + .18 ? (p - h) / .18 : p < h + .18 + upT ? 1 : Math.max(0, 1 - (p - h - .18 - upT) / .18);
      sl.left = Math.max(0, h + .18 + upT - p);
      sl.x = r.xs[k]; sl.y = r.y + (1 - sl.up) * 44; sl.vis = sl.up > .7;
    } else if (r.k === 'wheel') {
      const turn = r.spin * mt / TAU + k / r.n;
      c = Math.floor(turn + .25);
      const a = turn * TAU - Math.PI / 2;
      sl.x = r.x + Math.cos(a) * r.r; sl.y = r.y + Math.sin(a) * r.r;
    } else if (r.k === 'swing') {
      c = Math.floor(mt / (r.period * 2));
      const th = r.amp * Math.sin(TAU * mt / r.period);
      sl.x = r.x + Math.sin(th) * r.len; sl.y = r.y + Math.cos(th) * r.len; sl.th = th;
    } else if (r.k === 'float') {
      const u = mt / r.period + k / r.n; c = Math.floor(u);
      const f = u - c;
      sl.x = 44 + hash(R.seed, r.idx, k, c) * (W - 88) + Math.sin(mt * 1.3 + k) * 8; sl.y = GH + 30 - f * (GH + 70);
      sl.vis = sl.y > 40 && sl.y < GH - 10;
    } else if (r.k === 'fly') {
      c = Math.floor(mt / r.every);
      const d = hash(R.seed, r.idx, c) * (r.every - r.fly), p = (mt - c * r.every - d) / r.fly, dir = hash(R.seed, r.idx, c, 1) > .5 ? 1 : -1;
      sl.face = dir; sl.x = dir > 0 ? -40 + p * (W + 80) : W + 40 - p * (W + 80); sl.y = r.y + Math.sin(p * Math.PI * 3) * 10;
      sl.vx = dir * (W + 80) / r.fly;
      sl.vis = p > 0 && p < 1 && sl.x > -24 && sl.x < W + 24;
      if (!(p > 0 && p < 1)) sl.hide = true; else sl.hide = false;
    }
    if (c !== sl.cyc) respawn(R, sl, c);
    const ty = T[sl.type];
    if (ty.fade) { sl.alpha = .5 + .5 * Math.sin(mt * 1.7 + k * 2.1 + r.idx); if (sl.alpha < .45) sl.vis = false; }
  }
}
function eachSlot(R, f) { for (const r of R.rigs) for (const sl of r.slots) f(sl); }
const standing = sl => sl.vis && !sl.down;

// ---------- a round ----------
// o: { booth, seed, seats: [left, you, right] } where each seat is
// { kind: 'you' | 'npc' | 'ghost', name, hat, ai, shells, ups, ghost: recorded shots }
function newRound(o) {
  const B = BOOTHS[o.booth], seed = o.seed >>> 0;
  const R = { booth: o.booth, B, seed, rnd: rng(seed ^ 0x9e3779b9), t: -COUNT, mt: 0, rate: 1, left: ROUND, freeze: 0, phase: 'count', lastCall: false,
    rigs: B.rigs.map(makeRig), seats: [], ev: [], rec: [], air: [] };
  R.seats = o.seats.map((s, i) => makeSeat(R, s, i));
  place(R);
  return R;
}
function makeSeat(R, s, i) {
  const ups = s.ups || {}, mag = ups.tube ? 8 : MAG;
  return { i, kind: s.kind, name: s.name, short: s.short || s.name, hat: s.hat, ai: s.ai ? Object.assign({ use: 0 }, s.ai) : null, ups,
    score: 0, shots: 0, hits: 0, streak: 0, bestStreak: 0, mag, ammo: mag, reloadT: 0, reloadFull: 0, pumpT: 0,
    shells: (s.shells || []).slice(), load: null, sootT: 0, aim: null, cool: .4 + R.rnd() * .6,
    ax: i === 0 ? 110 : i === 2 ? 290 : 200, ay: 300, ghost: s.ghost || null, gi: 0, got: 0 };
}
const beltSize = S => S.ups.pockets ? 6 : BELT;
const comboMax = S => S.ups.keen ? 4 : COMBO_MAX;
function multOf(S) { return Math.min(comboMax(S), 1 + Math.floor(S.streak / COMBO_EVERY)); }
function reloadTime(S) { return S.kind === 'npc' ? NPC_RELOAD : RELOAD * (S.ups.pump ? .67 : 1); }

function step(R, dt) {
  if (R.phase === 'done') return;
  R.t += dt;
  if (R.phase === 'count') { if (R.t >= 0) { R.phase = 'go'; R.ev.push({ k: 'go' }); } place(R); return; }
  R.rate = R.left <= LAST_CALL ? LAST_SPEED : 1;
  if (R.freeze > 0) { R.freeze = Math.max(0, R.freeze - dt); if (!R.freeze) R.ev.push({ k: 'unjam' }); }
  else R.mt += dt * R.rate;
  R.left -= dt;
  if (!R.lastCall && R.left <= LAST_CALL) { R.lastCall = true; R.ev.push({ k: 'lastcall' }); }
  place(R);
  // how fast everything is moving right now, so the rivals can lead a target
  for (const r of R.rigs) for (const sl of r.slots) {
    const same = sl.pcyc === sl.cyc && dt > 0;
    if (r.k !== 'rail' && r.k !== 'fly') sl.vx = same ? (sl.x - sl.px) / dt : 0;
    sl.vy = same ? (sl.y - sl.py) / dt : 0;
    sl.px = sl.x; sl.py = sl.y; sl.pcyc = sl.cyc;
  }
  // balls in the air that have arrived
  // flight time runs on the machine clock (so a friend's replayed shot lands exactly where it did), but keeps going through a jam
  if (R.air.length) R.air = R.air.filter(a => (a.left -= R.freeze > 0 ? dt : dt * R.rate) > 0 || (land(R, a), false));
  for (const S of R.seats) {
    if (S.sootT > 0) S.sootT = Math.max(0, S.sootT - dt);
    if (S.pumpT > 0) S.pumpT -= dt;
    if (S.reloadT > 0) { S.reloadT -= dt; if (S.reloadT <= 0) { S.reloadT = 0; S.ammo = S.mag; R.ev.push({ k: 'loaded', seat: S.i }); } }
    if (S.kind === 'npc') think(R, S, dt);
    else if (S.kind === 'ghost') replay(R, S);
  }
  if (R.left <= 0) { R.left = 0; R.air.forEach(a => land(R, a)); R.air = []; R.phase = 'done'; R.ev.push({ k: 'end' }); } // anything still in the air lands at the bell
}

function startReload(R, S) {
  if (S.reloadT > 0 || S.ammo >= S.mag) return false;
  // a part-empty tube reloads quicker than an empty one
  S.reloadFull = reloadTime(S) * (.35 + .65 * (S.mag - S.ammo) / S.mag);
  S.reloadT = S.reloadFull; S.ammo = 0;
  R.ev.push({ k: 'reload', seat: S.i });
  return true;
}
function reload(R, i) { return R.phase === 'go' && startReload(R, R.seats[i]); }

// Load a shell into the next shot, or unload it if it's already loaded.
function loadShell(R, i, id) {
  const S = R.seats[i];
  if (S.load === id) { S.load = null; return null; }
  if (!S.shells.includes(id)) return null;
  S.load = id; return id;
}

// The player (or a ghost) lets fly at x, y. power: how hard the slingshot was pulled, 0 to 1.
function shoot(R, i, x, y, power = 1) {
  const S = R.seats[i];
  if (R.phase !== 'go' || S.reloadT > 0 || S.pumpT > 0) return false;
  if (S.ammo <= 0) { startReload(R, S); return false; }
  fire(R, S, x, y, S.kind === 'you' ? TAP_PAD : 0, lerp(FLIGHT_MAX, FLIGHT_MIN, Math.max(0, Math.min(1, power))));
  return true;
}
const flightFor = power => lerp(FLIGHT_MAX, FLIGHT_MIN, Math.max(0, Math.min(1, power)));

// The ball leaves now and lands after `flight` seconds; land() decides what it hit.
function fire(R, S, x, y, pad = 0, flight = 0, tgt = null) {
  S.ammo--; S.shots++; S.pumpT = PUMP; S.ax = x; S.ay = y;
  let shell = S.load; S.load = null;
  if (shell) { const j = S.shells.indexOf(shell); if (j >= 0) S.shells.splice(j, 1); else if (S.kind !== 'ghost') shell = null; }
  if (S.kind === 'you') R.rec.push({ mt: R.mt, fz: R.freeze, x, y, s: shell, f: flight });
  R.ev.push({ k: 'shot', seat: S.i, x, y, shell, flight: R.freeze > 0 ? flight : flight / R.rate });
  R.air.push({ S, x, y, shell, pad, left: flight, tgt });
  if (S.ammo <= 0) startReload(R, S);
}
function land(R, a) {
  const { S, x, y, shell, pad } = a;
  R.ev.push({ k: 'land', seat: S.i, x, y });
  const mult = multOf(S);
  const res = resolve(R, S, x, y, shell, mult, pad);
  const before = mult;
  if (res.bad) S.streak = 0;
  else if (res.good) { S.streak++; S.hits++; S.bestStreak = Math.max(S.bestStreak, S.streak); }
  else { S.streak = S.ups.steady ? Math.max(0, (multOf(S) - 2) * COMBO_EVERY) : 0; R.ev.push({ k: 'miss', seat: S.i, x, y }); }
  const after = multOf(S);
  if (after > before) R.ev.push({ k: 'combo', seat: S.i, mult: after });
  else if (after < before) R.ev.push({ k: 'drop', seat: S.i, mult: after });
}

function hitAt(R, x, y, pad) {
  let best = null, bd = 1;
  eachSlot(R, sl => {
    if (!standing(sl)) return;
    const t = T[sl.type], dx = (x - sl.x) / (t.rx + pad), dy = (y - sl.y) / (t.ry + pad), d = dx * dx + dy * dy;
    if (d <= bd) { bd = d; best = sl; }
  });
  return best;
}

function resolve(R, S, x, y, shell, mult, pad) {
  const out = { good: 0, bad: 0 };
  const hit = (sl, m) => { const r = knock(R, S, sl, m); if (r < 0) out.bad++; else out.good++; };
  if (shell === 'buck') {
    const got = new Set();
    [[0, 0], [-22, -9], [22, -9], [-13, 17], [13, 17]].forEach(([dx, dy]) => {
      const px = x + dx + (R.rnd() - .5) * 8, py = y + dy + (R.rnd() - .5) * 8, sl = hitAt(R, px, py, 0);
      R.ev.push({ k: 'pellet', seat: S.i, x: px, y: py });
      if (sl && !got.has(sl)) { got.add(sl); hit(sl, mult); }
    });
  } else if (shell === 'bang') {
    R.ev.push({ k: 'boom', seat: S.i, x, y });
    eachSlot(R, sl => { if (standing(sl) && Math.hypot(sl.x - x, sl.y - y) < 54 + T[sl.type].sz * .5) hit(sl, mult); });
  } else if (shell === 'skewer') {
    R.ev.push({ k: 'skewer', seat: S.i, x });
    eachSlot(R, sl => { if (standing(sl) && Math.abs(sl.x - x) < T[sl.type].rx * .8 + 6) hit(sl, mult); });
  } else if (shell === 'magnet') {
    let best = null, bs = 0;
    eachSlot(R, sl => { if (!standing(sl) || T[sl.type].bad) return; const d = Math.hypot(sl.x - x, sl.y - y); if (d > 120) return;
      const s = (T[sl.type].pts + 5) / (1 + d / 60); if (s > bs) { bs = s; best = sl; } });
    if (best) { R.ev.push({ k: 'pull', seat: S.i, x, y, tx: best.x, ty: best.y }); hit(best, mult); }
  } else {
    const sl = hitAt(R, x, y, pad);
    if (sl) hit(sl, shell === 'gold' ? mult * 3 : mult);
    if (sl && shell === 'ricochet') {
      let from = sl;
      for (let b = 0; b < 2; b++) {
        let next = null, nd = 175;
        eachSlot(R, o => { if (!standing(o) || T[o.type].bad) return; const d = Math.hypot(o.x - from.x, o.y - from.y); if (d < nd) { nd = d; next = o; } });
        if (!next) break;
        R.ev.push({ k: 'ric', seat: S.i, x: from.x, y: from.y, tx: next.x, ty: next.y });
        hit(next, mult); from = next;
      }
    }
  }
  if (shell === 'spanner') { R.freeze = FREEZE; R.ev.push({ k: 'jam', seat: S.i }); }
  if (shell === 'soot') R.seats.forEach(o => { if (o !== S) { o.sootT = SOOT; o.aim && (o.aim.t += .3); } }), R.ev.push({ k: 'soot', seat: S.i });
  return out;
}

// Knock one target. Returns the points (negative for black targets).
function knock(R, S, sl, mult) {
  const t = T[sl.type];
  if (sl.hp > 1) { sl.hp--; S.score += 5; R.ev.push({ k: 'dent', seat: S.i, x: sl.x, y: sl.y, pts: 5, type: sl.type }); return 5; }
  sl.down = true; sl.kt = R.t; sl.by = S.i;
  const pts = t.bad ? t.pts : t.pts * mult;
  S.score = Math.max(0, S.score + pts); S.got++;
  R.ev.push({ k: 'hit', seat: S.i, x: sl.x, y: sl.y, pts, type: sl.type, mult: t.bad ? 1 : mult });
  if (t.time) { R.left += t.time; R.ev.push({ k: 'time', seat: S.i, x: sl.x, y: sl.y, secs: t.time }); }
  if (t.gift) {
    const n = S.ups.lucky ? 2 : 1;
    for (let j = 0; j < n; j++) {
      const id = SHELL_IDS[Math.floor(R.rnd() * SHELL_IDS.length)];
      if (S.kind === 'ghost') continue;
      if (S.shells.length < beltSize(S)) { S.shells.push(id); R.ev.push({ k: 'gift', seat: S.i, x: sl.x, y: sl.y, shell: id }); }
      else R.ev.push({ k: 'full', seat: S.i, x: sl.x, y: sl.y });
    }
  }
  return pts;
}

// ---------- the rivals' brains ----------
function pick(R, S) {
  const ai = S.ai, side = S.i === 0 ? -1 : S.i === 2 ? 1 : 0;
  let best = null, bs = 0;
  eachSlot(R, sl => {
    if (!standing(sl)) return;
    const t = T[sl.type];
    if (t.bad || sl.x < 14 || sl.x > W - 14) return;
    if (sl.vx) { const fx = sl.x + sl.vx * ai.react * 1.1; if (fx < 4 || fx > W - 4) return; } // about to leave
    if (sl.rig.k === 'pop' && sl.left < ai.react * .9 + NPC_FLIGHT) return;                  // about to duck
    if (t.fade && sl.alpha < .7) return;
    const val = Math.max(4, t.pts + (t.gift ? 12 : 0) + (t.time ? 8 : 0) + (sl.hp > 1 ? -15 : 0));
    let sc = Math.pow(val, ai.greed) / (1 + Math.hypot(sl.x - S.ax, sl.y - S.ay) / 220);
    if (side) sc *= (side < 0 ? sl.x < W * .55 : sl.x > W * .45) ? 1.35 : 1;
    if (R.seats.some(o => o !== S && o.aim && o.aim.sl === sl)) sc *= .4;
    if (R.air.some(a => a.tgt === sl)) sc *= .15; // someone's ball is already on its way to it
    sc *= .7 + R.rnd() * .6;
    if (sc > bs) { bs = sc; best = sl; }
  });
  return best;
}
function think(R, S, dt) {
  if (R.phase !== 'go' || S.reloadT > 0) return;
  const ai = S.ai, soot = S.sootT > 0;
  if (S.ammo <= 0) { startReload(R, S); return; }
  if (S.aim) {
    const sl = S.aim.sl;
    if (standing(sl)) { const f = Math.min(1, dt * 10); S.ax += (sl.x - S.ax) * f; S.ay += (sl.y - S.ay) * f; }
    if ((S.aim.t -= dt) > 0) return;
    S.aim = null;
    if (!standing(sl)) {
      // somebody got there first: usually they hold fire and pick again
      if (R.rnd() < .65) { S.cool = .1; return; }
      fire(R, S, S.ax, S.ay, 0, NPC_FLIGHT);
    } else {
      const t = T[sl.type]; let x = sl.x + sl.vx * NPC_FLIGHT, y = sl.y + sl.vy * NPC_FLIGHT; // lead it: aim where it'll be when the ball arrives
      if (R.rnd() < ai.acc * (soot ? .5 : 1)) { x += (R.rnd() - .5) * t.rx * .7; y += (R.rnd() - .5) * t.ry * .7; }
      else { const a = R.rnd() * TAU, d = 1.15 + R.rnd() * 1.1; x += Math.cos(a) * t.rx * d; y += Math.sin(a) * t.ry * d; }
      fire(R, S, x, y, 0, NPC_FLIGHT, sl);
    }
    S.cool = ai.gap * (.8 + R.rnd() * .5) * (soot ? 1.6 : 1);
    return;
  }
  if ((S.cool -= dt) > 0) return;
  const sl = pick(R, S);
  if (!sl) { S.cool = .15; return; }
  if (S.shells.length && !S.load && R.rnd() < ai.use) {
    // soot is kept for when they're losing; anything else goes in whenever
    const behind = R.seats.some(o => o !== S && o.score > S.score);
    const id = S.shells.find(x => x !== 'soot' || (behind && R.t > 8));
    if (id) S.load = id;
  }
  S.aim = { sl, t: ai.react * (.8 + R.rnd() * .45) * (soot ? 1.5 : 1) };
}
// A friend's recorded round plays back on the machine clock, so their corks land where they landed.
// Shots taken while the machinery was jammed wait for the same moment in the jam.
function replay(R, S) {
  const g = S.ghost;
  while (S.gi < g.length && R.mt >= g[S.gi].mt - 1e-6 && R.freeze <= (g[S.gi].fz || 0) + 1e-3) {
    const s = g[S.gi++];
    S.load = s.s || null; S.ammo = S.mag;
    fire(R, S, s.x, s.y, TAP_PAD, s.f || 0);
  }
}

// ---------- after the round ----------
// Places, best first. Ties go to you: the barker is generous.
function results(R) {
  const order = R.seats.slice().sort((a, b) => b.score - a.score || (b.kind === 'you') - (a.kind === 'you'));
  const you = R.seats.find(s => s.kind === 'you');
  const place = order.indexOf(you);
  return { order, you, place, won: place === 0, tickets: tickets(you ? you.score : 0, place) };
}
const tickets = (score, place) => Math.floor(score / 25) + (place === 0 ? 10 : place === 1 ? 4 : 0);

// The two rivals at a booth, as seats.
function rivalSeat(id) { const r = RIVALS[id]; return { kind: 'npc', id, name: r.name, short: r.short, hat: r.hat, ai: r.ai, shells: r.shells || [] }; }

return { W, GH, WH, ROUND, LAST_CALL, BELT, MAG, T, SHELLS, SHELL_IDS, UPS, RIVALS, BOOTHS, BOOTH, rng, hash,
  newRound, step, shoot, flightFor, reload, loadShell, results, multOf, beltSize, comboMax, reloadTime, rivalSeat, standing, eachSlot };
})();
if (typeof module !== 'undefined') module.exports = E;
