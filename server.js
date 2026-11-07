'use strict';
/* V-Twin Rider Kit storefront: static single page + /api/checkout (Stripe Checkout) + Stripe webhook -> Printify order. */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = __dirname;
try { for (const l of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); } } catch (e) { /* env from the process instead */ }
const express = require('express');
const QText = require('./public/qtext.js');
const cfg = require('./lib/config.js');
const { compose, ext } = require('./lib/compose.js');
const sharp = require('sharp');
const CAT = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'products.json'), 'utf8'));
const PORT = parseInt(process.env.PORT || '3126', 10);
const SITE_URL = (process.env.SITE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const BRAND = process.env.BRAND_NAME || 'V-Twin Rider Kit';
const STORE_ID = 'vtwinriderkit';
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'hello@vtwinriderkit.org';
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
fs.mkdirSync(path.join(DATA_DIR, 'orders'), { recursive: true });
const FULFILLED = path.join(DATA_DIR, 'fulfilled.json');
const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;
const SHIP = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'shipping.json'), 'utf8'));
const bySlug = Object.fromEntries(cfg.products.map(p => [p.slug, p]));

/* ---------- catalog helpers ---------- */
function variantOf(slug, id) { const d = CAT[slug]; return d && d.variants.find(v => v.id === id); }
function publicCatalog() {
  return cfg.products.map(p => { const d = CAT[p.slug]; return { slug: p.slug, name: p.name, short: p.short, blurb: p.blurb, minPrice: d.min_price,
    variants: d.variants.map(v => ({ id: v.id, title: v.title, color: v.color || null, size: v.sizeLabel || null, price: v.price })),
    images: d.images.map(i => ({ file: i.file, variant_ids: i.variant_ids })) }; });
}
/* Pass-through Printify US shipping: per print provider, highest first-item rate + each extra unit at its additional rate */
function shippingFor(units) {
  const groups = {};
  for (const u of units) { const r = (SHIP[u.slug].by[u.variantId]) || { first: 999, add: 400 }; (groups[SHIP[u.slug].provider] = groups[SHIP[u.slug].provider] || []).push(r); }
  let total = 0; for (const g of Object.values(groups)) { g.sort((a, b) => b.first - a.first); total += g[0].first; for (let i = 1; i < g.length; i++) total += g[i].add; }
  return total;
}
function money(c) { return '$' + (c / 100).toFixed(2); }
function normPersonal(p) { const t = QText.resolve(p || {}); return { mode: t.mode, name: t.name, line2: t.line2, tag: t.tag, bike: t.bike }; }
function tail(s) { return String(s || '').slice(0, 64); }
function variantLabel(v) { return [v.color, v.sizeLabel].filter(Boolean).join(' / ') || (v.title || '').replace(/ \/.*$/, ''); }

/* Validate a client cart and price it from the server-side catalog. */
function priceCart(items) {
  if (!Array.isArray(items) || !items.length || items.length > 20) throw Object.assign(new Error('Cart is empty or too large.'), { status: 400 });
  const lines = []; let subtotal = 0;
  for (const it of items) {
    const qty = Math.max(1, Math.min(20, parseInt(it.qty, 10) || 1)); const personal = normPersonal(it.p);
    const v = bySlug[it.slug] && variantOf(it.slug, it.variantId); if (!v) throw Object.assign(new Error('Unknown product or variant.'), { status: 400 });
    subtotal += v.price * qty;
    lines.push({ slug: it.slug, variantId: v.id, qty, unit: v.price, personal, name: `${bySlug[it.slug].name} - ${personal.name} (${variantLabel(v)})` });
  }
  const units = []; for (const l of lines) for (let i = 0; i < l.qty; i++) units.push({ slug: l.slug, variantId: l.variantId });
  const shipping = shippingFor(units);
  return { lines, subtotal, shipping, total: subtotal + shipping };
}

