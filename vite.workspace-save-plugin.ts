import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage } from 'node:http';
import type { Plugin } from 'vite';

const WORKSPACE_FILE = path.resolve(process.cwd(), 'public/adweb-workspace.json');

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/** Writes `public/adweb-workspace.json` when the dev client POSTs JSON — enables committing shared campaign data from local edits. */
export function workspaceFileSavePlugin(): Plugin {
  return {
    name: 'adweb-workspace-save',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0] ?? '';
        if (url !== '/__workspace/save') return next();
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end();
          return;
        }
        try {
          const raw = await readBody(req as IncomingMessage);
          const data = JSON.parse(raw) as Record<string, unknown>;
          if (typeof data !== 'object' || data === null) throw new Error('Invalid JSON object');
          data.revision = Date.now();
          const text = `${JSON.stringify(data, null, 2)}\n`;
          fs.mkdirSync(path.dirname(WORKSPACE_FILE), { recursive: true });
          fs.writeFileSync(WORKSPACE_FILE, text, 'utf8');
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(JSON.stringify({ ok: true, revision: data.revision }));
        } catch (e) {
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 400;
          res.end(JSON.stringify({ ok: false, error: String(e) }));
        }
      });
    },
  };
}
