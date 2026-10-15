const sharp=require('sharp'),path=require('path');const d=require('../data/products.json');
(async()=>{const comps=[];let i=0;const W=300;
for(const [k,v] of Object.entries(d)){ v.images.slice(0,8).forEach((im,j)=>{});
  const imgs=v.images.slice(0,8);
  for(let j=0;j<imgs.length;j++){const b=await sharp(path.join(__dirname,'..','public','img','mock',imgs[j].file)).resize(W,W,{fit:'cover'}).jpeg().toBuffer();comps.push({input:b,left:j*W,top:Object.keys(d).indexOf(k)*W});}
}
await sharp({create:{width:W*8,height:W*5,channels:3,background:'#333'}}).composite(comps).jpeg({quality:70}).toFile(path.join(__dirname,'..','art','msheet.jpg'));console.log('ok');})();
