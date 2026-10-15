// E2E check against a locally running server (staging). Creates a Stripe Checkout Session (no charge), expires it,
// then replays a locally-signed checkout.session.completed webhook in PRINTIFY_DRY_RUN mode (real Printify uploads + shipping quote, no order).
const fs = require('fs'); const env = {};
for (const l of fs.readFileSync(__dirname + '/../.env', 'utf8').split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2]; }
const stripe = require('stripe')(env.STRIPE_SECRET_KEY); const BASE = process.env.E2E_BASE || ('http://localhost:' + env.PORT);
const P = { event: 'quince', name: 'Valentina', date: '2027-03-20', role: 'corte', lang: 'es' };
(async () => {
  const cat = await (await fetch(BASE + '/api/catalog')).json();
  const tee = cat.products.find(p => p.slug === 'crew-tee').variants.find(v => v.color === 'Black' && v.size === 'M');
  const items = [{ slug: 'crew-tee', variantId: tee.id, qty: 2, p: P }, { slug: 'bundle', bundle: cat.bundle.parts.map(s => ({ slug: s, variantId: s === 'crew-tee' ? tee.id : cat.products.find(p => p.slug === s).variants[0].id })), qty: 1, p: P }];
  let r = await fetch(BASE + '/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items, email: 'test@example.com', lang: 'es', utm: { utm_source: 'tiktok' } }) });
  const co = await r.json(); console.log('checkout', r.status, co.url ? 'url ok ' + co.url.slice(0, 32) : JSON.stringify(co), 'total', co.total);
  if (!co.sessionId) process.exit(1);
  const s = await stripe.checkout.sessions.retrieve(co.sessionId, { expand: ['line_items'] });
  console.log('stripe session', s.id.slice(0, 12), s.mode, s.status, 'amount_total', s.amount_total, 'lines', s.line_items.data.map(l => l.description + ' x' + l.quantity + ' ' + l.amount_total).join(' | '));
  console.log('shipping option present:', !!s.shipping_options.length, 'metadata.store', s.metadata.store);
  await stripe.checkout.sessions.expire(co.sessionId); console.log('session expired (no charge)');
  const evt = { id: 'evt_local1', object: 'event', type: 'checkout.session.completed', data: { object: { id: 'cs_local_' + co.orderId, object: 'checkout.session', payment_status: 'paid', metadata: { store: 'quince-events', order_id: co.orderId },
    customer_details: { email: 'test@example.com', name: 'Test Buyer', phone: '4075551212' }, shipping_details: { name: 'Test Buyer', address: { line1: '1 Test St', city: 'Orlando', state: 'FL', postal_code: '32801', country: 'US' } } } } };
  const body = JSON.stringify(evt); const sig = stripe.webhooks.generateTestHeaderString({ payload: body, secret: env.STRIPE_WEBHOOK_SECRET });
  r = await fetch(BASE + '/api/stripe-webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'stripe-signature': sig }, body });
  console.log('webhook', r.status, (await r.text()).slice(0, 400));
  r = await fetch(BASE + '/api/stripe-webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'stripe-signature': 't=1,v1=bad' }, body }); console.log('bad signature ->', r.status);
})().catch(e => { console.error('E2E FAIL', e.message); process.exit(1); });
