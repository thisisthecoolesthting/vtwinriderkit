const fs=require('fs'),path=require('path');
const base='https://raw.githubusercontent.com/google/fonts/main/ofl/';
const list=[['bebasneue/BebasNeue-Regular.ttf','BebasNeue-Regular.ttf'],['barlowcondensed/BarlowCondensed-SemiBold.ttf','BarlowCondensed-SemiBold.ttf'],['barlowcondensed/BarlowCondensed-Medium.ttf','BarlowCondensed-Medium.ttf'],['sourcesans3/SourceSans3%5Bwght%5D.ttf','SourceSans3-VF.ttf']];
(async()=>{for(const [u,n] of list){const r=await fetch(base+u);console.log(n,r.status);if(r.ok)fs.writeFileSync(path.join(__dirname,'..','fonts',n),Buffer.from(await r.arrayBuffer()));}})();
