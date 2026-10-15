// Creates the products in Printify with sample-personalised print files. node tools/create-products.js [slug...]
const fs = require('fs'); const cfg = require('../lib/config.js'); const { compose, ext } = require('../lib/compose.js');
const env = {}; for (const l of fs.readFileSync(__dirname + '/.env.local', 'utf8').split(/\r?\n/)) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2]; }
const SHOP = env.PRINTIFY_SHOP_ID, H = { Authorization: 'Bearer ' + env.PRINTIFY_API_TOKEN, 'Content-Type': 'application/json' };
const api = async (m, p, body) => { const r = await fetch('https://api.printify.com' + p, { method: m, headers: H, body: body ? JSON.stringify(body) : undefined }); const t = await r.text(); if (!r.ok) throw new Error(m + ' ' + p + ' ' + r.status + ' ' + t.slice(0, 300)); return t ? JSON.parse(t) : {}; };
const cat = require('./catalog.json'); const OUT = __dirname + '/../data/products.json';
const done = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
const only = process.argv.slice(2);
const front = v => { const q = (v.placeholders || []).find(x => x.position === 'front'); return [q.width, q.height]; };
(async () => {
  for (const p of cfg.products) {
    if (only.length && !only.includes(p.slug)) continue;
    if (done[p.slug] && done[p.slug].printify_id) { console.log('skip', p.slug); continue; }
    let cv = cat[p.blueprint + '_' + p.provider].v.variants;
    if (p.options.color) cv = cv.filter(v => p.options.color.includes(v.options.color) && p.options.size.includes(v.options.size));
    if (p.sizes) cv = cv.filter(v => p.sizes.includes(v.options.size));
    const variants = cv.map(v => ({ id: v.id, title: v.title, color: v.options.color || null, sizeLabel: v.options.size || null, size: front(v) }));
    if (!variants.length) throw new Error('no variants for ' + p.slug);
    const files = {};
    for (const v of variants) { const k = v.size.join('x'); if (!files[k]) { const buf = await compose(p.layout, v.size[0], v.size[1], cfg.SAMPLE); const up = await api('POST', '/v1/uploads/images.json', { file_name: `vtwin-${p.slug}-${k}.${ext(p.layout)}`, contents: buf.toString('base64') }); files[k] = up.id; console.log(p.slug, 'uploaded', k, (buf.length / 1e6).toFixed(1) + 'MB'); } }
    const groups = {}; for (const v of variants) (groups[v.size.join('x')] = groups[v.size.join('x')] || []).push(v.id);
    const body = { title: p.title, description: p.description, tags: p.tags, blueprint_id: p.blueprint, print_provider_id: p.provider,
      variants: variants.map(v => ({ id: v.id, price: 3999, is_enabled: true })),
      print_areas: Object.entries(groups).map(([k, ids]) => ({ variant_ids: ids, placeholders: [{ position: 'front', images: [{ id: files[k], x: 0.5, y: 0.5, scale: 1, angle: 0 }] }] })) };
    const prod = await api('POST', `/v1/shops/${SHOP}/products.json`, body);
    console.log('created', p.slug, prod.id, 'variants', variants.length);
    done[p.slug] = { printify_id: prod.id, variants }; fs.writeFileSync(OUT, JSON.stringify(done, null, 1));
  }
  console.log('all created');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
