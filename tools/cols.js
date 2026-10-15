// node tools/cols.js in.png out.jpg colHeight  -> splits a tall screenshot into side-by-side columns
const sharp = require('sharp'); const [, , i, o, hh] = process.argv; const CH = +hh || 1450;
(async () => { const m = await sharp(i).metadata(); const n = Math.ceil(m.height / CH); const comps = [];
  for (let k = 0; k < n; k++) { const h = Math.min(CH, m.height - k * CH); comps.push({ input: await sharp(i).extract({ left: 0, top: k * CH, width: m.width, height: h }).toBuffer(), left: k * (m.width + 10), top: 0 }); }
  await sharp({ create: { width: n * (m.width + 10), height: CH, channels: 3, background: '#444' } }).composite(comps).jpeg({ quality: 82 }).toFile(o); console.log('ok', n); })();
