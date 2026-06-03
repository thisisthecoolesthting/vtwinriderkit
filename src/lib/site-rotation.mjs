/**
 * Layer 1 (site/niche) + Layer 3 (pin template rotation).
 * At spawn: set SITE_MONETIZATION from niche_specs/<slug>.json `monetization` block.
 * See DEv1 build/NICHE_ROTATION_AND_PICKS_LAW.md
 */
import spawnHome from '../data/spawn-home.json';

export const SITE_MONETIZATION = {
  slug: 'site-slug',
  defaultTopic: 'household-staples',
  associateTag: '__ASSOCIATE_TAG__',
  pinTemplates: ['watchdog-alert', 'savings-checklist', 'comparison-table', 'product-strip'],
  rotateBy: 'article_slug',
};

export function loadSiteMonetizationFromSpawn() {
  const m = /** @type {Record<string, unknown>} */ (spawnHome).monetization;
  if (!m || typeof m !== 'object') return SITE_MONETIZATION;
  const pin = /** @type {Record<string, unknown>} */ (m.pinterest || {});
  return {
    ...SITE_MONETIZATION,
    defaultTopic:
      typeof m.default_topic === 'string' ? m.default_topic : SITE_MONETIZATION.defaultTopic,
    associateTag:
      typeof m.amazon_associate_tag === 'string'
        ? m.amazon_associate_tag
        : SITE_MONETIZATION.associateTag,
    pinTemplates: Array.isArray(pin.pin_templates)
      ? pin.pin_templates.map(String)
      : SITE_MONETIZATION.pinTemplates,
    rotateBy: typeof pin.rotate_by === 'string' ? pin.rotate_by : SITE_MONETIZATION.rotateBy,
  };
}

const ACTIVE = loadSiteMonetizationFromSpawn();

export function pinTemplateIndex(articleSlug, variant = 0) {
  const templates = ACTIVE.pinTemplates;
  if (!templates.length) return 0;
  const key = `${articleSlug}:${variant}`;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h % templates.length;
}

export function pinTemplateId(articleSlug, variant = 0) {
  return ACTIVE.pinTemplates[pinTemplateIndex(articleSlug, variant)] || 'default';
}

export function siteDefaultTopic() {
  return ACTIVE.defaultTopic;
}

export function siteSlug() {
  return ACTIVE.slug;
}
