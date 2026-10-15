const sharp=require('sharp');
(async()=>{for(const [n,w] of [['crown1',820],['crown2',820],['dove1',820],['wreath1',1000],['lace1',1200]]) await sharp('art/ready/'+n+'.png').resize({width:w}).webp({quality:84,alphaQuality:90}).toFile('public/img/art/'+n+'.webp');
const m=await sharp('public/img/mock/crew-tee-0.webp').resize(560,560,{fit:'contain',background:'#2b0a22'}).toBuffer();
await sharp({create:{width:1200,height:630,channels:3,background:'#2b0a22'}}).composite([{input:m,left:320,top:35}]).jpeg({quality:86}).toFile('public/img/og.jpg');
await sharp('art/ready/crown1.png').resize(180).png().toFile('public/img/icon-180.png');
await sharp({create:{width:180,height:180,channels:3,background:'#2b0a22'}}).composite([{input:await sharp('art/ready/crown1.png').resize(150).png().toBuffer(),left:15,top:15}]).png().toFile('public/img/apple-touch-icon.png');
console.log('ok');})();
