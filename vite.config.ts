import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv, type Plugin } from 'vite';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

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
    plugins: [localApiPlugin(), react(), tailwindcss()],
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
