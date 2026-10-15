// Registers the Stripe webhook endpoint for the chosen domain via the API and stores the signing secret in .webhook-secret (gitignored). Never prints secrets.
const fs = require('fs'), path = require('path'); const domain = process.argv[2]; if (!domain) { console.error('usage: node deploy/register-webhook.js <domain>'); process.exit(1); }
const env = {}; for (const l of fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8').split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2]; }
const stripe = require('stripe')(env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY); const url = `https://${domain}/api/stripe-webhook`;
(async () => {
  const existing = (await stripe.webhookEndpoints.list({ limit: 100 })).data.find(w => w.url === url);
  if (existing) { console.log('webhook already registered for', url, existing.id, '(secret cannot be re-read; delete the endpoint first if the secret was lost)'); return; }
  const ep = await stripe.webhookEndpoints.create({ url, enabled_events: ['checkout.session.completed'], description: 'vtwinriderkit store -> Printify fulfilment' });
  fs.writeFileSync(path.join(__dirname, '..', '.webhook-secret'), `STRIPE_WEBHOOK_SECRET=${ep.secret}\n`, { mode: 0o600 }); console.log('registered', ep.id, url, 'status', ep.status);
})().catch(e => { console.error('register failed:', e.message); process.exit(1); });

