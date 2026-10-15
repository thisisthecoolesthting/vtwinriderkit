const fs=require('fs');const env={};for(const l of fs.readFileSync(__dirname+'/.env.local','utf8').split(/\r?\n/)){const m=l.match(/^([A-Z_]+)=(.*)$/);if(m)env[m[1]]=m[2];}
const H={Authorization:'Bearer '+env.PRINTIFY_API_TOKEN};
const api=async p=>{const r=await fetch('https://api.printify.com'+p,{headers:H});if(!r.ok)throw new Error(p+' '+r.status);return r.json();};
(async()=>{
 const bps=await api('/v1/catalog/blueprints.json');
 const re=/(heavy blend|hooded|heavy cotton tee|ceramic mug|matte vertical|flag|trucker|dad hat|tank|bandana|garment-dyed|comfort colors|premium poster|poster|banner)/i;
 for(const b of bps.filter(b=>re.test(b.title))) console.log(b.id,'|',b.title,'|',b.brand,b.model);
})();
