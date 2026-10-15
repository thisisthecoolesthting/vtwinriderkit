// Re-renders + re-uploads the print files of an existing Printify product. node tools/update-print.js <slug>
const fs = require('fs'); const cfg = require('../lib/config.js'); const { compose, ext } = require('../lib/compose.js');
const env = {}; for (const l of fs.readFileSync(__dirname + '/.env.local', 'utf8').split(/\r?\n/)) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2]; }
const SHOP = env.PRINTIFY_SHOP_ID, H = { Authorization: 'Bearer ' + env.PRINTIFY_API_TOKEN, 'Content-Type': 'application/json' };
const api = async (m, p, body) => { const r = await fetch('https://api.printify.com' + p, { method: m, headers: H, body: body ? JSON.stringify(body) : undefined }); const t = await r.text(); if (!r.ok) throw new Error(m + ' ' + p + ' ' + r.status + ' ' + t.slice(0, 300)); return t ? JSON.parse(t) : {}; };
const OUT = __dirname + '/../data/products.json'; const done = JSON.parse(fs.readFileSync(OUT, 'utf8'));
(async () => {
  const p = cfg.products.find(x => x.slug === process.argv[2]); const d = done[p.slug]; const files = {}, groups = {};
  for (const v of d.variants) { const k = v.size.join('x'); if (!files[k]) { const buf = await compose(p.layout, v.size[0], v.size[1], cfg.SAMPLE); const up = await api('POST', '/v1/uploads/images.json', { file_name: `vtwin-${p.slug}-${k}-${Date.now()}.${ext(p.layout)}`, contents: buf.toString('base64') }); files[k] = up.id; console.log('uploaded', k); } (groups[k] = groups[k] || []).push(v.id); }
  const prod = await api('GET', `/v1/shops/${SHOP}/products/${d.printify_id}.json`);
  await api('PUT', `/v1/shops/${SHOP}/products/${d.printify_id}.json`, { print_areas: Object.entries(groups).map(([k, ids]) => ({ variant_ids: ids, placeholders: [{ position: 'front', images: [{ id: files[k], x: 0.5, y: 0.5, scale: 1, angle: 0 }] }] })) });
  console.log('updated', p.slug);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
