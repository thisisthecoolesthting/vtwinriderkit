// contact sheet of all layouts at 1/4 scale: node tools/prev.js [bike] [mode]
const sharp = require('sharp'), path = require('path'); const { compose } = require('../lib/compose.js'); const QText = require('../public/qtext.js');
const S = QText.SAMPLE; const bike = process.argv[2] || S.bike; const club = process.argv[3] === 'club';
const inp = club ? { mode: 'club', name: 'Iron Road Riders MC', line2: 'Memorial Run 2027', tag: 'memorial-run', bike } : { ...S, bike };
const items = [['tee', 3319, 3761], ['hoodie', 2894, 2368], ['poster', 3300, 4200], ['flag', 5695, 3892], ['mug', 2480, 1146]];
(async () => {
  const bufs = []; for (const [l, w, h] of items) { const f = 0.22; const W = Math.round(w * f), H = Math.round(h * f); const t0 = Date.now(); const b = await compose(l, W, H, inp); console.log(l, W, H, Date.now() - t0 + 'ms'); bufs.push({ b, W, H }); }
  const colW = 1900, comps = []; let x = 0, y = 0, rowH = 0; for (const { b, W, H } of bufs) { if (x + W > colW) { x = 0; y += rowH + 10; rowH = 0; } comps.push({ input: await sharp({ create: { width: W, height: H, channels: 4, background: '#222' } }).composite([{ input: b }]).png().toBuffer(), left: x, top: y }); x += W + 10; rowH = Math.max(rowH, H); }
  await sharp({ create: { width: colW, height: y + rowH, channels: 3, background: '#555' } }).composite(comps).jpeg({ quality: 85 }).toFile(path.join(__dirname, '..', 'art', 'prev.jpg')); console.log('ok');
})().catch(e => { console.error(e); process.exit(1); });
