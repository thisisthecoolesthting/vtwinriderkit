(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var store = { get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  var S = store.get('vtrk_state', null) || { mode: 'memorial', name: '', from: '', to: '', run: '', tag: '', bike: 'cruiser', pv: 'tee' };
  var cart = store.get('vtrk_cart', []); var CAT = null, catBy = {};
  var money = function (c) { return '$' + (c / 100).toFixed(2); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  function utm() { var o = store.get('vtrk_utm', {}), q = new URLSearchParams(location.search); ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'].forEach(function (k) { if (q.get(k)) o[k] = q.get(k); }); store.set('vtrk_utm', o); return o; }
  function track(ev, data) { try { if (window.fbq) fbq('track', ev, data || {}); if (window.ttq) ttq.track(ev, data || {}); } catch (e) {} }
  function toast(msg) { var el = $('#toast'); if (!el) return; el.textContent = msg; el.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(function () { el.classList.remove('show'); }, 2200); }
  function line2() { return S.mode === 'club' ? S.run : [S.from, S.to].filter(Boolean).join(' – '); }
  function personal() { return { mode: S.mode, name: S.name, line2: line2(), tag: S.tag, bike: S.bike }; }
  function resolved() { return QText.resolve(personal()); }
  function save() { store.set('vtrk_state', S); }

  /* ---------- builder + live preview ---------- */
  function fillTags() { var sel = $('#fTag'); if (!sel) return; var list = QText.TAGS[S.mode]; if (!list.some(function (x) { return x.k === S.tag; })) S.tag = list[0].k; sel.innerHTML = list.map(function (x) { return '<option value="' + x.k + '"' + (x.k === S.tag ? ' selected' : '') + '>' + esc(x.t) + '</option>'; }).join(''); }
  function applyMode() {
    var club = S.mode === 'club'; $('#lName').textContent = club ? 'Club or run name' : "Rider's name"; $('#fName').placeholder = club ? 'Iron Road Riders' : 'Dale Ruiz';
    $('#datesMemorial').hidden = club; $('#datesClub').hidden = !club; fillTags();
  }
  var pvTimer, pvReq = 0;
  function previewUrl(kind) { var nm = S.name, l2 = line2(); if (!nm) { nm = S.mode === 'club' ? 'Iron Road Riders' : 'Dale Ruiz'; if (!l2) l2 = S.mode === 'club' ? 'Memorial Run 2027' : '1961 \u2013 2025'; } var q = new URLSearchParams({ p: kind, mode: S.mode, name: nm, line2: l2, tag: S.tag, bike: S.bike }); return '/api/preview.png?' + q.toString(); }
  function renderPreview(now) {
    var r = resolved(); var sample = !S.name;
    var txt = [r.head, sample ? 'Your name' : r.name, r.line2].filter(Boolean).join(' · ');
    $$('.will-print').forEach(function (el) { el.textContent = 'Will print: ' + txt; });
    var bn = $('#buybarName'); if (bn) { bn.textContent = sample ? 'Your rider' : r.name; $('#buybarSub').textContent = [r.head, r.line2].filter(Boolean).join(' · '); }
    clearTimeout(pvTimer); pvTimer = setTimeout(loadPreview, now ? 0 : 320);
  }
  function loadPreview() {
    var box = $('#pv'), img = $('#pvImg'); if (!box) return; var id = ++pvReq; box.classList.add('busy'); box.setAttribute('data-kind', S.pv);
    var n = new Image(); n.onload = function () { if (id !== pvReq) return; img.src = n.src; img.width = n.naturalWidth; img.height = n.naturalHeight; box.classList.remove('busy'); }; n.onerror = function () { box.classList.remove('busy'); }; n.src = previewUrl(S.pv);
  }
  function bindBuilder() {
    if (!$('#builder')) return;
    $$('input[name=mode]').forEach(function (i) { i.checked = i.value === S.mode; i.addEventListener('change', function () { S.mode = i.value; applyMode(); save(); renderPreview(true); }); });
    $$('input[name=bike]').forEach(function (i) { i.checked = i.value === S.bike; i.addEventListener('change', function () { S.bike = i.value; save(); renderPreview(true); }); });
    $('#fName').value = S.name; $('#fFrom').value = S.from; $('#fTo').value = S.to; $('#fRun').value = S.run;
    var clean = function (el, key) { el.addEventListener('input', function (e) { S[key] = e.target.value.replace(/[^\p{L}\p{M}0-9 '.,&:\/\-–—·]/gu, '').slice(0, +el.getAttribute('maxlength')); if (e.target.value !== S[key]) e.target.value = S[key]; save(); renderPreview(); }); };
    clean($('#fName'), 'name'); clean($('#fFrom'), 'from'); clean($('#fTo'), 'to'); clean($('#fRun'), 'run');
    $('#fTag').addEventListener('change', function (e) { S.tag = e.target.value; save(); renderPreview(true); });
    $$('.tabs button').forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-pv') === S.pv ? 'true' : 'false'); b.addEventListener('click', function () { S.pv = b.getAttribute('data-pv'); $$('.tabs button').forEach(function (x) { x.setAttribute('aria-selected', x === b ? 'true' : 'false'); }); save(); renderPreview(true); }); });
    applyMode();
  }

  /* ---------- catalog cards ---------- */
  function variantById(slug, id) { var p = catBy[slug]; return p && p.variants.filter(function (v) { return v.id === id; })[0]; }
  function imagesFor(slug, vid) { var p = catBy[slug]; var l = p.images.filter(function (i) { return !i.variant_ids || i.variant_ids.indexOf(vid) >= 0; }); return l.length ? l : p.images; }
  function optsHtml(p, sel) {
    var cols = [], sizes = [];
    p.variants.forEach(function (v) { if (v.color && cols.indexOf(v.color) < 0) cols.push(v.color); if (v.size && sizes.indexOf(v.size) < 0) sizes.push(v.size); });
    if (cols.length) return '<div><label>Color</label><select data-o="color" aria-label="Color">' + cols.map(function (c) { return '<option' + (c === sel.color ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select></div><div><label>Size</label><select data-o="size" aria-label="Size">' + sizes.map(function (s) { return '<option' + (s === sel.size ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></div>';
    if (p.variants.length > 1) return '<div style="grid-column:1/-1"><label>Size</label><select data-o="variant" aria-label="Size">' + p.variants.map(function (v) { return '<option value="' + v.id + '"' + (v.id === sel.variant ? ' selected' : '') + '>' + esc(sizeName(v)) + ' (' + money(v.price) + ')</option>'; }).join('') + '</select></div>';
    return '';
  }
  function sizeName(v) { return (v.size || v.title || '').replace(/″/g, ' in').replace(/"/g, ' in').replace(/ \/.*$/, ''); }
  function pickVariant(p, sel) {
    if (sel.variant) return variantById(p.slug, +sel.variant);
    var m = p.variants.filter(function (v) { return (!v.color || v.color === sel.color) && (!v.size || v.size === sel.size); })[0]; return m || p.variants[0];
  }
  var sels = {};
  function selFor(p) { if (!sels[p.slug]) { var f = p.variants[0]; sels[p.slug] = { color: f.color, size: f.size, variant: p.variants.length > 1 && !f.color ? f.id : null, img: 0 }; } return sels[p.slug]; }
  function shipFrom(slug) { var by = CAT.ship[slug].by, m = 1e9; Object.keys(by).forEach(function (k) { if (by[k].first < m) m = by[k].first; }); return m; }
  function renderCards() {
    CAT.products.forEach(function (p) {
      var card = $('#item-' + p.slug); if (!card) return; var sel = selFor(p), v = pickVariant(p, sel); var imgs = imagesFor(p.slug, v.id).slice(0, 4); if (sel.img >= imgs.length) sel.img = 0;
      var im = $('.card-img img', card); var f = imgs[sel.img].file; if (im.getAttribute('src') !== '/img/mock/' + f) { im.src = '/img/mock/' + f; im.srcset = '/img/mock/s/' + f + ' 480w, /img/mock/' + f + ' 800w'; }
      $('.opts', card).innerHTML = optsHtml(p, sel); $('.opts', card).className = 'opts' + (p.variants.length === 1 ? ' single' : '');
      $('.thumbs', card).innerHTML = imgs.length > 1 ? imgs.map(function (i, k) { return '<button type="button" data-k="' + k + '" aria-label="View photo ' + (k + 1) + '"' + (k === sel.img ? ' aria-current="true"' : '') + '><img src="/img/mock/s/' + i.file + '" alt="" loading="lazy" width="52" height="52"></button>'; }).join('') : '';
      $('.price', card).textContent = money(v.price); $('.ship-note', card).textContent = '+ shipping from ' + money(shipFrom(p.slug));
    });
    renderPreview();
  }

  /* ---------- cart ---------- */
  function addItem(it) {
    var hit = cart.filter(function (c) { return c.slug === it.slug && c.variantId === it.variantId && JSON.stringify(c.p) === JSON.stringify(it.p); })[0];
    if (hit) hit.qty = Math.min(20, hit.qty + 1); else cart.push(it);
    store.set('vtrk_cart', cart); renderCart(); toast('Added to cart'); track('AddToCart', { content_name: it.slug, currency: 'USD' });
  }
  function lineInfo(c) { var p = QText.resolve(c.p), pr = catBy[c.slug], v = variantById(c.slug, c.variantId); var det = [v.color, v.size && pr.variants.length > 0 && sizeName(v)].filter(Boolean).join(' · '); return { name: pr.name + (det ? ' (' + det + ')' : ''), unit: v.price, img: imagesFor(c.slug, c.variantId)[0].file, text: [p.head, p.name, p.line2].filter(Boolean).join(' · ') }; }
  function shipCost() { var g = {}; cart.forEach(function (c) { for (var q = 0; q < c.qty; q++) { var s = CAT.ship[c.slug], r = s.by[c.variantId] || { first: 999, add: 400 }; (g[s.provider] = g[s.provider] || []).push(r); } }); var tot = 0; Object.keys(g).forEach(function (k) { var a = g[k].sort(function (x, y) { return y.first - x.first; }); tot += a[0].first; for (var i = 1; i < a.length; i++) tot += a[i].add; }); return tot; }
  function totals() { var sub = 0; cart.forEach(function (c) { sub += lineInfo(c).unit * c.qty; }); var ship = sub === 0 ? 0 : shipCost(); return { sub: sub, ship: ship, total: sub + ship }; }
  function linesHtml(editable) {
    if (!cart.length) return '<p class="empty">Your cart is empty.</p>';
    return cart.map(function (c, i) { var l = lineInfo(c); return '<div class="line"><img src="/img/mock/s/' + l.img + '" alt="" width="64" height="64"><div><h4>' + esc(l.name) + '</h4><small>' + esc(l.text) + '</small>' + (editable ? '<div class="qty"><button type="button" data-q="-1" data-i="' + i + '" aria-label="Fewer">&minus;</button><b>' + c.qty + '</b><button type="button" data-q="1" data-i="' + i + '" aria-label="More">+</button><button type="button" class="rm" data-rm="' + i + '">Remove</button></div>' : '<small>x ' + c.qty + '</small>') + '</div><b>' + money(l.unit * c.qty) + '</b></div>'; }).join('');
  }
  function totalsHtml() { var x = totals(); return '<div class="tot"><span>Subtotal</span><span>' + money(x.sub) + '</span></div><div class="tot"><span>Shipping (US)</span><span>' + money(x.ship) + '</span></div><div class="tot big"><span>Total</span><span>' + money(x.total) + '</span></div>'; }
  function renderCart() {
    var n = cart.reduce(function (a, c) { return a + c.qty; }, 0);
    var cc = $('#cartCount'); if (cc) { cc.textContent = n; cc.hidden = !n; } var bc = $('#buybarCount'); if (bc) bc.textContent = n;
    var body = $('#cartLines'); if (!body || !CAT) return; body.innerHTML = linesHtml(true);
    $('#cartFoot').innerHTML = cart.length ? totalsHtml() + '<a class="btn" href="/checkout">Checkout</a>' : '';
  }
  function bindCart() {
    var d = $('#drawer'); if (!d) return;
    var open = function () { d.classList.add('open'); d.setAttribute('aria-hidden', 'false'); }, close = function () { d.classList.remove('open'); d.setAttribute('aria-hidden', 'true'); };
    ['#openCart', '#buybarCart'].forEach(function (s) { $(s).addEventListener('click', open); }); $$('[data-close]', d).forEach(function (e) { e.addEventListener('click', close); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    d.addEventListener('click', function (e) { var q = e.target.getAttribute('data-q'), i = e.target.getAttribute('data-i'), rm = e.target.getAttribute('data-rm');
      if (q) cart[i].qty = Math.max(1, Math.min(20, cart[i].qty + +q)); else if (rm !== null) cart.splice(+rm, 1); else return; store.set('vtrk_cart', cart); renderCart(); });
  }
  function bindShop() {
    if (!$('#grid')) return;
    document.addEventListener('change', function (e) { var card = e.target.closest && e.target.closest('.card'); if (card && e.target.hasAttribute('data-o')) { var p = catBy[card.getAttribute('data-slug')], sel = selFor(p); sel[e.target.getAttribute('data-o')] = e.target.value; sel.img = 0; renderCards(); } });
    document.addEventListener('click', function (e) {
      var card = e.target.closest && e.target.closest('.card'); if (!card) return;
      if (e.target.closest('.thumbs button')) { selFor(catBy[card.getAttribute('data-slug')]).img = +e.target.closest('button').getAttribute('data-k'); renderCards(); return; }
      if (e.target.classList.contains('add')) { var p = catBy[card.getAttribute('data-slug')], v = pickVariant(p, selFor(p)); if (!S.name) { toast('Add a name in the builder first'); $('#fName').focus(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; } addItem({ slug: p.slug, variantId: v.id, qty: 1, p: personal() }); }
    });
  }

  /* ---------- checkout page ---------- */
  function renderCheckout() {
    var root = $('#checkoutRoot'); if (!root || !CAT) return;
    root.innerHTML = '<div class="box">' + linesHtml(true) + '</div><div class="box">' + totalsHtml() + '</div><label for="email">Email for your receipt</label><input id="email" type="email" autocomplete="email" placeholder="you@email.com" value="' + esc(root.getAttribute('data-email') || '') + '"><p class="err" id="err" role="alert"></p><button class="btn big" id="payBtn" ' + (cart.length ? '' : 'disabled') + '>Pay by card</button><p style="text-align:center;margin-top:14px"><a href="/#items">Keep shopping</a></p>';
    root.onclick = function (e) { var q = e.target.getAttribute('data-q'), i = e.target.getAttribute('data-i'), rm = e.target.getAttribute('data-rm'); var em = $('#email').value;
      if (q) cart[i].qty = Math.max(1, Math.min(20, cart[i].qty + +q)); else if (rm !== null) cart.splice(+rm, 1); else if (e.target.id === 'payBtn') return pay(); else return; store.set('vtrk_cart', cart); root.setAttribute('data-email', em); renderCheckout(); renderCart(); };
  }
  function pay() {
    var email = $('#email').value.trim(), err = $('#err'); err.textContent = '';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { err.textContent = 'Enter a valid email for the receipt.'; return; }
    var btn = $('#payBtn'); btn.disabled = true; btn.textContent = 'Opening secure payment…'; track('InitiateCheckout', { currency: 'USD', value: totals().total / 100 });
    fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: cart, email: email, utm: utm() }) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) { if (x.ok && x.j.url) location.href = x.j.url; else { err.textContent = x.j.error || 'Could not start checkout. Please try again.'; btn.disabled = false; btn.textContent = 'Pay by card'; } })
      .catch(function () { err.textContent = 'Could not start checkout. Please try again.'; btn.disabled = false; btn.textContent = 'Pay by card'; });
  }

  /* ---------- boot ---------- */
  utm(); bindBuilder(); bindCart(); bindShop(); renderPreview(true);
  var q = new URLSearchParams(location.search);
  if (q.get('order') === 'thanks') { cart = []; store.set('vtrk_cart', cart); var b = document.createElement('div'); b.className = 'banner'; b.setAttribute('role', 'status'); b.textContent = 'Payment received. Thank you. We are preparing your order and a receipt is on its way to your email.'; document.body.insertBefore(b, document.body.firstChild); track('Purchase', { currency: 'USD' }); history.replaceState(null, '', '/'); }
  fetch('/api/catalog').then(function (r) { return r.json(); }).then(function (c) { CAT = c; c.products.forEach(function (p) { catBy[p.slug] = p; }); if ($('#grid')) renderCards(); renderCart(); renderCheckout(); }).catch(function () {});
})();
