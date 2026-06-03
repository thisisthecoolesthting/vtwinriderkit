/** Amazon Associates link helpers for V-Twin Rider Kit. */

export const DEFAULT_ASSOCIATE_TAG = 'vtwinriderkit-20';

export function amazonAffiliateUrlFromAsin(
  asin: string,
  associateTag = import.meta.env.PUBLIC_ASSOCIATE_TAG ?? DEFAULT_ASSOCIATE_TAG,
): string {
  const id = asin.trim().toUpperCase();
  if (!id) return '#';
  return `https://www.amazon.com/dp/${id}?tag=${associateTag}&linkCode=ll1&language=en_US`;
}

export type BottomAmazonPick = {
  asin: string;
  title: string;
  subtitle: string;
  priceLabel: string;
  badge?: string;
  imageUrl?: string;
};
