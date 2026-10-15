// Derives per-variant US shipping rates (cents) from the Printify catalog shipping profiles -> data/shipping.json
const fs = require('fs'); const cfg = require('../lib/config.js'); const cat = require('./catalog.json');
const out = {};
for (const p of cfg.products) {
  const profs = cat[p.blueprint + '_' + p.provider].s.profiles.filter(x => (x.countries || []).includes('US'));
  const by = {};
  for (const pr of profs) for (const id of pr.variant_ids) by[id] = { first: pr.first_item.cost, add: pr.additional_items.cost };
  out[p.slug] = { provider: p.provider, by };
}
fs.writeFileSync(__dirname + '/../data/shipping.json', JSON.stringify(out)); console.log(Object.keys(out).map(k => k + ':' + Object.keys(out[k].by).length).join(' '));
