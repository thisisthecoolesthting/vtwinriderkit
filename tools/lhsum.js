const j = require(process.argv[2]); const c = j.categories;
console.log('perf', Math.round(c.performance.score * 100), 'seo', Math.round(c.seo.score * 100), 'a11y', Math.round(c.accessibility.score * 100), 'best-practices', Math.round(c['best-practices'].score * 100));
const a = j.audits; console.log('LCP', a['largest-contentful-paint'].displayValue, 'CLS', a['cumulative-layout-shift'].displayValue, 'TBT', a['total-blocking-time'].displayValue, 'FCP', a['first-contentful-paint'].displayValue);
for (const k of Object.keys(a)) { const x = a[k]; if (x.score !== null && x.score < 0.9 && !['informative', 'notApplicable', 'manual'].includes(x.scoreDisplayMode)) console.log(' -', k, x.score, x.displayValue || ''); }
