/**
 * Picks a random phone-case store per ad slot on each page load.
 * Expects #case-ad-stores-json and [data-cad-slot] markup from CaseAdSlot.astro.
 */
(function () {
  var raw = document.getElementById('case-ad-stores-json');
  if (!raw || !raw.textContent) return;

  var STORES;
  try {
    STORES = JSON.parse(raw.textContent);
  } catch (e) {
    return;
  }
  if (!Array.isArray(STORES) || !STORES.length) return;

  var slots = document.querySelectorAll('[data-cad-slot]');
  if (!slots.length) return;

  var usedSlugs = new Set();

  function pickStore(kidsOnly) {
    var pool = kidsOnly
      ? STORES.filter(function (s) {
          return s.slug === 'phonecasegift';
        })
      : STORES;
    if (!pool.length) pool = STORES;

    var candidates = pool.filter(function (s) {
      return !usedSlugs.has(s.slug);
    });
    if (!candidates.length) candidates = pool;

    var store = candidates[Math.floor(Math.random() * candidates.length)];
    usedSlugs.add(store.slug);
    return store;
  }

  function utmUrls(store, affSlug, size, placement) {
    var content = size + '_' + placement;
    var base =
      '?utm_source=' +
      encodeURIComponent(affSlug) +
      '&utm_medium=cross_promo&utm_campaign=15off&utm_content=';
    return {
      click: 'https://' + store.domain + '/' + base + encodeURIComponent(content),
      iphone:
        'https://' + store.iphoneDomain + '/' + base + encodeURIComponent(content + '_iph'),
      samsung:
        'https://' + store.samsungDomain + '/' + base + encodeURIComponent(content + '_sam'),
    };
  }

  function pickImage(store) {
    var imgs = store.images || [];
    if (!imgs.length) return '';
    return imgs[Math.floor(Math.random() * imgs.length)];
  }

  function applyDeviceHref(link, urls) {
    var ua = navigator.userAgent || '';
    if (/iPhone|iPad|iPod/.test(ua)) link.href = urls.iphone;
    else if (/Samsung|SM-[A-Za-z]/.test(ua)) link.href = urls.samsung;
    else link.href = urls.click;
    link.setAttribute('data-href-iphone', urls.iphone);
    link.setAttribute('data-href-samsung', urls.samsung);
  }

  function setText(el, sel, text) {
    var node = el.querySelector(sel);
    if (node) node.textContent = text;
  }

  function applyStore(wrap, store, kids) {
    var aff = wrap.getAttribute('data-aff-slug') || 'affiliate';
    var size = wrap.getAttribute('data-cad-size') || '300x250';
    var placement = wrap.getAttribute('data-cad-placement') || 'default';
    var urls = utmUrls(store, aff, size, placement);
    var imgFile = pickImage(store);
    var imgUrl = imgFile
      ? 'https://phonecasesforall.com/hero-cases/' + imgFile
      : '';

    var badge = kids ? '🧒 Colorful cases kids love' : store.badge;
    var tagline = kids
      ? 'Durable, fun designs they will actually keep on their phone.'
      : store.tagline;
    var cta = kids ? 'Shop kids picks' : store.cta;

    wrap.style.setProperty('--accent', store.accent);
    wrap.style.setProperty('--accent-light', store.accentLight);
    wrap.style.setProperty('--accent-dark', store.accentDark);

    var link = wrap.querySelector('a');
    if (link) applyDeviceHref(link, urls);

    wrap.querySelectorAll('img.cad-leader-img, img.cad-rect-img, img.cad-sky-img').forEach(
      function (img) {
        if (imgUrl) {
          img.src = imgUrl;
          img.alt = store.name;
          img.style.display = '';
        }
      },
    );

    setText(wrap, '.cad-leader-name, .cad-name', store.name);
    setText(wrap, '.cad-leader-tag, .cad-tag', tagline);
    setText(wrap, '.cad-badge', badge);
    setText(wrap, '.cad-leader-cta', cta + ' →');
    setText(wrap, '.cad-cta-btn', cta + ' →');
    setText(wrap, '.cad-leader-code', store.code);
    setText(wrap, '.cad-code strong', store.code);
    setText(wrap, '.cad-offer-text', '✦ ' + store.offer);

    wrap.classList.add('cad-ready');
  }

  slots.forEach(function (wrap) {
    var kids = wrap.getAttribute('data-cad-kids') === 'true';
    var pinned = wrap.getAttribute('data-cad-pinned');
    var store;
    if (pinned) {
      store = STORES.find(function (s) {
        return s.slug === pinned;
      });
      if (store) usedSlugs.add(store.slug);
    }
    if (!store) store = pickStore(kids);
    applyStore(wrap, store, kids);
  });
})();