/* ---------- Printify ---------- */
async function pfy(method, p, body) {
  const r = await fetch('https://api.printify.com' + p, { method, headers: { Authorization: `Bearer ${process.env.PRINTIFY_API_TOKEN}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); if (!r.ok) throw new Error(`printify ${method} ${p} ${r.status} ${t.slice(0, 200)}`);
  return t ? JSON.parse(t) : {};
}
/* One personalised print file per unit -> a one-off Printify product -> returned as order line item */
async function buildLineItem(slug, variantId, qty, personal, orderId) {
  const p = bySlug[slug], v = variantOf(slug, variantId), size = v.size;
  const png = await compose(p.layout, size[0], size[1], personal);
  const up = await pfy('POST', '/v1/uploads/images.json', { file_name: `order-${orderId}-${slug}.${ext(p.layout)}`, contents: png.toString('base64') });
  const prod = await pfy('POST', `/v1/shops/${process.env.PRINTIFY_SHOP_ID}/products.json`, {
    title: `ORDER ${orderId} ${p.name} ${personal.name}`.slice(0, 120), description: 'Personalized order item', blueprint_id: p.blueprint, print_provider_id: p.provider,
    variants: [{ id: variantId, price: 100, is_enabled: true }],
    print_areas: [{ variant_ids: [variantId], placeholders: [{ position: 'front', images: [{ id: up.id, x: 0.5, y: 0.5, scale: 1, angle: 0 }] }] }] });
  return { product_id: prod.id, variant_id: variantId, quantity: qty, _slug: slug };
}
function addressFrom(session, email) {
  const sd = (session.shipping_details || (session.collected_information && session.collected_information.shipping_details)) || {};
  const a = sd.address || {}; const full = String(sd.name || (session.customer_details && session.customer_details.name) || 'Customer').trim().split(/\s+/);
  return { first_name: full[0] || 'Customer', last_name: full.slice(1).join(' ') || '-', email: email || (session.customer_details && session.customer_details.email) || '', phone: (session.customer_details && session.customer_details.phone) || '0000000000',
    country: a.country || 'US', region: a.state || '', address1: a.line1 || '', address2: a.line2 || '', city: a.city || '', zip: a.postal_code || '' };
}
const inflight = new Set();
const fulfilled = (() => { try { return new Set(JSON.parse(fs.readFileSync(FULFILLED, 'utf8'))); } catch (e) { return new Set(); } })();
function markFulfilled(id) { fulfilled.add(id); fs.writeFileSync(FULFILLED, JSON.stringify([...fulfilled])); }

async function fulfillSession(session, { dryRun = false } = {}) {
  const orderId = session.metadata && session.metadata.order_id; if (!orderId) throw new Error('no order_id in session metadata');
  if (!dryRun && fulfilled.has(session.id)) return { duplicate: true };
  const order = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'orders', orderId + '.json'), 'utf8'));
  const items = [];
  for (const ln of order.lines) items.push(await buildLineItem(ln.slug, ln.variantId, ln.qty, ln.personal, orderId));
  const body = { external_id: `${STORE_ID}-${orderId}`.slice(0, 60), label: orderId, line_items: items.map(({ _slug, ...rest }) => rest), shipping_method: 1, send_shipping_notification: true, address_to: addressFrom(session, order.email) };
  if (dryRun) {
    const ship = await pfy('POST', `/v1/shops/${process.env.PRINTIFY_SHOP_ID}/orders/shipping.json`, { line_items: body.line_items, address_to: body.address_to });
    for (const it of items) await pfy('DELETE', `/v1/shops/${process.env.PRINTIFY_SHOP_ID}/products/${it.product_id}.json`).catch(() => {});
    return { dryRun: true, lineItems: items.length, shipping: ship };
  }
  const created = await pfy('POST', `/v1/shops/${process.env.PRINTIFY_SHOP_ID}/orders.json`, body);
  if (process.env.PRINTIFY_AUTO_SUBMIT !== '0') await pfy('POST', `/v1/shops/${process.env.PRINTIFY_SHOP_ID}/orders/${created.id}/send_to_production.json`, {});
  markFulfilled(session.id); order.printify_order_id = created.id; order.fulfilled_at = new Date().toISOString();
  fs.writeFileSync(path.join(DATA_DIR, 'orders', orderId + '.json'), JSON.stringify(order, null, 1));
  console.log('fulfilled', orderId, 'printify', created.id); return { printify_order_id: created.id };
}

/* ---------- app ---------- */
const app = express(); app.use(require('compression')()); app.disable('x-powered-by'); app.set('trust proxy', 1);
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const wh = process.env.STRIPE_WEBHOOK_SECRET; if (!stripe || !wh) return res.status(503).json({ error: 'webhook not configured' });
  let ev; try { ev = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'] || '', wh); } catch (e) { return res.status(400).json({ error: 'bad signature' }); }
  try {
    if (ev.type === 'checkout.session.completed' && ev.data.object.payment_status === 'paid' && ev.data.object.metadata && ev.data.object.metadata.store === STORE_ID) {
      const sess = ev.data.object; if (fulfilled.has(sess.id) || inflight.has(sess.id)) return res.json({ received: true, duplicate: true });
      inflight.add(sess.id); res.json({ received: true, queued: true });
      const dry = process.env.PRINTIFY_DRY_RUN === '1';
      (async () => { for (let attempt = 1; attempt <= 4; attempt++) { try { const r = await fulfillSession(sess, { dryRun: dry }); console.log('fulfil result', sess.id, JSON.stringify(r)); break; } catch (e) { console.error('fulfil attempt', attempt, 'failed:', e.message); if (attempt === 4) fs.appendFileSync(path.join(DATA_DIR, 'FAILED-FULFILMENT.log'), new Date().toISOString() + ' ' + sess.id + ' ' + e.message + '\n'); else await new Promise(r => setTimeout(r, 30000 * attempt)); } } inflight.delete(sess.id); })();
      return;
    }
    res.json({ received: true, ignored: ev.type });
  } catch (e) { console.error('webhook error', e.message); res.status(500).json({ error: 'fulfilment failed' }); }
});
app.use(express.json({ limit: '100kb' }));
const hits = new Map(); const limit = (max) => (req, res, next) => { const k = req.ip + req.path, now = Date.now(), a = (hits.get(k) || []).filter(t => now - t < 60000); a.push(now); hits.set(k, a); if (a.length > max) return res.status(429).json({ error: 'Too many requests' }); next(); };

app.get('/api/catalog', (req, res) => res.json({ brand: BRAND, ship: SHIP, products: publicCatalog() }));
app.get('/api/health', (req, res) => res.json({ ok: true, stripe: !!stripe, stripeMode: stripe ? (String(process.env.STRIPE_SECRET_KEY).startsWith('sk_live') ? 'live' : 'test') : null, webhook: !!process.env.STRIPE_WEBHOOK_SECRET, printify: !!process.env.PRINTIFY_API_TOKEN, products: Object.keys(CAT).length }));
app.post('/api/checkout', limit(15), async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Checkout is being set up. Please check back shortly.' });
    const cart = priceCart(req.body.items); const email = String(req.body.email || '').slice(0, 200); const orderId = crypto.randomBytes(5).toString('hex');
    const utm = {}; for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']) if (req.body.utm && req.body.utm[k]) utm[k] = tail(req.body.utm[k]);
    fs.writeFileSync(path.join(DATA_DIR, 'orders', orderId + '.json'), JSON.stringify({ orderId, created: new Date().toISOString(), email, lines: cart.lines, totals: { subtotal: cart.subtotal, shipping: cart.shipping, total: cart.total }, utm }, null, 1));
    const session = await stripe.checkout.sessions.create({
      mode: 'payment', customer_email: email || undefined, client_reference_id: orderId, locale: 'en',
      line_items: cart.lines.map(l => ({ quantity: l.qty, price_data: { currency: 'usd', unit_amount: l.unit, product_data: { name: l.name.slice(0, 120), description: [QText.resolve(l.personal).head, QText.resolve(l.personal).name, QText.resolve(l.personal).line2].filter(Boolean).join(' - ').slice(0, 300) } } })),
      shipping_address_collection: { allowed_countries: ['US'] }, phone_number_collection: { enabled: true },
      shipping_options: [{ shipping_rate_data: { type: 'fixed_amount', fixed_amount: { amount: cart.shipping, currency: 'usd' }, display_name: 'US standard shipping (made to order)', delivery_estimate: { minimum: { unit: 'business_day', value: 5 }, maximum: { unit: 'business_day', value: 12 } } } }],
      metadata: { store: STORE_ID, order_id: orderId, ...utm }, payment_intent_data: { metadata: { store: STORE_ID, order_id: orderId } },
      success_url: `${SITE_URL}/?order=thanks#top`, cancel_url: `${SITE_URL}/checkout`,
    });
    res.json({ url: session.url, sessionId: session.id, orderId, total: cart.total });
  } catch (e) { console.error('checkout:', e.message); res.status(e.status || 502).json({ error: e.status ? e.message : 'Could not start checkout. Please try again.' }); }
});
app.post('/api/price', limit(60), (req, res) => { try { const c = priceCart(req.body.items); res.json({ subtotal: c.subtotal, shipping: c.shipping, total: c.total }); } catch (e) { res.status(e.status || 400).json({ error: e.message }); } });

