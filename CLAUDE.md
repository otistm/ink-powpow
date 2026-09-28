# Ink Powpow: notes for Claude Code

Ink Powpow is a fairground mechanical shooting gallery drawn like a paper-and-ink cartoon. It's a sister game to Ink Nine (`../ink-nine`), Ink Rally (`../ink-rally`), Ink of Arms (`../ink-of-arms`), Ink Sky (`../ink-sky`) and Ink Craft (`../ink-craft`) and shares their look, fonts and way of working. You sit on the middle stool at a booth; rivals sit on your left and right and shoot at the same tin targets. Whoever hits a target first gets it. Walk the midway, five booths, and win the giant bear.

## Who you're working with
Otis is the designer. He doesn't read code. He judges changes by playing them on his phone.
- Explain every change in plain language: what the player will see and feel, not how the code works.
- Keep replies short. Ask one question at a time when a design decision is his to make.

## How the project is built
- **No build step, no frameworks, no npm packages in the game.** Plain HTML, CSS and JavaScript files served as-is. The only outside code is Google Fonts.
- `index.html`: the front page (a striped awning over two rails of tin targets that get knocked flat now and then, and a Play button). It loads `play/js/gallery.js` and `play/js/art.js` so it draws the same targets as the game.
- `play/index.html`: the game page. It loads `styles.css` and then the scripts in `play/js/` **in the order listed there**.
- The scripts are classic scripts that share one global scope (`"use strict"` at the top of each). Order matters: a file can only use things defined in files above it *while it is loading*. Calls that happen later (on tap, during a frame) can use anything. Don't name a global `top`, `left`, `name`, `status` or other names the browser already uses.
- `manifest.webmanifest`, `sw.js`, `icons/`: home-screen install. When you change files the service worker caches, bump `CACHE` in `sw.js`.
- `tools/check.js`: tests the rules without a browser. Run `node tools/check.js` (or `node tools/check.js quick`).

