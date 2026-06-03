import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

const ASSOCIATE_TAG = process.env.PUBLIC_ASSOCIATE_TAG || 'vtwinriderkit-20';
const productHrefRe = /^\/products\/([a-z0-9]{10})-/i;

function amazonPickImageUrl(asin) {
  const id = asin.toUpperCase();
  return `https://m.media-amazon.com/images/P/${id}.01._SL300_.jpg`;
}

function rehypeAugmentProductLinks() {
  function walk(node) {
    if (!node || !Array.isArray(node.children)) return;
    const out = [];
    for (const child of node.children) {
      if (
        child &&
        child.type === 'element' &&
        child.tagName === 'a' &&
        child.properties &&
        typeof child.properties.href === 'string'
      ) {
        const m = child.properties.href.match(productHrefRe);
        if (m) {
          const asin = m[1].toUpperCase();
          const amazonHref =
            'https://www.amazon.com/dp/' + asin + '?tag=' + ASSOCIATE_TAG + '&linkCode=ll1';
          const linkText =
            (child.children && child.children[0] && child.children[0].value) || 'View product';
          const imgSrc = amazonPickImageUrl(asin);

          out.push({
            type: 'element',
            tagName: 'div',
            properties: { className: ['amazon-inline-card'] },
            children: [
              {
                type: 'element',
                tagName: 'a',
                properties: {
                  href: amazonHref,
                  rel: 'nofollow sponsored noopener',
                  target: '_blank',
                  className: ['amazon-inline-card__link'],
                },
                children: [
                  {
                    type: 'element',
                    tagName: 'img',
                    properties: {
                      src: imgSrc,
                      alt: '',
                      className: ['amazon-inline-card__img'],
                      loading: 'lazy',
                      decoding: 'async',
                    },
                    children: [],
                  },
                  {
                    type: 'element',
                    tagName: 'span',
                    properties: { className: ['amazon-inline-card__body'] },
                    children: [
                      {
                        type: 'element',
                        tagName: 'span',
                        properties: { className: ['amazon-inline-card__title'] },
                        children: [{ type: 'text', value: String(linkText) }],
                      },
                      {
                        type: 'element',
                        tagName: 'span',
                        properties: { className: ['amazon-inline-card__cta'] },
                        children: [{ type: 'text', value: 'Check on Amazon →' }],
                      },
                    ],
                  },
                ],
              },
            ],
          });
          continue;
        }
      }
      walk(child);
      out.push(child);
    }
    node.children = out;
  }

  return (tree) => walk(tree);
}

// https://astro.build/config
export default defineConfig({
  site: 'https://vtwinriderkit.org',
  trailingSlash: 'never',
  integrations: [tailwind()],
  build: { format: 'directory' },
  markdown: {
    rehypePlugins: [rehypeAugmentProductLinks],
    shikiConfig: { theme: 'github-light' },
  },
});