/* Server-rendered print preview: the same renderer that makes the real print file, just smaller. */
const pvCache = new Map();
const PV_SIZE = { tee: [3319, 3761], hoodie: [2894, 2368], poster: [3300, 4200], flag: [5695, 3892], mug: [2480, 1146] };
app.get('/api/preview.png', limit(90), async (req, res) => {
  try {
    const layout = PV_SIZE[req.query.p] ? req.query.p : 'tee'; const t = QText.resolve(req.query);
    const key = layout + '|' + JSON.stringify(t); let buf = pvCache.get(key);
    if (!buf) {
      const [w, h] = PV_SIZE[layout], W = layout === 'mug' || layout === 'flag' ? 900 : 640, H = Math.round(W * h / w);
      buf = await sharp(await compose(layout, W, H, t)).resize({ width: W }).webp({ quality: 88 }).toBuffer();
      if (pvCache.size > 300) pvCache.clear(); pvCache.set(key, buf);
    }
    res.type('image/webp').set('Cache-Control', 'public, max-age=3600').send(buf);
  } catch (e) { console.error('preview', e.message); res.status(500).end(); }
});

/* ---------- pages (templates with SITE_URL / JSON-LD injected) ---------- */
const FAQ = JSON.parse(fs.readFileSync(path.join(ROOT, 'public', 'faq.json'), 'utf8'));
function jsonLd() {
  const prods = publicCatalog().map(p => { const d = CAT[p.slug]; const prices = d.variants.map(v => v.price); const img = SITE_URL + '/img/mock/' + d.images[0].file;
    return { '@type': 'Product', name: bySlug[p.slug].title, description: bySlug[p.slug].description, image: img, brand: { '@type': 'Brand', name: BRAND }, sku: p.slug, url: `${SITE_URL}/#item-${p.slug}`,
      offers: { '@type': 'AggregateOffer', priceCurrency: 'USD', lowPrice: (Math.min(...prices) / 100).toFixed(2), highPrice: (Math.max(...prices) / 100).toFixed(2), offerCount: prices.length, availability: 'https://schema.org/InStock', url: `${SITE_URL}/#item-${p.slug}`,
        shippingDetails: { '@type': 'OfferShippingDetails', shippingRate: { '@type': 'MonetaryAmount', value: (Math.min(...Object.values(SHIP[p.slug].by).map(x => x.first)) / 100).toFixed(2), currency: 'USD' }, shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'US' }, deliveryTime: { '@type': 'ShippingDeliveryTime', handlingTime: { '@type': 'QuantitativeValue', minValue: 2, maxValue: 5, unitCode: 'DAY' }, transitTime: { '@type': 'QuantitativeValue', minValue: 3, maxValue: 8, unitCode: 'DAY' } } },
        hasMerchantReturnPolicy: { '@type': 'MerchantReturnPolicy', applicableCountry: 'US', returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted', merchantReturnLink: SITE_URL + '/#returns' } } }; });
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': [
    { '@type': 'Organization', '@id': SITE_URL + '/#org', name: BRAND, url: SITE_URL, logo: SITE_URL + '/favicon.svg', email: CONTACT_EMAIL },
    { '@type': 'WebSite', '@id': SITE_URL + '/#site', url: SITE_URL, name: BRAND, inLanguage: 'en', publisher: { '@id': SITE_URL + '/#org' } },
    ...prods,
    { '@type': 'FAQPage', mainEntity: FAQ.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) } ] });
}
function pixels() {
  let s = '';
  if (process.env.META_PIXEL_ID) s += `<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${process.env.META_PIXEL_ID.replace(/\W/g, '')}');fbq('track','PageView');</script>`;
  if (process.env.TIKTOK_PIXEL_ID) s += `<script>!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.load=function(e){var n="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._t=ttq._t||{};ttq._t[e]=+new Date;var o=document.createElement("script");o.type="text/javascript";o.async=!0;o.src=n+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${process.env.TIKTOK_PIXEL_ID.replace(/\W/g, '')}');ttq.page()}(window,document,'ttq');</script>`;
  return s;
}
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
function productsHtml() {
  return cfg.products.map((p, i) => { const d = CAT[p.slug]; const img = d.images[0].file;
    return '<article class="card" id="item-' + p.slug + '" data-slug="' + p.slug + '"><div class="card-img"><img src="/img/mock/' + img + '" srcset="/img/mock/s/' + img + ' 480w, /img/mock/' + img + ' 800w" sizes="(min-width:760px) 360px, 90vw" alt="' + esc(p.name + ' - Printify product photo, personalized ride in memory design') + '" width="800" height="800"' + (i < 2 ? ' fetchpriority="high"' : ' loading="lazy"') + '></div><div class="thumbs"></div><div class="card-body"><p class="kicker">' + esc(p.short) + '</p><h3>' + esc(p.name) + '</h3><p class="blurb">' + esc(p.blurb) + '</p><div class="opts"></div><p class="will-print"></p><div class="price-row"><span class="price">from ' + money(d.min_price) + '</span><span class="ship-note"></span></div><button type="button" class="btn add">Add to cart</button></div></article>'; }).join('\n');
}
function faqHtml() { return FAQ.map(f => `<details class="faq"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('\n'); }
function render(file) {
  const html = fs.readFileSync(path.join(ROOT, 'public', file), 'utf8');
  return html.replace(/\{\{SITE_URL\}\}/g, SITE_URL).replace(/\{\{BRAND\}\}/g, BRAND).replace(/\{\{CONTACT_EMAIL\}\}/g, CONTACT_EMAIL).replace('{{JSONLD}}', () => jsonLd().replace(/</g, '\\u003c')).replace('{{PIXELS}}', () => pixels())
    .replace('{{FAQ}}', () => faqHtml()).replace('{{PRODUCTS}}', () => productsHtml()).replace('{{OG_IMAGE}}', SITE_URL + '/img/og.jpg');
}
app.get(['/', '/index.html'], (req, res) => res.type('html').set('Cache-Control', 'no-cache').send(render('index.html')));
app.get('/checkout', (req, res) => res.type('html').set('Cache-Control', 'no-cache').send(render('checkout.html')));
app.get('/robots.txt', (req, res) => res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /checkout\nSitemap: ${SITE_URL}/sitemap.xml\n`));
app.get('/sitemap.xml', (req, res) => { const d = new Date().toISOString().slice(0, 10); res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n<url><loc>${SITE_URL}/</loc><lastmod>${d}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority>${cfg.products.map(p => `<image:image><image:loc>${SITE_URL}/img/mock/${CAT[p.slug].images[0].file}</image:loc><image:title>${esc(p.title)}</image:title></image:image>`).join('')}</url>\n</urlset>\n`); });
app.use(express.static(path.join(ROOT, 'public'), { index: false, maxAge: '30d', setHeaders: (r, f) => { if (/\.(html|json)$/.test(f)) r.setHeader('Cache-Control', 'no-cache'); } }));
app.use((req, res) => res.status(404).type('text/plain').send('Not found'));
if (require.main === module) app.listen(PORT, process.env.HOST || '127.0.0.1', () => console.log(`${STORE_ID} on ${process.env.HOST || '127.0.0.1'}:${PORT} (${SITE_URL})`));
module.exports = { app, fulfillSession, priceCart };
