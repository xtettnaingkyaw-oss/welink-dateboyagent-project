import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

function vercelApiDevPlugin() {
  return {
    name: 'vercel-api-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/webhook')) {
          return next();
        }
        try {
          const parsedUrl = new URL(req.url, 'http://localhost:3000');
          req.query = Object.fromEntries(parsedUrl.searchParams.entries());

          if (req.method === 'POST' && !req.body) {
            const chunks = [];
            for await (const chunk of req) {
              chunks.push(chunk);
            }
            const rawBody = Buffer.concat(chunks).toString('utf8');
            req.body = rawBody ? JSON.parse(rawBody) : {};
          }

          res.status = (code) => {
            res.statusCode = code;
            return res;
          };
          res.json = (data) => {
            if (!res.getHeader('Content-Type')) {
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
            }
            res.end(JSON.stringify(data));
            return res;
          };
          res.send = (body) => {
            if (Buffer.isBuffer(body) || typeof body === 'string') {
              res.end(body);
            } else {
              res.end(String(body));
            }
            return res;
          };

          const mod = await server.ssrLoadModule('/api/webhook.js');
          await mod.default(req, res);
        } catch (err) {
          console.error('Dev API /api/webhook error:', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  return {
    plugins: [react(), vercelApiDevPlugin()],
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
  };
});
