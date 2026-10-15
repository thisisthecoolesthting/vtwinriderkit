/* Print-file renderer: original art layers (art/ready) + typography drawn as vector paths (crisp at any DPI). */
const sharp = require('sharp'), opentype = require('opentype.js'), path = require('path'), fs = require('fs');
const QText = require('../public/qtext.js');
const ROOT = path.join(__dirname, '..'), FONT_DIR = path.join(ROOT, 'fonts'), ART_DIR = path.join(ROOT, 'art', 'ready');
const loadFont = (f) => { const b = fs.readFileSync(path.join(FONT_DIR, f)); return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };
const bebas = loadFont('BebasNeue-Regular.ttf'), barlow = loadFont('BarlowCondensed-SemiBold.ttf'), barlowM = loadFont('BarlowCondensed-Medium.ttf');
const EMBER = '#ff6a1a', EMBER_HI = '#ffa23a', BONE = '#f3ead9', CHROME = '#d3d7dc', INK = '#0b0908';
const ASPECT = { cruiser: 1259 / 665, touring: 1385 / 761, sport: 1302 / 718 };
const WINGS_AR = 1457 / 948;

function clean(font, s) { let o = ''; for (const ch of s) if (ch === ' ' || font.charToGlyphIndex(ch) > 0) o += ch; return o; }
function textPath(font, text, cx, y, size, fill, ls = 0, maxW) {
  text = clean(font, text); if (!text.trim()) return { svg: '', size, w: 0 };
  const adv = (sz) => font.getAdvanceWidth(text, sz, { letterSpacing: ls });
  if (maxW && adv(size) > maxW) size = size * maxW / adv(size);
  const w = adv(size);
  return { svg: `<path d="${font.getPath(text, cx - w / 2, y, size, { letterSpacing: ls }).toPathData(1)}" fill="${fill}"/>`, size, w };
}
const cache = new Map();
async function art(n, w, opt = {}) {
  const key = n + ':' + Math.round(w) + ':' + (opt.h || 0); if (cache.has(key)) return cache.get(key);
  let s = sharp(path.join(ART_DIR, n + '.png'));
  s = opt.h ? s.resize({ width: Math.round(w), height: Math.round(opt.h), fit: 'cover', position: opt.pos || 'centre', kernel: 'lanczos3' }) : s.resize({ width: Math.round(w), kernel: 'lanczos3' });
  const b = await s.png().toBuffer(); if (cache.size > 60) cache.clear(); cache.set(key, b); return b;
}
const meta = async (buf) => sharp(buf).metadata();

/* name split into 1-2 lines */
function nameLines(name) {
  if (name.length <= 13 || name.indexOf(' ') < 0) return [name];
  const words = name.split(' '); let best = null;
  for (let i = 1; i < words.length; i++) { const a = words.slice(0, i).join(' '), b = words.slice(i).join(' '); const d = Math.abs(a.length - b.length); if (!best || d < best.d) best = { d, l: [a, b] }; }
  return name.length <= 15 ? [name] : best.l;
}
const rule = (x1, x2, y, k, col = CHROME, op = 0.8) => `<rect x="${x1}" y="${y}" width="${x2 - x1}" height="${Math.max(2, 5 * k)}" fill="${col}" opacity="${op}"/>`;
const diamond = (cx, cy, r, col) => `<path d="M${cx} ${cy - r}L${cx + r} ${cy}L${cx} ${cy + r}L${cx - r} ${cy}Z" fill="${col}"/>`;

/* The emblem: ember sun disc, spread wings with roses, and the chosen bike silhouette riding across the sun.
   box = {cx, top, w}. Returns { defs, back, layers, bottom } */
