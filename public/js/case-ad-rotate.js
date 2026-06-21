/**
 * Picks a random phone-case store per ad slot on each page load.
 * Expects #case-ad-stores-json and [data-cad-slot] markup from CaseAdSlot.astro.
 */
(function () {
  function boot(STORES) {
  if (!Array.isArray(STORES) || !STORES.length) return;

  var slots = document.querySelectorAll('[data-cad-slot]');
  if (!slots.length) return;

  var usedSlugs = new Set();

  function pickStore(kidsOnly) {
    var pool = kidsOnly
      ? STORES.filter(function (s) {
          return s.slug === 'phonecasegift' || s.slug === 'phonecasesforkids';
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

  function resolveAdImageUrl(store, imgFile) {
    if (!imgFile) return '';
    if (imgFile.charAt(0) === '/') {
      return window.location.origin + imgFile;
    }
    if (imgFile.indexOf('ad-creatives/') === 0) {
      return 'https://phonecasesforall.com/' + imgFile;
    }
    return 'https://phonecasesforall.com/hero-cases/' + imgFile;
  }

  function filterDispImages(imgs) {
    var disp = imgs.filter(function (i) {
      return i.indexOf('-disp-') !== -1;
    });
    var branded = disp.filter(function (i) {
      return i.indexOf('RECOVERED') === -1;
    });
    return branded.length ? branded : disp;
  }

  function pickImage(store, size, composite) {
    var imgs = store.images || [];
    if (!imgs.length) return '';
    if (composite) {
      var pool = filterDispImages(imgs);
      if (pool.length) {
        return pool[Math.floor(Math.random() * pool.length)];
      }
      var want = size === '728x90' || size === '320x50' ? '-lb-' : '-disp-';
      for (var i = 0; i < imgs.length; i++) {
        if (imgs[i].indexOf(want) !== -1) return imgs[i];
      }
    }
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
    var composite = wrap.getAttribute('data-cad-composite') === 'true';
    var imgFile = pickImage(store, size, composite);
    var imgUrl = resolveAdImageUrl(store, imgFile);

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

    wrap.querySelectorAll('img.cad-composite-img, img.cad-leader-img, img.cad-rect-img, img.cad-sky-img').forEach(
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
  }

  var raw = document.getElementById('case-ad-stores-json');
  if (raw && raw.textContent) {
    try {
      boot(JSON.parse(raw.textContent));
      return;
    } catch (e) {}
  }
  fetch('/data/case-ad-stores.json', { credentials: 'same-origin' })
    .then(function (r) {
      if (!r.ok) throw new Error('case-ad-stores.json missing');
      return r.json();
    })
    .then(boot)
    .catch(function () {});
})();
