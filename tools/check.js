// Tests the rules without a browser: every booth's targets exist, rounds on one seed run the same way twice,
// and a bot in your stool plays each booth against its rivals to see how often it wins.
// Run: node tools/check.js   (or: node tools/check.js quick)
"use strict";
const E = require('../play/js/gallery.js');
const quick = process.argv[2] === 'quick';
let bad = 0;
const fail = m => { bad++; console.log('FAIL ' + m); };

// every booth only uses targets and rivals that exist
E.BOOTHS.forEach(B => {
  B.rigs.forEach(r => r.pool.forEach(t => { if (!E.T[t]) fail(`${B.id}: no target called ${t}`); }));
  B.rivals.forEach(id => { if (!E.RIVALS[id]) fail(`${B.id}: no rival called ${id}`); });
});
Object.values(E.RIVALS).forEach(r => (r.shells || []).forEach(s => { if (!E.SHELLS[s]) fail(`${r.name}: no shell called ${s}`); }));

// Human-ish bots for the middle stool. A thoughtful player on a phone lands somewhere between these.
const BOTS = {
  casual: { react: .62, gap: .3, acc: .7, greed: .5, use: .5 },
  good:   { react: .5,  gap: .2, acc: .8, greed: .7, use: .5 },
};
function play(booth, seed, bot, shells) {
  const B = E.BOOTHS[booth];
  const seats = [E.rivalSeat(B.rivals[0]), { kind: 'npc', name: 'Bot', ai: bot, shells: shells || [] }, E.rivalSeat(B.rivals[1])];
  const R = E.newRound({ booth, seed, seats });
  let guard = 0;
  while (R.phase !== 'done' && guard++ < 100000) E.step(R, 1 / 60);
  return R;
}

// same seed, same round
{ const a = play(2, 1234, BOTS.good), b = play(2, 1234, BOTS.good);
  if (a.seats.map(s => s.score).join() !== b.seats.map(s => s.score).join()) fail('the same seed played out differently'); }

// the machinery lines up on the machine clock, so a friend's recorded corks land on the same targets
{ const B = E.BOOTHS[4];
  const rec = E.newRound({ booth: 4, seed: 99, seats: [{ kind: 'npc', ai: BOTS.good }, { kind: 'you', name: 'A' }, { kind: 'npc', ai: BOTS.good }] });
  // shoot the first standing target every half second
  let next = 0;
  while (rec.phase !== 'done') { E.step(rec, 1 / 60);
    if (rec.phase === 'go' && rec.t >= next) { next += .5; let tgt = null; E.eachSlot(rec, sl => { if (!tgt && E.standing(sl) && !E.T[sl.type].bad) tgt = sl; }); if (tgt) E.shoot(rec, 1, tgt.x, tgt.y); } }
  const you = rec.seats[1];
  const ghost = E.newRound({ booth: 4, seed: 99, seats: [{ kind: 'ghost', name: 'A', ghost: rec.rec }, { kind: 'you', name: 'B' }, { kind: 'ghost', name: 'A2', ghost: [] }] });
  while (ghost.phase !== 'done') E.step(ghost, 1 / 60);
  const gs = ghost.seats[0].score, ys = you.score;
  if (Math.abs(gs - ys) > ys * .15) fail(`a replayed round scored ${gs}, the original ${ys}`);
  else console.log(`Replay: original ${ys}, ghost ${gs}`);
}

const N = quick ? 30 : 150;
console.log(`\nBooth                 bot      win   2nd   3rd   bot score  rivals`);
E.BOOTHS.forEach((B, bi) => {
  Object.entries(BOTS).forEach(([bn, bot]) => {
    let pl = [0, 0, 0], ys = 0, rs = [0, 0];
    for (let s = 0; s < N; s++) {
      const R = play(bi, 1000 + s * 7919, bot, ['ricochet', 'buck']);
      const sc = R.seats.map(x => x.score), me = sc[1];
      const place = (sc[0] > me) + (sc[2] > me);
      pl[place]++; ys += me; rs[0] += sc[0]; rs[1] += sc[2];
    }
    const p = n => (Math.round(n / N * 100) + '%').padStart(5);
    console.log(`${B.name.padEnd(21)} ${bn.padEnd(7)} ${p(pl[0])} ${p(pl[1])} ${p(pl[2])}  ${String(Math.round(ys / N)).padStart(9)}  ${Math.round(rs[0] / N)} / ${Math.round(rs[1] / N)}`);
  });
});
console.log(bad ? `\n${bad} problem(s)` : '\nAll good');
process.exit(bad ? 1 : 0);
