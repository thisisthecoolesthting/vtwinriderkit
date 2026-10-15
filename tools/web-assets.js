// Web-optimised art + mockup sizes + OG image (a real Printify mockup on the dark brand background)
const fs = require('fs'), sharp = require('sharp'), path = require('path'); const R = f => path.join(__dirname, '..', f);
(async () => {
  fs.mkdirSync(R('public/img/art'), { recursive: true }); fs.mkdirSync(R('public/img/mock/s'), { recursive: true });
  for (const b of ['cruiser', 'touring', 'sport']) await sharp(R('art/ready/bike_' + b + '.png')).resize({ width: 320 }).webp({ quality: 80, alphaQuality: 90 }).toFile(R('public/img/art/bike_' + b + '.webp'));
  await sharp(R('art/ready/wings.png')).resize({ width: 900 }).webp({ quality: 78, alphaQuality: 80 }).toFile(R('public/img/art/wings.webp'));
  await sharp(R('art/ready/road.png')).resize({ width: 1600 }).modulate({ brightness: 0.55 }).webp({ quality: 58 }).toFile(R('public/img/art/road.webp'));
  const d = JSON.parse(fs.readFileSync(R('data/products.json'), 'utf8')); const files = new Set(); for (const p of Object.values(d)) for (const i of p.images) files.add(i.file);
  for (const f of files) {
    const src = R('public/img/mock/' + f); const buf = fs.readFileSync(src); const m = await sharp(buf).metadata();
    if (m.width > 800) await sharp(buf).resize({ width: 800 }).webp({ quality: 76 }).toFile(src + '.tmp').then(() => fs.renameSync(src + '.tmp', src));
    await sharp(fs.readFileSync(src)).resize({ width: 480 }).webp({ quality: 72 }).toFile(R('public/img/mock/s/' + f));
  }
  // OG: real mockups (tee front + poster front), side by side on brand ink
  const pick = (slug, pos) => { const im = d[slug].images.find(i => i.position === pos && i.is_default) || d[slug].images.find(i => i.position === pos) || d[slug].images[0]; return R('public/img/mock/' + im.file); };
  const H = 630, tee = await sharp(pick('memorial-tee', 'front')).resize({ height: H, width: H, fit: 'cover' }).toBuffer(), post = await sharp(pick('memorial-print', 'front')).resize({ height: H, width: H, fit: 'cover' }).toBuffer();
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#0b0908"/></svg>`);
  await sharp(svg).composite([{ input: tee, left: 0, top: 0 }, { input: post, left: 570, top: 0 }]).jpeg({ quality: 84 }).toFile(R('public/img/og.jpg'));
  console.log('web assets ok', files.size, 'mockups');
})().catch(e => { console.error(e); process.exit(1); });
