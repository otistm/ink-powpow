/* =====================================================================
   The screens around the shooting: home, the booth intro, results, the
   shell cart, the grand prize, how to play, single booths, and Pass the
   slingshot (friends taking turns on one phone).
   ===================================================================== */
"use strict";
const HATS_FRIENDS = ['none', 'cap', 'bow', 'goggles'];

// ---------- home ----------
function renderTitle() {
  show('title');
  const saved = loadRun();
  const won = save.prizes.filter(Boolean).length;
  $('shelf').innerHTML = E.BOOTHS.map((B, i) => `<figure class="prize${save.prizes[i] ? ' won' : ''}"><img src="${prizeURL(B.prize.id, !save.prizes[i])}" alt="${save.prizes[i] ? B.prize.name : 'Not won yet'}">${i === 4 && save.bears > 1 ? `<b class="x2">×${save.bears}</b>` : ''}</figure>`).join('');
  $('shelfNote').textContent = won ? `${plural(won, 'prize')} of 5 won` : 'Win a booth to put its prize on your shelf';
  const R0 = saved && saved.run;
  $('mainBtn').innerHTML = R0 ? `Carry on<small>${saved.phase === 'cart' ? 'At the shell cart' : E.BOOTHS[R0.booth].name} · booth ${R0.booth + 1} of 5</small>` : 'Walk the midway<small>5 booths, 3 tokens, 1 giant bear</small>';
  $('mainBtn').onclick = () => { audioInit(); if (R0) { run = R0; saved.phase === 'cart' ? cart() : boothIntro(); } else startRun(); };
  $('booths').innerHTML = E.BOOTHS.map((B, i) => `
    <button class="event" data-b="${i}" style="animation-delay:${i * 50}ms">
      <img class="bf" src="${faceURL(B.bhat)}" alt="">
      <span class="ev"><b>${B.name}</b><i>${B.barker} · ${E.RIVALS[B.rivals[0]].name} and ${E.RIVALS[B.rivals[1]].name}</i>
      <span>${save.best[B.id] ? `Best score <strong>${save.best[B.id]}</strong>` : 'Not played yet'}</span></span>
    </button>`).join('') + `
    <button class="event friends" id="friendsBtn" style="animation-delay:${E.BOOTHS.length * 50}ms">
      <span class="fr">${faceImg('cap', 'bf')}${faceImg('bow', 'bf')}</span>
      <span class="ev"><b>Pass the slingshot</b><i>2 to 4 friends, one phone</i>
      <span>Take turns. Whoever went before you sits beside you, shooting exactly as they did.</span></span>
    </button>`;
  $('booths').querySelectorAll('[data-b]').forEach(b => b.onclick = () => { audioInit(); freePlay(+b.dataset.b); });
  $('friendsBtn').onclick = () => { audioInit(); friendsSetup(); };
  $('howBtn').onclick = howTo;
  $('homeToggles').innerHTML = soundToggles(); wireToggles();
}

