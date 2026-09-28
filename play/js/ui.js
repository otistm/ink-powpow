/* =====================================================================
   Shared helpers: the save, the midway in progress, animation helpers,
   screens, overlay cards, banners, one-time tips and the sound toggles.
   ===================================================================== */
"use strict";
const $ = id => document.getElementById(id);
const RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- save ----------
// Saved progress. The key keeps the game's old name (Ink Gallery) on purpose. Never rename this key or remove a field, or players lose their prizes.
// { prizes: [5 bools, one per booth in BOOTHS order], bears, best: { boothId: score }, tips: {}, snd, mus, friends: [names] }
const SAVE_KEY = 'inkgallery-save';
function loadSave() { try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch (e) { return {}; } }
function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }
const save = loadSave();
save.prizes = save.prizes || [];
while (save.prizes.length < E.BOOTHS.length) save.prizes.push(false);
save.bears = save.bears || 0;
save.best = save.best || {};
save.tips = save.tips || {};
if (save.snd === undefined) save.snd = true;
if (save.mus === undefined) save.mus = true;
save.friends = save.friends || ['', '', '', ''];

// The walk down the midway in progress, saved between booths (not mid-round: a round is only 40 seconds).
// { v: 1, run: { booth, tokens, tickets, shells, ups, seed, scores }, phase: 'intro' | 'cart' }
const RUN_KEY = 'inkgallery-run';
let run = null;
function newRun() { return { booth: 0, tokens: 3, tickets: 10, shells: ['ricochet', 'ricochet', 'buck'], ups: {}, seed: (Math.random() * 1e9) >>> 0, scores: [], tries: 0 }; }
function saveRun(phase) { try { localStorage.setItem(RUN_KEY, JSON.stringify({ v: 1, run, phase, at: Date.now() })); } catch (e) {} }
function loadRun() { try { const o = JSON.parse(localStorage.getItem(RUN_KEY)); return o && o.v === 1 && o.run ? o : null; } catch (e) { return null; } }
function clearRun() { try { localStorage.removeItem(RUN_KEY); } catch (e) {} }

// ---------- motion ----------
function anim(el, frames, dur, ease = 'cubic-bezier(.3,1.5,.5,1)') {
  if (!el || !el.animate) return Promise.resolve();
  const a = el.animate(frames, { duration: RM ? 1 : dur, easing: ease });
  return a.finished.catch(() => {});
}
// Squash, stretch, settle: the bump every Ink game uses.
const squash = el => anim(el, [
  { transform: 'scale(1)' }, { transform: 'scale(1.18,.84)', offset: .3 }, { transform: 'scale(.94,1.08)', offset: .55 }, { transform: 'scale(1.03,.98)', offset: .78 }, { transform: 'scale(1)' }], 380, 'ease-out');
const nope = el => anim(el, [{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }], 260, 'linear');

function show(id) { document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id)); }
function sheet(html, dismissable = true) {
  const p = $('sheet');
  p.innerHTML = html;
  $('veil').classList.add('on');
  p.style.animation = 'none'; void p.offsetHeight; p.style.animation = '';
  $('veil').onclick = e => { if (dismissable && e.target === $('veil')) closeSheet(); };
}
const closeSheet = () => $('veil').classList.remove('on');

let bannerT = 0;
// mini: a smaller one during play that doesn't hide the targets
function banner(big, small = '', ms = 1000, mini = false) {
  const b = $('banner');
  b.classList.toggle('mini', mini);
  b.innerHTML = `<b>${big}</b>${small ? `<small>${small}</small>` : ''}`;
  b.classList.add('on');
  anim(b, [{ transform: 'translate(-50%,-50%) scale(.5,1.4)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1.1,.9)', opacity: 1, offset: .5 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }], 320, 'ease-out');
  clearTimeout(bannerT); bannerT = setTimeout(() => b.classList.remove('on'), ms);
}

// A short tip shown once ever, the first time something happens. It doesn't stop the round.
function tipOnce(key, html) {
  if (save.tips[key]) return;
  save.tips[key] = 1; writeSave();
  const t = $('tip');
  t.innerHTML = `${html}<button class="linkbtn" type="button">Got it</button>`;
  t.classList.add('on');
  t.querySelector('button').onclick = () => t.classList.remove('on');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 6000);
  anim(t, [{ transform: 'translateY(20px) scale(.9,1.1)', opacity: 0 }, { transform: 'translateY(-3px) scale(1.02,.98)', opacity: 1, offset: .6 }, { transform: 'none', opacity: 1 }], 450, 'ease-out');
}
const hideTip = () => $('tip').classList.remove('on');

// ---------- sound toggles ----------
function soundToggles() {
  return `<button class="tog${save.snd ? ' on' : ''}" data-t="snd" type="button">${icon(save.snd ? 'sound' : 'mute')}<span>Sounds ${save.snd ? 'on' : 'off'}</span></button>
          <button class="tog${save.mus ? ' on' : ''}" data-t="mus" type="button">${icon('music')}<span>Music ${save.mus ? 'on' : 'off'}</span></button>`;
}
function wireToggles(after) {
  document.querySelectorAll('.tog').forEach(b => b.onclick = () => {
    audioInit(); save[b.dataset.t] = !save[b.dataset.t]; writeSave(); musicVolume();
    const wrap = b.parentElement; wrap.innerHTML = soundToggles(); wireToggles(after); if (after) after();
  });
}

const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const place = n => ['1st', '2nd', '3rd', '4th'][n] || (n + 1) + 'th';