async function emblem(t, box, disc) {
  const w = Math.round(box.w), wh = w / WINGS_AR, x = Math.round(box.cx - w / 2), y = Math.round(box.top);
  const dcx = box.cx, dcy = disc && disc.cy != null ? disc.cy : y + wh * 0.31, r = disc && disc.r ? disc.r : w * 0.17;
  const bw = Math.round(w * 0.5), bh = Math.round(bw / ASPECT[t.bike]);
  const baseY = dcy + r * 0.80; // wheels sit just below sun centre-line, tyres overlap the horizon glow
  const defs = `<defs><radialGradient id="sun" cx="50%" cy="46%" r="55%"><stop offset="0" stop-color="#ffe0a0"/><stop offset=".5" stop-color="${EMBER_HI}"/><stop offset="1" stop-color="#e2480c"/></radialGradient>` +
    `<radialGradient id="glow" cx="50%" cy="50%" r="50%"><stop offset=".55" stop-color="${EMBER}" stop-opacity=".55"/><stop offset="1" stop-color="${EMBER}" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="road" x1="0" x2="1"><stop offset="0" stop-color="${CHROME}" stop-opacity="0"/><stop offset=".25" stop-color="${CHROME}" stop-opacity=".9"/><stop offset=".75" stop-color="${CHROME}" stop-opacity=".9"/><stop offset="1" stop-color="${CHROME}" stop-opacity="0"/></linearGradient></defs>`;
  const k = w / 3000;
  const back = `<circle cx="${dcx}" cy="${dcy}" r="${r * 1.75}" fill="url(#glow)"/>`;
  const mid = `<circle cx="${dcx}" cy="${dcy}" r="${r}" fill="url(#sun)"/>` + `<rect x="${dcx - w * 0.36}" y="${baseY - 2 * k}" width="${w * 0.72}" height="${Math.max(3, 9 * k)}" fill="url(#road)"/>`;
  const layers = [
    { input: await art('wings', w), left: x, top: y, z: 0 },
    { z: 1, svg: mid },
    { input: await art('bike_' + t.bike, bw), left: Math.round(dcx - bw / 2), top: Math.round(baseY - bh * 0.93), z: 2 },
  ];
  return { defs, back, layers, bottom: y + wh };
}

function typeBlock(t, W, cx, P) { // P: {tag, tagS, name, nameS, l2, l2S, maxW, u}
  const u = P.u, lines = nameLines(t.name), out = []; let rules = '';
  const tg = textPath(barlow, t.head, cx, P.tag, P.tagS * u, EMBER, 0.2, P.maxW * 0.8); out.push(tg.svg);
  const side = (P.maxW * 0.5), gap = tg.w / 2 + u * 0.035, k = u / 3319;
  if (tg.w) rules += rule(cx - side, cx - gap, P.tag - tg.size * 0.34, k, CHROME, 0.55) + rule(cx + gap, cx + side, P.tag - tg.size * 0.34, k, CHROME, 0.55);
  const two = lines.length > 1; const ns = P.nameS * u * (two ? 0.85 : 1); const by = P.name + (two ? 0.07 * P.H : 0), l2y = Math.min(P.l2 + (two ? 0.03 * P.H : 0), 0.965 * P.H); let nsz = ns; const avail = by - P.tag - P.tagS * u * 0.5;
  const nl = lines.map(l => textPath(bebas, l, cx, 0, ns, BONE, 0.02, P.maxW)); nsz = Math.min(...nl.map(x => x.size), avail / (two ? 1.56 : 0.75));
  const gapY = nsz * 0.86;
  lines.forEach((l, i) => { out.push(textPath(bebas, l, cx, by - (lines.length - 1 - i) * gapY, nsz, BONE, 0.02, P.maxW).svg); });
  if (t.line2) {
    const l2 = textPath(barlow, t.line2, cx, l2y, P.l2S * u, CHROME, 0.1, P.maxW * 0.9); out.push(l2.svg);
    rules += diamond(cx - l2.w / 2 - u * 0.04, l2y - l2.size * 0.33, u * 0.011, EMBER) + diamond(cx + l2.w / 2 + u * 0.04, l2y - l2.size * 0.33, u * 0.011, EMBER);
  }
  return rules + out.join('');
}