// ---------- the midway ----------
function startRun() { run = newRun(); saveRun('intro'); boothIntro(); }
function progDots(n) {
  return `<div class="prog">${E.BOOTHS.map((B, i) => i === 4 ? `<i class="crown${i < n ? ' done' : i === n ? ' now' : ''}">${icon('crown')}</i>` : `<i class="${i < n ? 'done' : i === n ? 'now' : ''}"></i>`).join('')}</div>`;
}
const tokensHtml = n => `<span class="tokens">${[0, 1, 2].map(i => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`;
const beltHtml = shells => shells.length ? `<span class="minibelt">${shells.map(s => `<span title="${E.SHELLS[s].name}">${icon(s)}</span>`).join('')}</span>` : '<span class="sub">No shells</span>';
function boothIntro() {
  const B = E.BOOTHS[run.booth], [l, r] = B.rivals.map(id => E.RIVALS[id]);
  show('intro');
  $('introPanel').innerHTML = `
    ${progDots(run.booth)}
    <p class="evn">Booth ${run.booth + 1} of 5${B.champ ? ' · the champion’s booth' : ''}</p>
    <h2>${B.name}</h2>
    <div class="barker">${faceImg(B.bhat, 'bigface')}<p><b>${B.barker}:</b> “${B.line}”</p></div>
    <div class="rivals">
      ${[[l, 'On your left'], [r, 'On your right']].map(([x, side]) => `<div class="rival">${faceImg(x.hat, 'face')}<b>${x.name}</b><small>${side}</small><span>${x.blurb}</span></div>`).join('')}
    </div>
    <div class="lifeRow">${tokensHtml(run.tokens)}<span>${plural(run.tokens, 'token')} left. Lose a booth and it costs one.</span></div>
    <div class="lifeRow">${beltHtml(run.shells)}<span class="tk">${icon('ticket')} ${run.tickets}</span></div>
    <button class="btn" id="stepUp" type="button">Step up</button>
    <button class="linkbtn" id="introHome" type="button">Back to the home screen</button>`;
  $('stepUp').onclick = () => { audioInit(); playRunRound(); };
  $('introHome').onclick = renderTitle;
}
function youSeat(shells, ups) { return { kind: 'you', name: 'You', hat: 'none', shells, ups: ups || {} }; }
function playRunRound() {
  const B = E.BOOTHS[run.booth];
  startRound({
    booth: run.booth, seed: (run.seed + run.booth * 1013 + run.tries * 7) >>> 0,
    seats: [E.rivalSeat(B.rivals[0]), youSeat(run.shells, run.ups), E.rivalSeat(B.rivals[1])],
    onEnd: runEnd, quitLabel: 'Leave the booth (no token lost)', onQuit: () => { saveRun('intro'); boothIntro(); },
  });
}
function boardHtml(R, res, labels) {
  return `<div class="board">${res.order.map((S, i) => `<div class="row${S.kind === 'you' ? ' me' : ''}" style="animation-delay:${i * 90}ms">
      <span class="nm">${place(i)} · ${esc(S.name)}<small>${S.got} knocked down · best streak ${S.bestStreak}${labels && labels[S.i] ? ' · ' + labels[S.i] : ''}</small></span><b>${S.score}</b></div>`).join('')}</div>`;
}
function bestScore(B, s) { if (s > (save.best[B.id] || 0)) { save.best[B.id] = s; writeSave(); return true; } return false; }
function runEnd(R, res) {
  const B = E.BOOTHS[run.booth], you = res.you;
  run.shells = you.shells.slice(0, E.beltSize(you));
  run.tickets += res.tickets;
  const best = bestScore(B, you.score);
  let html = '', after;
  if (res.won) {
    const first = !save.prizes[run.booth];
    save.prizes[run.booth] = true; writeSave();
    if (run.booth === 4) {
      save.bears++; writeSave(); clearRun();
      html = `<div class="award"><img class="troph" src="${prizeURL('bear')}" alt=""><p>The giant bear is yours</p></div>
        <h2>You beat the champion</h2>
        <p>You walked the whole midway and out-shot Deadeye Dot. ${save.bears > 1 ? `That’s ${save.bears} bears now.` : 'Everyone on the midway saw you carry it home.'}</p>
        ${boardHtml(R, res)}
        <button class="btn" id="nextBtn" type="button">Take it home</button>`;
      after = renderTitle;
    } else {
      run.booth++; run.tries = 0; saveRun('cart');
      html = `${first ? `<div class="award"><img class="troph" src="${prizeURL(B.prize.id)}" alt=""><p>${B.prize.name}</p></div>` : ''}
        <h2>You won ${B.name}</h2>
        ${boardHtml(R, res)}
        <p class="resnote">${icon('ticket', 'ico in')} +${res.tickets} tickets${best ? ' · new best score' : ''}</p>
        <button class="btn" id="nextBtn" type="button">To the shell cart</button>`;
      after = cart;
    }
  } else {
    run.tokens--; run.tries++;
    if (run.tokens <= 0) {
      clearRun();
      html = `<h2>The fair’s closing</h2><p>Out of tokens at ${B.name}. The lights go off one by one.</p>
        ${boardHtml(R, res)}
        <p class="resnote">You got to booth ${run.booth + 1} of 5.</p>
        <button class="btn" id="nextBtn" type="button">Home</button>`;
      after = renderTitle;
    } else {
      saveRun('intro');
      html = `<h2>${res.place === 1 ? 'So close' : 'Out-shot'}</h2><p>${esc(res.order[0].name)} takes ${B.name}. That costs a token.</p>
        ${boardHtml(R, res)}
        <div class="lifeRow center">${tokensHtml(run.tokens)}<span>${plural(run.tokens, 'token')} left</span></div>
        <p class="resnote">${icon('ticket', 'ico in')} +${res.tickets} tickets${best ? ' · new best score' : ''}</p>
        <button class="btn" id="nextBtn" type="button">Try again</button>`;
      after = boothIntro;
    }
  }
  sheet(html, false);
  $('nextBtn').onclick = () => { closeSheet(); after(); };
}

