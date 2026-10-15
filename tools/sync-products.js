// Pulls real Printify mockups + costs, sets retail prices, writes data/products.json
const fs = require('fs'), sharp = require('sharp'); const cfg = require('../lib/config.js');
const env = {}; for (const l of fs.readFileSync(__dirname + '/.env.local', 'utf8').split(/\r?\n/)) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2]; }
const SHOP = env.PRINTIFY_SHOP_ID, H = { Authorization: 'Bearer ' + env.PRINTIFY_API_TOKEN, 'Content-Type': 'application/json' };
const api = async (m, p, body) => { const r = await fetch('https://api.printify.com' + p, { method: m, headers: H, body: body ? JSON.stringify(body) : undefined }); const t = await r.text(); if (!r.ok) throw new Error(m + ' ' + p + ' ' + r.status + ' ' + t.slice(0, 300)); return t ? JSON.parse(t) : {}; };
const OUT = __dirname + '/../data/products.json'; const done = JSON.parse(fs.readFileSync(OUT, 'utf8'));
const retail = (cost) => Math.ceil(cost * cfg.MARKUP / 100) * 100 - 1;
fs.mkdirSync(__dirname + '/../public/img/mock', { recursive: true });
(async () => {
  for (const p of cfg.products) {
    if (process.argv[2] && p.slug !== process.argv[2]) continue;
    const d = done[p.slug]; const prod = await api('GET', `/v1/shops/${SHOP}/products/${d.printify_id}.json`);
    const costs = {}; prod.variants.forEach(v => costs[v.id] = v.cost);
    d.variants.forEach(v => { v.cost = costs[v.id]; v.price = retail(v.cost); });
    await api('PUT', `/v1/shops/${SHOP}/products/${d.printify_id}.json`, { variants: d.variants.map(v => ({ id: v.id, price: v.price, is_enabled: true })) });
    // mockups
    const seen = new Map(); d.images = [];
    for (const im of prod.images) {
      const key = im.src.split('?')[0]; if (seen.has(key)) continue;
      const colorKey = (im.variant_ids || []).join(',');
      seen.set(key, 1);
      const idx = d.images.length; if (idx >= 40) break;
      const buf = Buffer.from(await (await fetch(im.src)).arrayBuffer());
      const file = `${p.slug}-${idx}.webp`;
      await sharp(buf).resize({ width: 1000, withoutEnlargement: true }).webp({ quality: 82 }).toFile(__dirname + '/../public/img/mock/' + file);
      d.images.push({ file, position: im.position, is_default: !!im.is_default, variant_ids: im.variant_ids, printify_src: im.src });
    }
    d.min_price = Math.min(...d.variants.map(v => v.price)); d.min_cost = Math.min(...d.variants.map(v => v.cost));
    console.log(p.slug, 'variants', d.variants.length, 'cost', d.min_cost, 'price', d.min_price, 'images', d.images.length, 'pos', [...new Set(d.images.map(i => i.position))].join('/'));
  }
  fs.writeFileSync(OUT, JSON.stringify(done, null, 1)); console.log('synced');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