const noiseCache = {};
const noise = async (s) => noiseCache[s] || (noiseCache[s] = await sharp({ create: { width: s, height: s, channels: 3, noise: { type: 'gaussian', mean: 128, sigma: 38 } } }).png().toBuffer());
async function grain(W, H, strength) { const s = Math.min(512, W, H); return sharp({ create: { width: W, height: H, channels: 3, background: '#808080' } }).composite([{ input: await noise(s), tile: true }]).linear(strength, 128 * (1 - strength)).png().toBuffer(); }

/* road backdrop for posters / flags / mug: road_a cover-cropped, darkened, with vignette */
async function roadBackdrop(W, H, sunX, sunY, dim) {
  const m = await meta(await art('road', 1536)); // source 1536x1024, sun near (0.49, 0.28)
  const scale = Math.max(W / m.width, H / m.height), sw = Math.round(m.width * scale), sh = Math.round(m.height * scale);
  let left = Math.round(W * sunX - 0.49 * sw), top = Math.round(H * sunY - 0.28 * sh);
  left = Math.min(0, Math.max(W - sw, left)); top = Math.min(0, Math.max(H - sh, top));
  const base = await sharp(path.join(ART_DIR, 'road.png')).resize({ width: sw, height: sh, kernel: 'lanczos3' }).extract({ left: -left, top: -top, width: W, height: H }).modulate({ brightness: dim }).png().toBuffer();
  return { buf: base, sun: { x: (left + 0.49 * sw), y: (top + 0.28 * sh) } };
}