// ---------- the shell cart ----------
function cart() {
  show('cart');
  const B = E.BOOTHS[run.booth], rr = E.rng(run.seed + run.booth * 31);
  const shells = E.SHELL_IDS.slice().sort(() => rr() - .5).slice(0, 4);
  const ups = Object.keys(E.UPS).filter(u => !run.ups[u]).sort(() => rr() - .5).slice(0, 2);
  run.sold = run.sold || {};
  const soldKey = id => run.booth + ':' + id;
  const draw = () => {
    const full = run.shells.length >= (run.ups.pockets ? 6 : E.BELT);
    $('cartTickets').innerHTML = `${icon('ticket')} ${run.tickets}`;
    $('goods').innerHTML = [...shells.map(id => ['s', id]), ...ups.map(id => ['u', id])].map(([k, id], i) => {
      const it = k === 's' ? E.SHELLS[id] : E.UPS[id], sold = run.sold[soldKey(id)], price = it.price;
      const can = !sold && run.tickets >= price && !(k === 's' && full);
      return `<button class="good${sold ? ' sold' : ''}${k === 'u' ? ' up' : ''}" data-k="${k}" data-id="${id}" ${can ? '' : 'disabled'} style="animation-delay:${i * 60}ms">
        <span class="gi">${icon(id)}</span><span class="gt"><b>${it.name}</b><small>${k === 'u' ? 'Slingshot upgrade, for the rest of the midway. ' : ''}${it.text}</small></span>
        <span class="price">${sold ? 'Sold' : `${icon('ticket')}${price}`}</span></button>`;
    }).join('');
    $('cartBelt').innerHTML = `<span class="sub">Your belt ${run.shells.length} of ${run.ups.pockets ? 6 : E.BELT}${full ? ' (full)' : ''}</span>${beltHtml(run.shells)}`;
    $('goods').querySelectorAll('.good').forEach(b => b.onclick = () => {
      const k = b.dataset.k, id = b.dataset.id, it = k === 's' ? E.SHELLS[id] : E.UPS[id];
      if (run.tickets < it.price) { nope(b); sfx('nope'); return; }
      run.tickets -= it.price; run.sold[soldKey(id)] = 1;
      if (k === 's') run.shells.push(id); else run.ups[id] = true;
      sfx('buy'); saveRun('cart'); draw(); squash($('cartTickets'));
    });
  };
  draw();
  $('cartNote').textContent = `Next: ${B.name}. Spend your tickets on shells, or fix up your slingshot.`;
  $('cartGo').textContent = `On to ${B.name}`;
  $('cartGo').onclick = () => { saveRun('intro'); boothIntro(); };
  $('cartHome').onclick = renderTitle;
}

