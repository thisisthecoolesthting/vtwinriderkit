// Performance pass: smaller art, 480/800 mockup variants (real Printify mockups, only resized), async fonts, compression.
const fs = require('fs'), sharp = require('sharp'); const R = f => __dirname + '/../' + f; const rd = f => fs.readFileSync(R(f), 'utf8').replace(/^\uFEFF/, '');
(async () => {
  for (const [n, w, q, aq] of [['crown1', 700, 76, 70], ['crown2', 700, 76, 70], ['dove1', 700, 74, 70], ['wreath1', 560, 52, 55], ['lace1', 900, 70, 70]])
    await sharp(R('art/ready/' + n + '.png')).resize({ width: w }).webp({ quality: q, alphaQuality: aq, effort: 5 }).toFile(R('public/img/art/' + n + '.webp'));
  fs.mkdirSync(R('public/img/mock/s'), { recursive: true });
  const d = JSON.parse(rd('data/products.json')); const files = new Set(); for (const p of Object.values(d)) for (const i of p.images) files.add(i.file);
  for (const f of files) {
    const src = R('public/img/mock/' + f); const buf = await fs.promises.readFile(src);
    const m = await sharp(buf).metadata();
    if (m.width > 800) await sharp(buf).resize({ width: 800 }).webp({ quality: 74 }).toFile(src + '.tmp').then(() => fs.renameSync(src + '.tmp', src));
    await sharp(fs.readFileSync(src)).resize({ width: 480 }).webp({ quality: 72 }).toFile(R('public/img/mock/s/' + f));
  }
  let h = rd('public/index.html');
  h = h.replace('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500;1,600&family=Cormorant+SC:wght@700&family=Jost:wght@400;500;600&family=Pinyon+Script&display=swap">',
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500;1,600&family=Cormorant+SC:wght@700&family=Jost:wght@400;500;600&family=Pinyon+Script&display=swap" media="print" onload="this.media=\'all\'"><noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500;1,600&family=Cormorant+SC:wght@700&family=Jost:wght@400;500;600&family=Pinyon+Script&display=swap"></noscript>\n<link rel="preload" as="image" href="/img/art/crown1.webp" type="image/webp">');
  h = h.replace('<img class="hero-flora" src="/img/art/wreath1.webp" alt="" width="700" height="700" aria-hidden="true">', '<div class="hero-flora" aria-hidden="true"></div>');
  h = h.replace('class="cart-btn" id="openCart" aria-label="Carrito"', 'class="cart-btn" id="openCart" aria-label="Carrito"');
  fs.writeFileSync(R('public/index.html'), h);
  let c = rd('public/checkout.html');
  c = c.replace(/<link rel="stylesheet" href="(https:\/\/fonts\.googleapis\.com[^"]+)">/, '<link rel="stylesheet" href="$1" media="print" onload="this.media=\'all\'">');
  fs.writeFileSync(R('public/checkout.html'), c);
  let s = rd('public/styles.css');
  s = s.replace('.hero-flora{position:absolute;width:520px;max-width:none;right:-230px;top:-170px;opacity:.28;pointer-events:none;transform:rotate(12deg)}', '.hero-flora{position:absolute;width:520px;height:520px;right:-230px;top:-170px;opacity:.28;pointer-events:none;transform:rotate(12deg);background:url(/img/art/wreath1.webp) center/contain no-repeat}')
       .replace('.hero-flora{width:760px;right:-260px;top:-260px}', '.hero-flora{width:760px;height:760px;right:-260px;top:-260px}');
  fs.writeFileSync(R('public/styles.css'), s);
  let a = rd('public/app.js');
  a = a.replace("im.src = '/img/mock/' + imgs[sel.img].file;", "im.src = '/img/mock/' + imgs[sel.img].file; im.srcset = '/img/mock/s/' + imgs[sel.img].file + ' 480w, /img/mock/' + imgs[sel.img].file + ' 800w'; im.sizes = '(min-width:760px) 360px, 90vw';")
       .replace("'><img src=\"/img/mock/' + i.file + '\" alt=\"\" loading=\"lazy\"", "'><img src=\"/img/mock/s/' + i.file + '\" alt=\"\" loading=\"lazy\"")
       .replace("'<div class=\"line\"><img src=\"/img/mock/' + l.img", "'<div class=\"line\"><img src=\"/img/mock/s/' + l.img")
       .replace("<select data-o=\"color\">", "<select data-o=\"color\" aria-label=\"' + t('color') + '\">").replace("<select data-o=\"size\">", "<select data-o=\"size\" aria-label=\"' + t('size') + '\">").replace("<select data-o=\"variant\">", "<select data-o=\"variant\" aria-label=\"' + t('fmt') + '\">")
       .replace("<select data-b=\"color\">", "<select data-b=\"color\" aria-label=\"' + t('color') + '\">").replace("<select data-b=\"size\">", "<select data-b=\"size\" aria-label=\"' + t('size') + '\">");
  fs.writeFileSync(R('public/app.js'), a);
  let v = rd('server.js');
  v = v.replace("alt=\"Foto de ' + esc(names) + '\" width=\"1000\" height=\"1000\"", "srcset=\"/img/mock/s/' + img + ' 480w, /img/mock/' + img + ' 800w\" sizes=\"(min-width:760px) 360px, 90vw\" alt=\"Foto de ' + esc(names) + '\" width=\"800\" height=\"800\"")
       .replace("'<img src=\"/img/mock/' + CAT[s].images[0].file + '\" alt=\"\" width=\"240\" height=\"240\" loading=\"lazy\">'", "'<img src=\"/img/mock/s/' + CAT[s].images[0].file + '\" alt=\"\" width=\"240\" height=\"240\" loading=\"lazy\">'")
       .replace("const app = express();", "const app = express(); app.use(require('compression')());")
       .replace("maxAge: '7d'", "maxAge: '30d'");
  fs.writeFileSync(R('server.js'), v);
  console.log('opt done', v.includes('compression'), a.includes('aria-label=\\"\' + t(\'color\')') || a.includes("aria-label=\"' + t('color')"));
})();
