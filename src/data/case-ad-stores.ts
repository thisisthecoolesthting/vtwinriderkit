/** Phone-case cross-promo stores — shared by CaseAdSlot + client rotation script. */
export type CaseAdStore = {
  slug: string;
  name: string;
  domain: string;
  tagline: string;
  badge: string;
  offer: string;
  code: string;
  cta: string;
  accent: string;
  accentLight: string;
  accentDark: string;
  images: string[];
  iphoneDomain: string;
  samsungDomain: string;
};

export const CASE_AD_STORES: CaseAdStore[] = [
  {
    slug: 'phonecasesforher',
    name: 'Phone Cases For Her',
    domain: 'phonecasesforher.com',
    tagline: 'Cases with personal polish.',
    badge: '🌸 Feminine & aesthetic',
    offer: '15% off your first case',
    code: 'FIRST15HER',
    cta: 'Shop the look',
    accent: '#c94f7b',
    accentLight: '#fdf0f5',
    accentDark: '#9d3560',
    images: ['pcfh_27217.png', 'pcfh_25396.png', 'pcfh_33644.png', 'pcfh_10980.png', 'pcfh_37688.png'],
    iphoneDomain: 'titancase.shop',
    samsungDomain: 'galaxycaseco.com',
  },
  {
    slug: 'phonecasesforall',
    name: 'Phone Cases For All',
    domain: 'phonecasesforall.com',
    tagline: 'Cases that match your energy.',
    badge: '📱 Top-rated designs',
    offer: '15% off your first case',
    code: 'FIRST15ALL',
    cta: 'Shop the looks',
    accent: '#4350e8',
    accentLight: '#eef0fd',
    accentDark: '#2e3ab5',
    images: [
      'hero_04_CGP-FLORAL-0102.png',
      'best_CGP-FLORAL-0013.png',
      'best_CGP-FLORAL-0036.png',
      'hero_03_CGP-FLORAL-0259.png',
      'best_CGP-FLORAL-0172.png',
    ],
    iphoneDomain: 'titancase.shop',
    samsungDomain: 'galaxycaseco.com',
  },
  {
    slug: 'galaxycaseco',
    name: 'Galaxy Case Co.',
    domain: 'galaxycaseco.com',
    tagline: 'Built for Galaxy. Ready for impact.',
    badge: '🔷 Samsung specialist',
    offer: '15% off your first case',
    code: 'FIRST15GAL',
    cta: 'Shop Galaxy',
    accent: '#0284c7',
    accentLight: '#e0f2fe',
    accentDark: '#015f8f',
    images: [
      'flat_CGP-ASTROL-0008.jpg',
      'flat_CGP-ASTROL-0034.jpg',
      'vivid_CGP-FLORAL-0026.png',
      'vivid_CGP-FLORAL-0353.png',
    ],
    iphoneDomain: 'titancase.shop',
    samsungDomain: 'galaxycaseco.com',
  },
  {
    slug: 'titancase',
    name: 'Titan Case',
    domain: 'titancase.shop',
    tagline: 'Engineered restraint for iPhone.',
    badge: '🍎 Built for iPhone',
    offer: '15% off your first case',
    code: 'FIRST15TIT',
    cta: 'Shop iPhone',
    accent: '#1c1c1e',
    accentLight: '#f2f2f7',
    accentDark: '#000000',
    images: [
      'vivid_CGP-NATURE-0161.png',
      'vivid_CGP-FLORAL-0346.png',
      'hero_05_CGP-FLORAL-0114.png',
      'hero_04_CGP-FLORAL-0102.png',
    ],
    iphoneDomain: 'titancase.shop',
    samsungDomain: 'galaxycaseco.com',
  },
  {
    slug: 'phonecasegift',
    name: 'Phone Case Gift',
    domain: 'phonecasegift.shop',
    tagline: 'Fun finds for every vibe.',
    badge: '🎁 Perfect gift idea',
    offer: '15% off your first case',
    code: 'FIRST15GIFT',
    cta: 'Send a gift',
    accent: '#d97706',
    accentLight: '#fffbeb',
    accentDark: '#a15c00',
    images: [
      'art_CGP-ANIMAL-0748.jpg',
      'flower_CGP-FLORAL-0251.jpg',
      'best_CGP-FLORAL-0190.png',
      'best_CGP-FLORAL-0415.png',
    ],
    iphoneDomain: 'titancase.shop',
    samsungDomain: 'galaxycaseco.com',
  },
];

export const CASE_AD_KIDS_POOL = ['phonecasegift'] as const;