// ---------- a single booth ----------
function freePlay(b) {
  const B = E.BOOTHS[b], seed = (Math.random() * 1e9) >>> 0;
  const go = () => startRound({
    booth: b, seed: (Math.random() * 1e9) >>> 0,
    seats: [E.rivalSeat(B.rivals[0]), youSeat(['ricochet', 'buck', 'bang']), E.rivalSeat(B.rivals[1])],
    onEnd: (R, res) => {
      const best = bestScore(B, res.you.score);
      sheet(`<h2>${res.won ? 'You won!' : res.place === 1 ? 'So close' : 'Out-shot'}</h2><p>${B.name}</p>${boardHtml(R, res)}
        <p class="resnote">${best ? 'New best score!' : `Your best here: ${save.best[B.id]}`}</p>
        <button class="btn" id="againBtn" type="button">Again</button><button class="btn ghost" id="homeBtn" type="button">Home</button>`, false);
      $('againBtn').onclick = () => { closeSheet(); go(); };
      $('homeBtn').onclick = () => { closeSheet(); renderTitle(); };
    },
    restart: () => go(), quitLabel: 'Back to the home screen', onQuit: renderTitle,
  });
  go();
}

// ---------- pass the slingshot ----------
let FR = null;
function friendsSetup() {
  const st = { n: 2, booth: 0 };
  const draw = () => {
    sheet(`<h2>Pass the slingshot</h2>
      <p>Take turns on this phone. Whoever went before you sits beside you, shooting exactly as they did. Highest score wins.</p>
      <p class="evn">How many?</p>
      <div class="seg" id="segN">${[2, 3, 4].map(n => `<button class="${st.n === n ? 'on' : ''}" data-n="${n}" type="button">${n}</button>`).join('')}</div>
      <div class="names">${Array.from({ length: st.n }, (_, i) => `<label>${faceImg(HATS_FRIENDS[i], 'pf')}<input id="fn${i}" maxlength="14" placeholder="Player ${i + 1}" value="${esc(save.friends[i] || '')}"></label>`).join('')}</div>
      <p class="evn">Which booth?</p>
      <div class="seg wrap" id="segB">${E.BOOTHS.map((B, i) => `<button class="${st.booth === i ? 'on' : ''}" data-b="${i}" type="button">${B.name.replace(/^The /, '')}</button>`).join('')}</div>
      <button class="btn" id="frGo" type="button">Start</button>
      <button class="linkbtn" id="frX" type="button">Not now</button>`);
    const keep = () => { for (let i = 0; i < st.n; i++) save.friends[i] = $('fn' + i).value.trim(); };
    $('segN').querySelectorAll('button').forEach(b => b.onclick = () => { keep(); st.n = +b.dataset.n; draw(); });
    $('segB').querySelectorAll('button').forEach(b => b.onclick = () => { keep(); st.booth = +b.dataset.b; draw(); });
    $('frX').onclick = closeSheet;
    $('frGo').onclick = () => {
      keep(); writeSave();
      FR = { booth: st.booth, seed: (Math.random() * 1e9) >>> 0, turn: 0,
        players: Array.from({ length: st.n }, (_, i) => ({ name: save.friends[i] || `Player ${i + 1}`, hat: HATS_FRIENDS[i], rec: null, score: 0, got: 0, streak: 0 })) };
      friendsTurn();
    };
  };
  draw();
}
function friendsTurn() {
  const P = FR.players[FR.turn], B = E.BOOTHS[FR.booth];
  // the friends who already went sit either side, most recent on the left; empty stools get the booth's rivals
  const before = FR.players.slice(0, FR.turn).reverse();
  const seat = (p, j) => p ? { kind: 'ghost', name: p.name, hat: p.hat, ghost: p.rec } : E.rivalSeat(B.rivals[j]);
  const L = seat(before[0], 0), Rt = seat(before[1], 1);
  sheet(`${faceImg(P.hat, 'bigface c')}
    <h2>Pass the slingshot to ${esc(P.name)}</h2>
    <p>${B.name}. On your left: ${esc(L.name)}. On your right: ${esc(Rt.name)}.</p>
    <button class="btn" id="frReady" type="button">I’m ${esc(P.name)}. Ready</button>`, false);
  $('frReady').onclick = () => {
    closeSheet();
    startRound({
      booth: FR.booth, seed: FR.seed, seats: [L, { kind: 'you', name: P.name, hat: P.hat, shells: ['ricochet', 'buck', 'bang'] }, Rt],
      onEnd: (R, res) => {
        P.rec = R.rec.slice(); P.score = res.you.score; P.got = res.you.got; P.streak = res.you.bestStreak;
        FR.turn++;
        if (FR.turn < FR.players.length) {
          sheet(`<h2>${esc(P.name)}: ${P.score}</h2><p>${res.won ? 'Beat both stools beside them.' : 'Recorded. They’ll be sitting beside the next shooter.'}</p>
            <button class="btn" id="frNext" type="button">Next shooter</button>`, false);
          $('frNext').onclick = () => { closeSheet(); friendsTurn(); };
        } else friendsEnd();
      },
      restart: null, quitLabel: 'Stop the game', onQuit: () => { FR = null; renderTitle(); },
    });
  };
}
function friendsEnd() {
  const order = FR.players.slice().sort((a, b) => b.score - a.score), w = order[0];
  sheet(`${faceImg(w.hat, 'bigface c')}<h2>${esc(w.name)} wins</h2><p>${E.BOOTHS[FR.booth].name}</p>
    <div class="board">${order.map((p, i) => `<div class="row" style="animation-delay:${i * 90}ms"><span class="nm">${place(i)} · ${esc(p.name)}<small>${p.got} knocked down · best streak ${p.streak}</small></span><b>${p.score}</b></div>`).join('')}</div>
    <button class="btn" id="frAgain" type="button">Rematch</button><button class="btn ghost" id="frHome" type="button">Home</button>`, false);
  $('frAgain').onclick = () => { FR.seed = (Math.random() * 1e9) >>> 0; FR.turn = 0; FR.players.forEach(p => { p.rec = null; p.score = 0; }); friendsTurn(); };
  $('frHome').onclick = () => { closeSheet(); FR = null; renderTitle(); };
}

