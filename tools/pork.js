// Porkbun DNS helper (keys read from the credentials vault, never printed). node tools/pork.js list|set <ip>
const fs = require('fs'); const v = fs.readFileSync('C:/CLAUDE-UNIFIED/CREDENTIALS/CREDENTIALS-VAULT.txt', 'utf8');
const get = k => { const m = v.match(new RegExp('^' + k + '=(\\S+)', 'm')); return m && m[1]; };
const auth = { apikey: get('PORKBUN_API_KEY'), secretapikey: get('PORKBUN_SECRET_API_KEY') }; const D = 'vtwinriderkit.org';
const call = async (p, body = {}) => { const r = await fetch('https://api.porkbun.com/api/json/v3' + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...auth, ...body }) }); const t = await r.text(); try { return JSON.parse(t); } catch (e) { return { status: 'HTTP' + r.status, raw: t.slice(0, 200) }; } };
(async () => {
  const [cmd, ip] = process.argv.slice(2);
  if (cmd === 'list') { const j = await call('/dns/retrieve/' + D); console.log(j.status, j.message || ''); (j.records || []).forEach(r => console.log(r.id, r.type, r.name, r.content, r.ttl, r.prio || '')); }
  if (cmd === 'set') {
    const j = await call('/dns/retrieve/' + D); if (j.status !== 'SUCCESS') return console.log('retrieve failed', j.status, j.message);
    for (const r of j.records) if ((r.type === 'A' || r.type === 'AAAA' || r.type === 'ALIAS') && (r.name === D || r.name === 'www.' + D)) { const d = await call('/dns/delete/' + D + '/' + r.id); console.log('deleted', r.type, r.name, d.status); }
    for (const sub of ['', 'www']) { const c = await call('/dns/create/' + D, { name: sub, type: 'A', content: ip, ttl: '300' }); console.log('created A', sub || '@', c.status, c.message || ''); }
  }
})();
