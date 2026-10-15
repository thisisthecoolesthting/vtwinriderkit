// node tools/fetch-catalog.js 12:29 77:29 ... -> tools/catalog.json (variants+shipping), prints summary
const fs = require('fs'); const env = {}; for (const l of fs.readFileSync(__dirname + '/.env.local', 'utf8').split(/\r?\n/)) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2]; }
const H = { Authorization: 'Bearer ' + env.PRINTIFY_API_TOKEN };
const api = async p => { const r = await fetch('https://api.printify.com' + p, { headers: H }); if (!r.ok) throw new Error(p + ' ' + r.status); return r.json(); };
const OUT = __dirname + '/catalog.json'; const cat = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
(async () => {
  for (const a of process.argv.slice(2)) {
    const [b, p] = a.split(':'); const key = b + '_' + p;
    const v = await api(`/v1/catalog/blueprints/${b}/print_providers/${p}/variants.json`); let s = {}; try { s = await api(`/v1/catalog/blueprints/${b}/print_providers/${p}/shipping.json`); } catch (e) { s = { err: e.message }; }
    cat[key] = { v, s };
    const vs = v.variants; const colors = [...new Set(vs.map(x => x.options.color).filter(Boolean))];
    const ph = {}; vs.forEach(x => (x.placeholders || []).filter(q => q.position === 'front').forEach(q => ph[q.width + 'x' + q.height] = (ph[q.width + 'x' + q.height] || 0) + 1));
    const us = (s.profiles || []).filter(x => (x.countries || []).includes('US'));
    console.log(key, v.title, '| variants', vs.length, '| colors', colors.join('/'), '| front sizes', JSON.stringify(ph), '| US ship', us.length ? us[0].first_item.cost + '/' + us[0].additional_items.cost : 'NONE', '| opts', [...new Set(vs.map(x => x.options.size))].slice(0, 10).join('|'));
  }
  fs.writeFileSync(OUT, JSON.stringify(cat));
})().catch(e => console.log('ERR', e.message));
