/* Shared copy + sanitising for the personalisation builder. Works in Node and the browser (window.QText). */
(function (root) {
  const TAGS = {
    memorial: [
      { k: 'ride-in-memory', t: 'RIDE IN MEMORY' }, { k: 'loving-memory', t: 'IN LOVING MEMORY' },
      { k: 'forever-road', t: 'FOREVER ON THE ROAD' }, { k: 'ride-on', t: 'RIDE ON' }, { k: 'well-ridden', t: 'A LIFE WELL RIDDEN' },
    ],
    club: [
      { k: 'memorial-run', t: 'MEMORIAL RUN' }, { k: 'charity-run', t: 'CHARITY RUN' },
      { k: 'annual-ride', t: 'ANNUAL RIDE' }, { k: 'riding-together', t: 'RIDING TOGETHER' }, { k: 'in-honor', t: 'IN HONOR OF' },
    ],
  };
  const BIKES = { cruiser: 'Cruiser', touring: 'Touring', sport: 'Sport' };
  const SAMPLE = { mode: 'memorial', name: 'Dale Ruiz', line2: '1961 – 2025', tag: 'ride-in-memory', bike: 'cruiser' };
  function clean(s, max, allow) {
    s = String(s == null ? '' : s).normalize('NFC').replace(allow, '').replace(/\s+/g, ' ').trim();
    return s.slice(0, max).trim();
  }
  const NAME_RE = /[^\p{L}\p{M}0-9 '.&\-]/gu;
  const LINE_RE = /[^\p{L}\p{M}0-9 '.,&:\/\-–—·]/gu;
  function tidyDash(s) { return s.replace(/\s+[-–—]+\s+/g, ' – '); }
  function resolve(inp) {
    inp = inp || {};
    const mode = inp.mode === 'club' ? 'club' : 'memorial';
    const bike = BIKES[inp.bike] ? inp.bike : 'cruiser';
    const list = TAGS[mode]; const found = list.find(x => x.k === inp.tag) || list[0];
    const name = clean(inp.name, 28, NAME_RE).toUpperCase() || (mode === 'club' ? 'IRON ROAD RIDERS' : 'YOUR RIDER');
    const line2 = tidyDash(clean(inp.line2, 32, LINE_RE)).toUpperCase();
    return { mode, bike, tag: found.k, head: found.t, name, line2 };
  }
  const api = { TAGS, BIKES, SAMPLE, resolve };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.QText = api;
})(typeof window !== 'undefined' ? window : this);