const LAYOUTS = {
  /* garments: black-keyed print, no backing */
  async stack(W, H, t, o) {
    const u = o.u || Math.min(W, H * 0.9), cx = W / 2; const artH = H * o.art, aw = Math.min(W * 0.92, artH * WINGS_AR);
    const em = await emblem(t, { cx, top: H * 0.03, w: aw });
    const text = typeBlock(t, W, cx, { H, u, maxW: W * 0.9, tag: H * o.tag, tagS: o.tagS, name: H * o.name, nameS: o.nameS, l2: H * o.l2, l2S: o.l2S });
    return { defs: em.defs, back: em.back, layers: em.layers, text };
  },
  /* wall / flag: road backdrop + emblem on the real horizon sun + type */
  async scene(W, H, t, o) {
    const rd = await roadBackdrop(W, H, 0.5, o.sunY, o.dim || 0.62); const u = Math.min(W, H * 0.9), cx = W / 2;
    const aw = Math.min(W * o.aw, H * o.ah * WINGS_AR); const wh = aw / WINGS_AR; const dcy = H * o.sunY, top = dcy - wh * 0.31;
    const em = await emblem(t, { cx, top, w: aw }, { cy: dcy, r: aw * 0.17 });
    const fade = `<defs><linearGradient id="vg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${INK}" stop-opacity=".25"/><stop offset=".45" stop-color="${INK}" stop-opacity="0"/><stop offset=".62" stop-color="${INK}" stop-opacity=".78"/><stop offset="1" stop-color="${INK}" stop-opacity=".95"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#vg)"/>`;
    const k = u / 3300, m = W * 0.035;
    const frame = o.frame ? `<rect x="${m}" y="${m}" width="${W - 2 * m}" height="${H - 2 * m}" fill="none" stroke="${CHROME}" stroke-width="${7 * k}" opacity=".8"/><rect x="${m * 1.45}" y="${m * 1.45}" width="${W - 2.9 * m}" height="${H - 2.9 * m}" fill="none" stroke="${EMBER}" stroke-width="${3 * k}" opacity=".9"/>` : '';
    const text = typeBlock(t, W, cx, { H, u, maxW: W * (o.maxW || 0.8), tag: H * o.tag, tagS: o.tagS, name: H * o.name, nameS: o.nameS, l2: H * o.l2, l2S: o.l2S });
    return { opaque: true, base: rd.buf, grain: true, defs: em.defs, back: fade + em.back, layers: em.layers, text: frame + text };
  },
  /* mug wrap: backdrop everywhere, compact centred block, wing marks near the handle seam */
  async mug(W, H, t) {
    const rd = await roadBackdrop(W, H, 0.5, 0.40, 0.5); const cx = W * 0.5, u = H * 1.05;
    const aw = W * 0.30, dcy = H * 0.26, top = dcy - (aw / WINGS_AR) * 0.31;
    const em = await emblem(t, { cx: W * 0.5, top, w: aw }, { cy: dcy, r: aw * 0.17 });
    const side = [];
    for (const sx of [W * 0.1, W * 0.9]) side.push({ input: await art('wings', Math.round(W * 0.14)), left: Math.round(sx - W * 0.07), top: Math.round(H * 0.34), z: 0 });
    const fade = `<defs><linearGradient id="vg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${INK}" stop-opacity=".2"/><stop offset=".5" stop-color="${INK}" stop-opacity=".3"/><stop offset="1" stop-color="${INK}" stop-opacity=".9"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#vg)"/>`;
    const text = typeBlock(t, W, cx, { H, u, maxW: W * 0.34, tag: H * 0.665, tagS: 0.05, name: H * 0.835, nameS: 0.30, l2: H * 0.945, l2S: 0.062 });
    return { opaque: true, base: rd.buf, grain: true, defs: em.defs, back: fade + em.back, layers: [...side, ...em.layers], text };
  },
};
const PRESET = {
  tee: ['stack', { art: 0.52, tag: 0.615, tagS: 0.047, name: 0.775, nameS: 0.29, l2: 0.885, l2S: 0.066 }],
  hoodie: ['stack', { art: 0.55, tag: 0.655, tagS: 0.05, name: 0.835, nameS: 0.31, l2: 0.945, l2S: 0.066 }],
  poster: ['scene', { sunY: 0.28, aw: 0.84, ah: 0.5, tag: 0.655, tagS: 0.04, name: 0.79, nameS: 0.25, l2: 0.865, l2S: 0.052, frame: true, maxW: 0.78 }],
  flag: ['scene', { sunY: 0.31, aw: 0.5, ah: 0.5, tag: 0.66, tagS: 0.052, name: 0.82, nameS: 0.34, l2: 0.915, l2S: 0.075, maxW: 0.62 }],
  mug: ['mug', {}],
};
async function compose(layout, W, H, input) {
  const t = QText.resolve(input); const [fn, o] = PRESET[layout]; const spec = await LAYOUTS[fn](W, H, t, o);
  const svg = (inner) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${spec.defs || ''}${inner}</svg>`);
  const comps = []; // order: back svg (+glow), wings, sun/road svg, bike, text
  const ls = [...spec.layers].sort((a, b) => a.z - b.z);
  if (spec.back) comps.push({ input: svg(spec.back), left: 0, top: 0 });
  for (const l of ls) comps.push(l.svg ? { input: svg(l.svg), left: 0, top: 0 } : { input: l.input, left: Math.max(0, l.left), top: Math.max(0, l.top) });
  comps.push({ input: svg(spec.text), left: 0, top: 0 });
  let base = spec.base ? sharp(spec.base) : sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });
  if (spec.grain) comps.unshift({ input: await grain(W, H, 0.5), blend: 'overlay' });
  // glow svg must sit above the grain but below art; grain is first (applies to backdrop only)
  const out = base.composite(comps); return spec.opaque ? out.flatten({ background: INK }).jpeg({ quality: 90, chromaSubsampling: '4:4:4' }).toBuffer() : out.png({ compressionLevel: 8 }).toBuffer();
}
const OPAQUE = new Set(['poster', 'flag', 'mug']);
module.exports = { compose, ext: (layout) => OPAQUE.has(layout) ? 'jpg' : 'png' };
