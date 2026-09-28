/* =====================================================================
   Sound, all made on the fly: cork pops (your rivals' come from their
   side of you), tin clanks, bells, a sad trombone for black targets, and
   a band-organ waltz that speeds up at last call.
   ===================================================================== */
"use strict";
let AC = null, OUT = null, MUS = null;
function audioInit() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); OUT = AC.createGain(); OUT.gain.value = .9; OUT.connect(AC.destination); } catch (e) { return; } }
  if (AC.state === 'suspended') AC.resume();
}
function dest(pan) {
  if (!pan || !AC.createStereoPanner) return OUT;
  const p = AC.createStereoPanner(); p.pan.value = pan; p.connect(OUT); return p;
}
function tone(f, d, type = 'sine', v = .1, f2, pan, at = 0) {
  if (!AC || !save.snd) return;
  const t = AC.currentTime + at, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
  o.connect(g).connect(dest(pan)); o.start(t); o.stop(t + d + .02);
}
let NB = null;
function noise(d, v, fc, q = 1, pan, at = 0, type = 'bandpass') {
  if (!AC || !save.snd) return;
  if (!NB) { const n = AC.sampleRate; NB = AC.createBuffer(1, n, n); const a = NB.getChannelData(0); for (let i = 0; i < n; i++) a[i] = Math.random() * 2 - 1; }
  const t = AC.currentTime + at, s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = NB; f.type = type; f.frequency.value = fc; f.Q.value = q;
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
  s.connect(f).connect(g).connect(dest(pan)); s.start(t, Math.random() * .5); s.stop(t + d + .02);
}
const SEAT_PAN = [-.7, 0, .7];
function sfx(k, seat = 1, p = 1) {
  const pan = SEAT_PAN[seat], v = seat === 1 ? 1 : .45;
  switch (k) {
    case 'pop': noise(.07, .5 * v, 2200, .8, pan); tone(320, .08, 'triangle', .22 * v, 90, pan); break;
    case 'twang': tone(150, .16, 'triangle', .26 * v, 70, pan); tone(420, .09, 'sawtooth', .04 * v, 160, pan); noise(.06, .35 * v, 900, 1.2, pan); break; // the rubber band letting go
    case 'tin': tone(1480 + Math.random() * 300, .16, 'square', .045 * v, null, pan); tone(2300 + Math.random() * 400, .12, 'triangle', .07 * v, null, pan); noise(.05, .2 * v, 4000, 2, pan); break;
    case 'clank': tone(420, .25, 'square', .06 * v, 380, pan); tone(900, .2, 'triangle', .08 * v, null, pan); noise(.08, .3 * v, 1500, 1.5, pan); break;
    case 'bell': [880, 1320, 2640].forEach((f, i) => tone(f, 1.4 - i * .3, 'sine', .14 / (i + 1) * v, null, pan)); break;
    case 'balloon': noise(.12, .6 * v, 1200, .5, pan); break;
    case 'miss': noise(.06, .22 * v, 500, 1, pan); tone(140, .06, 'sine', .12 * v, 80, pan); break;
    case 'bad': tone(330, .22, 'sawtooth', .06 * v, 311, pan); tone(247, .5, 'sawtooth', .06 * v, 220, pan, .22); break;
    case 'reload': noise(.04, .3 * v, 2500, 3, pan); noise(.05, .35 * v, 1400, 3, pan, .12); break;
    case 'loaded': tone(1200, .04, 'square', .03 * v, null, pan); break;
    case 'empty': tone(1800, .03, 'square', .03); break;
    case 'combo': [0, 4, 7, 12].slice(0, p + 1).forEach((s, i) => tone(523 * Math.pow(2, s / 12), .12, 'triangle', .12, null, 0, i * .06)); break;
    case 'drop': tone(400, .15, 'triangle', .07, 300); break;
    case 'gift': [0, 7, 12, 19].forEach((s, i) => tone(784 * Math.pow(2, s / 12), .1, 'sine', .1 * v, null, pan, i * .05)); break;
    case 'boom': noise(.5, .8 * v, 300, .6, pan, 0, 'lowpass'); tone(90, .4, 'sine', .4 * v, 40, pan); break;
    case 'jam': tone(200, .3, 'square', .05, 70); noise(.3, .3, 800, 4); break;
    case 'soot': noise(.4, .4, 400, .8, pan); tone(180, .3, 'sawtooth', .04, 120, pan); break;
    case 'time': tone(1600, .05, 'square', .04); tone(1200, .05, 'square', .04, null, 0, .12); break;
    case 'beep': tone(660, .15, 'square', .06); break;
    case 'go': tone(1320, .12, 'square', .07); tone(1760, .3, 'square', .06, null, 0, .1); break;
    case 'lastcall': [0, .18, .36].forEach(t => tone(988, .5, 'sine', .15, null, 0, t)); break;
    case 'end': sfx('bell'); tone(523, .6, 'triangle', .1, null, 0, .1); break;
    case 'win': [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, .25, 'triangle', .15, null, 0, i * .11)); break;
    case 'lose': [392, 370, 349, 330].forEach((f, i) => tone(f, .35, 'sawtooth', .05, null, 0, i * .3)); break;
    case 'buy': tone(660, .08, 'square', .06); tone(990, .16, 'triangle', .12, null, 0, .07); break;
    case 'nope': tone(180, .15, 'square', .06, 120); break;
    case 'tick': tone(900, .03, 'sine', .06); break;
  }
}

