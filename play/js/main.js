/* =====================================================================
   Startup. Always the last script.
   ===================================================================== */
"use strict";
renderTitle();
// the mystery box's "?" is drawn in Fraunces: redraw the sprites once the font has arrived
if (document.fonts) document.fonts.ready.then(() => { SPR = {}; });
$('ver').textContent = 'Version ' + VERSION;
// Handy for testing in the browser console: __ink.R is the round in progress, __ink.run the midway.
window.__ink = { get R() { return R; }, get run() { return run; }, E, save };
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/sw.js').catch(() => {});