| File | What's in it |
|---|---|
| config.js | `VERSION` |
| gallery.js | The rules, with no drawing: every target (`T`), special shells (`SHELLS`), slingshot upgrades (`UPS`), rivals and their brains (`RIVALS`), the five booths and their machinery (`BOOTHS`), and a round (`newRound`, `step`, `shoot`). Exposed as `E`. Tuning numbers live at the top |
| art.js | Ink drawings: every target on canvas (kept as sprites, front and a hatched back for when they're knocked flat), heads with hats for rivals and barkers, the prizes, SVG icons for shells and upgrades |
| audio.js | Sound made on the fly: cork pops (rivals' come from their side), tin clanks, bells, the sad trombone, and the band-organ waltz that speeds up at last call |
| ui.js | The save, the midway in progress (`run`), animation helpers (`anim`, `squash`, `nope`), screens, overlay cards (`sheet`), banners, one-time tips, sound toggles |
| booth.js | The booth screen, first person: the fixed view of the whole gallery, the aim (`SIGHT`) and pull-back input (`PULL`), drawing the gallery and awning in world units, then the foreground in screen pixels (counter, cork lines, your slingshot held out with its gap centred on the aim, soot on the lens), effects, the scoreboard, corks and shell belt, pause. `startRound()` |
| screens.js | Home, the booth intro, results, the shell cart, the grand prize, single booths, Pass the slingshot, how to play |
| main.js | Startup (always last) |

## How it plays
- **A round** is 40 seconds after "Ready… Aim… Fire!". You shoot a toy slingshot standing low at the bottom of the screen, with the whole gallery in view (the camera doesn't move). Controls copy Ink Nine's swing (`../ink-nine/play/js/input.js`): press anywhere (not on a button), pull back, let go to fire. The pull is measured from where the thumb landed; the pouch sits exactly under the thumb, and the aim is the line from the pouch through the gap between the prongs, `PULL.GAIN` (3) screen px per px of pull the opposite way. A dotted line and ring show the landing spot. Holding still 300ms mid-pull drops into a fine gear (a third), the last 70ms of lift-off wobble is ignored, and letting go with under 16px of pull fires nothing; `pointercancel` doesn't fire. It reads `pointerrawupdate` and coalesced events for the lowest delay. Otis found gliding or mouse-style aiming floaty and didn't feel like a slingshot: **the pouch follows the thumb with zero delay; never add easing, glide or wobble.** Only the snap-back after release is on a spring (`SLING`). Since 0.7 shots fly: `fire()` puts a ball in the air (`R.air`) and `land()` decides what it hit when it arrives, `FLIGHT_MIN` 0.2s at full pull to `FLIGHT_MAX` 0.38s at a weak one (pull strength is the pull length over three quarters of `pullMax()`); rivals fly in `NPC_FLIGHT` 0.25s and lead targets using each slot's measured speed (`vx`, `vy`). Anything still in the air lands at the bell. The ball is drawn in `drawBalls` with real perspective (fast then slow, shrinking) and a gentle arc. Reload (showing the corks) is at the bottom right, next to the shells. Mouse: move and click. Keyboard: arrows and space.  Three seats: left rival, you, right rival. Everyone shoots the same targets; a knocked target is gone for everyone until the machinery brings it round again.
- **Streaks.** Every 3 shots in a row that hit something add x1 to your points, up to x3 (x4 with Keen eye). A shot that hits nothing resets it. Hitting a black target resets it too and costs points.
- **Corks.** 6 a load (8 with the Cork bag). Empty reloads by itself in 1.1s; pressing Reload reloads early, quicker the more corks you still have.
- **Last call.** The final 10 seconds, the machinery runs 1.35 times faster and the music speeds up.
- **Targets** (`T` in gallery.js): 29 kinds. Most are points. Special ones: golden goose (60, rare flyby), flying saucer (50, rare), tin knight (40, takes 2 hits), mystery box (gives a shell), wind-up clock (adds 3 seconds to the round), ghost (fades in and out). **Black targets cost points**: the sheriff, the barker's hat, the booth cat. Black means "don't shoot" everywhere in the game; don't make a normal target black.
- **Machinery** (`rigs` in each booth, drawn back to front): `rail` (a chain carrying targets across and round again; `water` makes it a pond, `wire` a thin wire), `pop` (targets pop up and duck; `frame` puts them in windows), `wheel`, `swing` (a pendulum bell), `float` (balloons drifting up), `fly` (something rare crossing now and then). A target changes into a new one each time it comes round.
- **Special shells** (`SHELLS`): Ricochet, Buckshot, Firecracker, Skewer, Golden cork, Magnet, Spanner (jams all machinery 3 seconds), Soot bomb (rivals shoot slow and wild for 4 seconds; when a rival uses one on you, ink blots cover your view). You carry 4 (6 with Deep pockets). Tap one in the belt to load it into your next shot.
- **Rivals** (`RIVALS`): each has `react` (seconds to aim), `gap` (seconds between shots), `acc` (chance an aimed cork hits), `greed` (how much they chase big points), `use` (how keen they are to load shells) and the shells they bring. They lean toward their own side of the gallery, avoid a target another rival is already aiming at, hold fire most of the time when someone beats them to it, and only use soot bombs when they're losing.
- **The midway**: 5 booths (Duck Pond, Tin Can Alley, Dustbowl Saloon, Moon & Stars, Grand Gallery with champion Deadeye Dot). You start with 3 tokens, 10 tickets and 3 shells. Win a booth (beat both rivals; ties go to you) to move on; lose and it costs a token and you try again. Tickets: score ÷ 25, plus 10 for 1st or 4 for 2nd. Between booths the shell cart sells 4 shells and 2 slingshot upgrades. Each booth's first win puts its prize on the home-screen shelf: goldfish in a bag, tin kazoo, sheriff's star, moon balloon, giant bear.
- **Single booths**: every booth can be played on its own from the home screen, for a best score.
- **Pass the slingshot**: 2 to 4 friends take turns on one phone, same booth, same seed. Every shot is recorded against the machine clock (`R.rec`), so a friend's round plays back exactly where they shot. Whoever went before you sits beside you (most recent on the left); empty stools get the booth's rivals. Highest score wins.
- **Balance check:** `node tools/check.js` puts a bot in your stool ("casual" and "good") for 150 rounds per booth. The bot aims instantly, so it doesn't feel the time it takes to drag your sights in first person; judge difficulty by playing too. At 0.1.0 the good bot wins about 100% / 99% / 93% / 89% / 52% of booths 1 to 5, the casual bot about 95% / 80% / 50% / 30% / 2%. A thoughtful human should land between them. Re-run it after changing rivals, targets or machinery and tell Otis how the rates moved.

## Every change
1. Work on a new branch, never directly on `main`.
2. Bump `VERSION` in `play/js/config.js` (patch for fixes, minor for features) and add a line to `CHANGELOG.md` in plain language.
3. Run `node tools/check.js` if you touched the rules, rivals, targets or booths.
4. Test locally: run `python -m http.server 8041` in the repo folder and open http://localhost:8041/play/ at a phone size (390 × 844). Also check a small phone (375 × 667) and a wide screen: the belt (corks, shells, pause) must fit on one row and the gallery must never be cut off.

## Protect players' saved progress
- The game was called Ink Gallery until 0.2.1. The save keys below keep that old name on purpose: renaming them would wipe everyone's prizes. The repo folder is still `ink-gallery` too.
- `inkgallery-save`: `{ prizes: [5 bools], bears, best: { boothId: score }, tips: {}, snd, mus, friends: [names] }`, one prize per booth by position in `BOOTHS`. Add new booths at the end.
- `inkgallery-run`: `{ v: 1, run, phase, at }`. Saved between booths only (not mid-round). `run` is `{ booth, tokens, tickets, shells, ups, seed, scores, tries, sold }`. If you change its shape in a way a default can't cover, bump `v` and make `loadRun()` convert or ignore older ones.
- Never rename a booth `id`, target key, shell id or upgrade id; saves store them.

## Look and feel (same as the other Ink games; keep it consistent)
- First person: the gallery is drawn in world units through the camera; the counter, your slingshot and the soot are drawn on top in screen pixels, sized by `fgU()` so they scale with the phone. Your slingshot It's drawn in screen pixels (`drawSling`), fixed at `PULL.GAP` down the screen; the pouch is drawn in front of the fork when pulled toward you and behind it when slack or snapping through. Keep it a toy: chunky wood, striped tape on the handle, solid black bands. (0.2 to 0.5 used a toy cork rifle instead; it's in git history.) The rivals aren't drawn; their corks fly in from their side of the screen.
- Paper and ink only: white `#fff` and black `#000`, with grey `#5c5c5c` only for secondary text. Never color. Booths are told apart by their back wall pattern (waves, bricks, planks, a black night sky with white stars, harlequin diamonds), never by color.
- Targets are white tin with 2.3px ink outlines and a hard 3px 4px black shadow. Black targets (with a white halo) cost points. Knocked targets flip back and lie flat, showing a hatched back.
- Your points float up in solid black pills, rivals' in outlined pills with ◂ or ▸ for the side they sit.
- Outlines are clean 2–2.5px black lines with hard offset shadows (7px 8px on panels, 4px 5px on cards, 3px 4px on buttons). No blur, no soft gradients.
- Fonts: Fraunces (display, italic 900 for titles and names, upright 900 for numbers) and Figtree (UI, 600–800).
- Shared components copied from the sister games: `.panel`, `.btn` and `.btn.ghost`, `.event`, `.board`, `.how`, `.prog`, `.award`, the round pause button, the banner.
- Motion follows Disney's principles: squash and stretch, anticipation, follow-through, slow in and out. The slingshot's pouch draws back and snaps through with a wobble; targets pop in with a squash.
- Mobile first, portrait, one thumb. Respect safe areas and `prefers-reduced-motion`.
- Writing: sentence case, short and plain, numbers as digits, no jargon.

## Smoke test
- The front page shows the awning and two rails of tin targets being knocked flat, and a Play button.
- Home: the prize shelf (greyed until won), Walk the midway, the five booths with best scores, Pass the slingshot, How to play, sound and music toggles.
- Walk the midway: the booth intro shows 5 dots with a crown, the barker's line, both rivals, 3 tokens and your shells. Step up: first time only, a how-to card. Then Ready, Aim, Fire.
- Press and pull back until the dotted line's ring is on a target, and let go: the view follows, the pouch snaps through the prongs, a cork line flies, the target clanks and flips flat, "+10" floats up in black. 3 in a row: "x2!". Rivals' shots come from their side with dashed lines and outlined pills.
- Tap a black target: a sad trombone, points lost, the scoreboard shakes. Empty the tube: it reloads by itself. Tap the corks to reload early.
- Load a shell from the belt: it rises and a note explains it. Ricochet bounces on with dashed arcs, the firecracker bursts, the spanner freezes everything.
- Last 10 seconds: "Last call!", the fuse blinks, everything and the music speed up. "Time!" then results.
- Win: a prize (first time), tickets, the shell cart. Buy something, go on. Lose: a token gone, try again. Out of tokens: "The fair's closing".
- Pass the slingshot with 2 names: player 2 sees player 1 on their left, shooting where they shot.
- No errors in the browser console.