// ---------- the band organ ----------
// An original waltz in 3/4. Each bar: the chord, then the tune as [midi note, beats].
const TUNE = [
  ['C', [[72, 1], [76, 1], [79, 1]]], ['C', [[84, 2], [79, 1]]], ['G', [[83, 1], [81, 1], [79, 1]]], ['G', [[74, 3]]],
  ['G', [[71, 1], [74, 1], [77, 1]]], ['G', [[83, 2], [81, 1]]], ['C', [[79, 1], [77, 1], [76, 1]]], ['C', [[72, 3]]],
  ['F', [[77, 1], [81, 1], [84, 1]]], ['F', [[81, 2], [77, 1]]], ['C', [[79, 1], [76, 1], [72, 1]]], ['A', [[76, 3]]],
  ['D', [[74, 1], [77, 1], [81, 1]]], ['G', [[79, 1], [77, 1], [74, 1]]], ['G', [[71, 1], [74, 1], [79, 1]]], ['C', [[72, 2], [0, 1]]],
];
const CHORD = { C: [48, 64, 67], G: [43, 62, 65], F: [41, 65, 69], A: [45, 64, 69], D: [50, 65, 69] };
const mf = m => 440 * Math.pow(2, (m - 69) / 12);
function organNote(f, t, d, v, type = 'square') {
  const o = AC.createOscillator(), o2 = AC.createOscillator(), g = AC.createGain(), lp = AC.createBiquadFilter();
  o.type = type; o2.type = 'triangle'; o.frequency.value = f; o2.frequency.value = f * 2.005;
  lp.type = 'lowpass'; lp.frequency.value = 2200;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .015); g.gain.setValueAtTime(v * .8, t + d * .6); g.gain.exponentialRampToValueAtTime(.0001, t + d);
  o.connect(lp); o2.connect(lp); lp.connect(g).connect(MUS.gain); o.start(t); o2.start(t); o.stop(t + d + .02); o2.stop(t + d + .02);
}
function musicStart() {
  audioInit(); if (!AC) return;
  if (MUS && MUS.on) return;
  if (!MUS) { const gain = AC.createGain(); gain.gain.value = .0001; gain.connect(OUT); MUS = { gain, on: false, bar: 0, next: 0, tempo: 150, timer: 0 }; }
  MUS.on = true; MUS.bar = 0; MUS.next = AC.currentTime + .1;
  MUS.gain.gain.setTargetAtTime(save.mus ? .05 : .0001, AC.currentTime, .3);
  const sched = () => {
    if (!MUS.on) return;
    while (MUS.next < AC.currentTime + .4) {
      const beat = 60 / MUS.tempo, [ch, notes] = TUNE[MUS.bar % TUNE.length], c = CHORD[ch], t0 = MUS.next;
      // oom-pah-pah
      organNote(mf(c[0]), t0, beat * .9, .5, 'triangle');
      [1, 2].forEach(b => { organNote(mf(c[1]), t0 + b * beat, beat * .45, .18); organNote(mf(c[2]), t0 + b * beat, beat * .45, .18); });
      let bt = 0; notes.forEach(([m, n]) => { if (m) organNote(mf(m), t0 + bt * beat, n * beat * .92, .32); bt += n; });
      MUS.next += beat * 3; MUS.bar++;
    }
    MUS.timer = setTimeout(sched, 120);
  };
  sched();
}
function musicTempo(bpm) { if (MUS) MUS.tempo = bpm; }
function musicStop() { if (!MUS || !MUS.on) return; MUS.on = false; clearTimeout(MUS.timer); MUS.gain.gain.setTargetAtTime(.0001, AC.currentTime, .15); }
function musicVolume() { if (MUS && AC) MUS.gain.gain.setTargetAtTime(MUS.on && save.mus ? .05 : .0001, AC.currentTime, .2); }
