// raw AI art -> print-ready layers in art/ready (silhouette masks, black-keyed cutouts, trimmed)
const sharp = require('sharp'), path = require('path'), fs = require('fs');
const raw = n => path.join(__dirname, '..', 'art', 'raw', n + '.png'), out = n => path.join(__dirname, '..', 'art', 'ready', n + '.png');
fs.mkdirSync(path.join(__dirname, '..', 'art', 'ready'), { recursive: true });
async function rgba(file) { const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true }); return { data, w: info.width, h: info.height }; }
async function save(buf, w, h, to) { await sharp(buf, { raw: { width: w, height: h, channels: 4 } }).trim({ threshold: 2 }).png({ compressionLevel: 9 }).toFile(to); }
(async () => {
  // silhouettes: dark on white -> solid near-black with alpha from inverse luminance
  for (const [src, dst] of [['bike_cruiser_a', 'bike_cruiser'], ['bike_touring_b', 'bike_touring'], ['bike_sport_a', 'bike_sport']]) {
    const { data, w, h } = await rgba(raw(src)); const o = Buffer.alloc(w * h * 4);
    for (let i = 0; i < w * h; i++) { const l = (data[i * 3] * 0.3 + data[i * 3 + 1] * 0.59 + data[i * 3 + 2] * 0.11); let a = Math.max(0, Math.min(1, (215 - l) / 150)); o[i * 4] = 8; o[i * 4 + 1] = 6; o[i * 4 + 2] = 6; o[i * 4 + 3] = Math.round(a * 255); }
    await save(o, w, h, out(dst)); console.log(dst);
  }
  // black-keyed art: alpha from max channel
  for (const [src, dst] of [['wings_a', 'wings'], ['roses_a', 'roses']]) {
    const { data, w, h } = await rgba(raw(src)); const o = Buffer.alloc(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2], m = Math.max(r, g, b); let a = Math.max(0, Math.min(1, (m - 10) / 60));
      const k = m > 0 ? 255 / Math.max(m, 1) : 0; const f = Math.min(1, a) ;
      // keep colour, push brightness up where alpha<1 so edges stay luminous
      o[i * 4] = Math.min(255, r * (a < 1 ? k * 0.85 + 0.15 : 1)); o[i * 4 + 1] = Math.min(255, g * (a < 1 ? k * 0.85 + 0.15 : 1)); o[i * 4 + 2] = Math.min(255, b * (a < 1 ? k * 0.85 + 0.15 : 1)); o[i * 4 + 3] = Math.round(f * 255);
    }
    await save(o, w, h, out(dst)); console.log(dst);
  }
  await sharp(raw('road_a')).png().toFile(out('road')); console.log('road');
  for (const n of ['bike_cruiser', 'bike_touring', 'bike_sport', 'wings', 'roses', 'road']) { const m = await sharp(out(n)).metadata(); console.log(n, m.width + 'x' + m.height); }
})();
