const sharp=require('sharp'),fs=require('fs'),path=require('path');
const dir=path.join(__dirname,'..','art','raw');const names=process.argv.slice(2);
(async()=>{const W=480,H=320;const comps=[];let i=0;
for(const n of names){const b=await sharp(path.join(dir,n+'.png')).resize(W,H,{fit:'contain',background:'#888'}).png().toBuffer();comps.push({input:b,left:(i%3)*W,top:Math.floor(i/3)*H});i++;}
await sharp({create:{width:W*3,height:H*Math.ceil(names.length/3),channels:3,background:'#444'}}).composite(comps).jpeg({quality:80}).toFile(path.join(dir,'..','sheet.jpg'));console.log('ok');})();