// ---------- how to play ----------
function howTo() {
  const t = id => `<img class="ti" src="${targetURL(id)}" alt="">`;
  sheet(`<h2>How to play</h2>
    <div class="how">
      <p><b>You’re on the middle stool with a toy slingshot.</b> Put a thumb down anywhere to draw it back, drag to aim, and let go to fire. The gap between the prongs follows your thumb like a mouse: slow for fine aim, a quick flick to swing across the booth. A tap fires where you’re already aiming. The shooters either side of you aim at the same targets, and whoever hits one first gets the points. Beat them both before the clock runs out.</p>
      <p><b>Streaks.</b> 3 hits in a row doubles your points, 6 triples them. A miss starts you over.</p>
      <p><b>Corks.</b> 6 a load. The slingshot reloads when it’s empty, or press Reload to reload early (it’s quicker when you still have some left).</p>
      <p><b>Last call.</b> In the final 10 seconds the machinery speeds up.</p>
    </div>
    <p class="evn">Worth knowing</p>
    <div class="tgts">
      <span>${t('goose')}<b>Golden goose</b> 60, rare</span>
      <span>${t('ufo')}<b>Saucer</b> 50, rare</span>
      <span>${t('knight')}<b>Tin knight</b> 40, takes 2 hits</span>
      <span>${t('box')}<b>Mystery box</b> gives you a shell</span>
      <span>${t('clock')}<b>Clock</b> 3 more seconds</span>
      <span>${t('tophat')}<b>Black targets</b> cost points</span>
    </div>
    <p class="evn">Special shells</p>
    <div class="shelllist">${E.SHELL_IDS.map(id => `<div>${icon(id)}<span><b>${E.SHELLS[id].name}.</b> ${E.SHELLS[id].text}</span></div>`).join('')}</div>
    <p class="resnote">Tap a shell in your belt to load it into your next shot. Tap it again to unload it. Win them from mystery boxes, or buy them at the shell cart between booths.</p>
    <button class="btn" id="howX" type="button">Got it</button>`);
  $('howX').onclick = closeSheet;
}
