// Turns glow-on-black AI art into transparent PNGs (alpha from brightest channel, colour untouched).
const sharp=require('sharp'),fs=require('fs');
(async()=>{for(const n of ['crown1','crown2','wreath1','wreath2','dove1','lace1']){
 const {data,info}=await sharp('art/raw/'+n+'.png').removeAlpha().raw().toBuffer({resolveWithObject:true});
 const out=Buffer.alloc(info.width*info.height*4);
 for(let i=0,j=0;i<data.length;i+=3,j+=4){const r=data[i],g=data[i+1],b=data[i+2];const m=Math.max(r,g,b)/255;
  let a=(m-0.05)/0.22;a=a<0?0:a>1?1:a;a=a*a*(3-2*a);out[j]=r;out[j+1]=g;out[j+2]=b;out[j+3]=Math.round(a*255);}
 await sharp(out,{raw:{width:info.width,height:info.height,channels:4}}).png().toFile('art/ready/'+n+'.png');console.log(n,info.width,info.height);}})();
