// Generates original art (no text) via Together FLUX. Usage: node tools/gen-art.js [name ...]  (key read from tools/.env.local, never printed)
const fs = require('fs'), path = require('path');
const env = {}; for (const l of fs.readFileSync(__dirname + '/.env.local', 'utf8').split(/\r?\n/)) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2]; }
const SIL = ', pure solid black shape on a plain pure white background, side profile facing right, no rider, no people, no logos, no brand marks, no text, flat clean vector-style silhouette, whole bike fully in frame, generic custom design';
const DARK = ', gritty textured illustration, rich contrast, isolated on pure solid black background, no text, no letters, no words, no logos';
const jobs = [
  ['wings', 'symmetrical pair of large feathered wings spread wide, brushed chrome silver feathers with warm ember orange rim light, a small cluster of deep red roses with thorny vines where the wings meet at the center, faint flames at the base, engraved tattoo-flash illustration style, highly detailed' + DARK, 1536, 1024],
  ['bike_cruiser', 'solid black silhouette of a low slung classic american V-twin cruiser motorcycle, teardrop fuel tank, fat rear tire, wide pullback handlebars, spoked wheels, chopper stance' + SIL, 1536, 1024],
  ['bike_touring', 'solid black silhouette of a big touring motorcycle with tall windshield fairing, hard saddlebags and a rear trunk, V-twin bagger, wide handlebars' + SIL, 1536, 1024],
  ['bike_sport', 'solid black silhouette of a modern sport bike, aggressive full fairing, low clip-on handlebars, tall tail section, single-sided swingarm style' + SIL, 1536, 1024],
  ['road', 'dramatic dusk landscape, huge ember orange sun low on the horizon with fiery clouds, dark silhouetted mountains, a long empty two lane highway vanishing to the horizon, ink and grain painterly texture, no vehicles, no people, no text, no words', 1536, 1024],
  ['roses', 'a horizontal garland of deep red roses with thorny vines and dark leaves, with a few brushed chrome silver feathers, engraved tattoo-flash illustration style, highly detailed' + DARK, 1536, 640],
];
const only = process.argv.slice(2);
const MODEL = process.env.IMG_MODEL || 'black-forest-labs/FLUX.2-pro';
(async () => {
  fs.mkdirSync(path.join(__dirname, '..', 'art', 'raw'), { recursive: true });
  for (const [n, p, w, h] of jobs) {
    if (only.length && !only.includes(n)) continue;
    for (const v of ['a', 'b']) {
      let r, j;
      for (let t = 0; t < 6; t++) {
        r = await fetch('https://api.together.xyz/v1/images/generations', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + env.TOGETHER_API_KEY }, body: JSON.stringify({ model: MODEL, prompt: p, width: w, height: h, n: 1, response_format: 'url' }) });
        j = await r.json(); if (r.status !== 429) break; await new Promise(z => setTimeout(z, 15000 * (t + 1)));
      }
      if (!r.ok) { console.log(n, v, 'ERR', r.status, JSON.stringify(j).slice(0, 200)); continue; }
      const b = Buffer.from(await (await fetch(j.data[0].url)).arrayBuffer()); fs.writeFileSync(path.join(__dirname, '..', 'art', 'raw', n + '_' + v + '.png'), b); console.log(n, v, 'ok', b.length);
    }
  }
})();

