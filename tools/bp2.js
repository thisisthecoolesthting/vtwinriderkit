const fs=require('fs');const env={};for(const l of fs.readFileSync(__dirname+'/.env.local','utf8').split(/\r?\n/)){const m=l.match(/^([A-Z_]+)=(.*)$/);if(m)env[m[1]]=m[2];}
const H={Authorization:'Bearer '+env.PRINTIFY_API_TOKEN};
const api=async p=>{const r=await fetch('https://api.printify.com'+p,{headers:H});if(!r.ok)throw new Error(p+' '+r.status);return r.json();};
(async()=>{
 for(const b of process.argv.slice(2)){
  const pv=await api(`/v1/catalog/blueprints/${b}/print_providers.json`);
  console.log('BP',b,pv.map(p=>p.id+':'+p.title).join(' ; '));
  const pid=pv[0].id;
  const v=(await api(`/v1/catalog/blueprints/${b}/print_providers/${pid}/variants.json`)).variants;
  const colors=[...new Set(v.map(x=>x.options.color))], sizes=[...new Set(v.map(x=>x.options.size))];
  console.log('  first provider',pid,'variants',v.length,'colors',colors.slice(0,12).join('|'),'sizes',sizes.join('|'));
  console.log('  ph', JSON.stringify(v[0].placeholders));
 }
})().catch(e=>console.log('ERR',e.message));
