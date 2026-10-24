import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv, type Plugin } from 'vite';

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const serviceWorkerTemplate = readFileSync(resolve(rootDir, 'pwa/sw.js'), 'utf8');

/** Build an installable shell while deliberately keeping private API data out of Cache Storage. */
function pwaPlugin(): Plugin {
  const sourceForVersion = [
    'public/manifest.webmanifest', 'public/favicon.svg', 'public/apple-touch-icon.png',
    'public/icons/icon-192.png', 'public/icons/icon-512.png', 'public/icons/icon-maskable-512.png',
    'public/offline.html',
  ].map(path => readFileSync(resolve(rootDir, path)));

  return {
    name: 'fana-pwa',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        let pathname: string;
        try { pathname = new URL(req.url || '/', 'http://fana.local').pathname; }
        catch { return next(); }
        if (pathname !== '/sw.js') return next();
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Service-Worker-Allowed', '/');
        res.end(serviceWorkerTemplate
          .replace('__FANA_CACHE_VERSION__', JSON.stringify('dev'))
          .replace('__FANA_PRECACHE_URLS__', '[]'));
      });
    },
    generateBundle(_options, bundle) {
      const assetUrls = Object.keys(bundle)
        .filter(fileName => /^assets\/.+\.(?:js|css)$/i.test(fileName))
        .map(fileName => `/${fileName}`);
      const precacheUrls = [
        '/', '/index.html', '/manifest.webmanifest', '/favicon.svg', '/apple-touch-icon.png',
        '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-maskable-512.png', '/offline.html',
        ...assetUrls,
      ];
      const indexHtml = bundle['index.html'];
      const htmlSource = indexHtml?.type === 'asset'
        ? (typeof indexHtml.source === 'string' ? indexHtml.source : indexHtml.source.toString())
        : '';
      const version = createHash('sha256')
        .update([...precacheUrls].sort().join('\n'))
        .update(htmlSource)
        .update(Buffer.concat(sourceForVersion))
        .digest('hex')
        .slice(0, 12);
      const source = serviceWorkerTemplate
        .replace('__FANA_CACHE_VERSION__', JSON.stringify(version))
        .replace('__FANA_PRECACHE_URLS__', JSON.stringify(precacheUrls));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

/** Serve the same authenticated Vercel function handlers during plain Vite development. */
function localApiPlugin(): Plugin {
  return {
    name: 'fana-local-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const requestUrl = req.url || '/';
        let pathname: string;
        try { pathname = new URL(requestUrl, 'http://fana.local').pathname; }
        catch { return next(); }
        if (!pathname.startsWith('/api/')) return next();

        void (async () => {
          const apiRequest = req as typeof req & { body?: unknown };
          if (req.method === 'POST' && apiRequest.body === undefined) {
            const chunks: Buffer[] = [];
            let totalBytes = 0;
            for await (const chunk of req) {
              const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
              totalBytes += buffer.length;
              if (totalBytes > 4_500_000) {
                res.statusCode = 413;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.setHeader('Cache-Control', 'no-store');
                res.end(JSON.stringify({ error: 'La requête dépasse la taille maximale de 4,5 Mo.' }));
                return;
              }
              chunks.push(buffer);
            }
            apiRequest.body = Buffer.concat(chunks).toString('utf8');
          }

          try {
            const module = await server.ssrLoadModule(`${pathname}.ts`);
            if (typeof module.default !== 'function') throw new Error(`Handler API absent pour ${pathname}`);
            await module.default(apiRequest, res);
            if (!res.writableEnded) res.end();
          } catch (error) {
            server.ssrFixStacktrace(error as Error);
            server.config.logger.error((error as Error).stack || String(error));
            if (!res.headersSent) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.setHeader('Cache-Control', 'no-store');
              res.end(JSON.stringify({ error: 'Erreur du serveur local. Consultez le terminal Vite.' }));
            }
          }
        })();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Node-side API handlers use process.env; Vite loads local .env files without exposing them to the browser.
  const env = loadEnv(mode, process.cwd(), '');
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }

  return {
    plugins: [localApiPlugin(), pwaPlugin(), react(), tailwindcss()],
    resolve: {
      alias: {
        '@': rootDir,
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: ['.e2b.app', 'localhost'],
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
