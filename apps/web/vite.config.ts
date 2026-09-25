import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const productionUrl = process.env.CONTEXT === 'production'
  ? process.env.SITE_URL ?? process.env.URL
  : undefined;
const siteOrigin = productionUrl ? new URL(productionUrl).origin : null;

const seo: Plugin = {
  name: 'public-seo',
  transformIndexHtml: {
    order: 'post',
    handler(html, context) {
      if (context.path !== '/' && context.path !== '/index.html') {
        return html;
      }

      if (process.env.CONTEXT && process.env.CONTEXT !== 'production') {
        return {
          html,
          tags: [{ tag: 'meta', attrs: { name: 'robots', content: 'noindex, nofollow' }, injectTo: 'head' }],
        };
      }

      if (!siteOrigin) {
        return html;
      }

      return {
        html,
        tags: [
          { tag: 'link', attrs: { rel: 'canonical', href: `${siteOrigin}/` }, injectTo: 'head' },
          { tag: 'meta', attrs: { property: 'og:url', content: `${siteOrigin}/` }, injectTo: 'head' },
          { tag: 'meta', attrs: { property: 'og:image', content: `${siteOrigin}/product-preview.png` }, injectTo: 'head' },
        ],
      };
    },
  },
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'robots.txt',
      source: `User-agent: *\nAllow: /\n${siteOrigin ? `Sitemap: ${siteOrigin}/sitemap.xml\n` : ''}`,
    });

    if (siteOrigin) {
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${siteOrigin}/</loc></url>\n</urlset>\n`,
      });
    }
  },
};

export default defineConfig({
  plugins: [react(), seo],
  build: {
    rollupOptions: {
      input: {
        landing: fileURLToPath(new URL('./index.html', import.meta.url)),
        app: fileURLToPath(new URL('./app/index.html', import.meta.url)),
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
});
