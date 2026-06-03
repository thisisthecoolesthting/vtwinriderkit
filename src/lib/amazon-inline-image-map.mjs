/**
 * Curated m.media-amazon.com/images/I/* URLs.
 * P/ASIN paths return a 43-byte tracking GIF — do not use for <img src>.
 * Regenerate: SPINE_SYNC_SITE=<slug> python scripts/sync_amazon_inline_image_map.py
 */
export const AMAZON_INLINE_IMAGE_BY_ASIN = {
};

export function amazonInlineImageUrl(asin) {
  const id = String(asin || '').trim().toUpperCase();
  if (!id) return '';
  return (
    AMAZON_INLINE_IMAGE_BY_ASIN[id] ||
    `/images/amazon-picks/${id}.jpg`
  );
}

export function rewriteAmazonInlineImgSrc(src, href) {
  let asin = '';
  const fromSrc = String(src || '').match(/\/P\/([A-Z0-9]{10})\./i);
  if (fromSrc) asin = fromSrc[1];
  if (!asin && href) {
    const fromHref = String(href).match(/\/dp\/([A-Z0-9]{10})/i);
    if (fromHref) asin = fromHref[1];
  }
  if (!asin) return src;
  return amazonInlineImageUrl(asin);
}
