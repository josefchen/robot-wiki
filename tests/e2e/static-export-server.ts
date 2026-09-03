/**
 * A minimal static file server for the exported site (out/). The article
 * header spec uses it to verify the SHIPPED artifact: the static export
 * from the two-pass build (scripts/measure-reading-times.ts writes
 * data/reading-times.json between the passes), not the dev server. Dev
 * shows the render-time prose estimate when the measured file is absent;
 * the export carries the measured rendered count (VAL-WIKI-015), and the
 * two surfaces are asserted separately.
 *
 * Deliberately dependency-free (node:http): the spec must run offline and
 * must not re-download a server package on demand.
 */
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.map': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.wasm': 'application/wasm',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  // URDF is XML. Served with its real type because the font sweep now
  // requires a negative classification to be supported rather than inferred,
  // and an `application/octet-stream` fallback supports nothing.
  '.urdf': 'application/xml; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};

export interface StaticExportServer {
  port: number;
  stop: () => Promise<void>;
}

export interface StaticExportServerOptions {
  /**
   * Serve `404.html` (with a 404 status) for unmatched paths, the way real
   * static hosts (Vercel, `serve`) do. Off by default: the not-found
   * fallback only matters for specs that navigate a browser to an unknown
   * route and assert what the host serves there.
   */
  notFoundFallback?: boolean;
}

/**
 * Serve `outDir` on `port`. The default port 0 asks the OS for a free
 * port; the bound port comes back on the returned handle. Specs must use
 * it rather than hard-coding one: a fixed port collides with any leftover
 * preview server and fails the whole spec file with EADDRINUSE, which
 * masquerades as a broad regression (three occurrences, 2026-08-10/11).
 * Directory-style paths (the export uses trailingSlash) resolve to their
 * index.html; everything else is served by exact path with a content type
 * from the extension. Paths escaping outDir are refused.
 */
export async function startStaticExportServer(
  outDir: string,
  port = 0,
  options: StaticExportServerOptions = {},
): Promise<StaticExportServer> {
  const root = resolve(outDir);
  const server = createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(
        new URL(req.url ?? '/', 'http://localhost').pathname,
      );
      const filePath = resolve(join(root, pathname));
      if (filePath !== root && !filePath.startsWith(root + '/')) {
        res.writeHead(403);
        res.end();
        return;
      }

      // Directory (or the export root): serve index.html.
      try {
        const body = await readFile(join(filePath, 'index.html'));
        res.writeHead(200, { 'Content-Type': MIME['.html'] });
        res.end(body);
        return;
      } catch {
        // Not a directory: fall through to exact-file serving.
      }

      const body = await readFile(filePath);
      const type = MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type });
      res.end(body);
    } catch {
      if (options.notFoundFallback) {
        // Host-like behavior: unknown paths get the themed 404 document
        // with a 404 status (Vercel and `serve` both do this).
        try {
          const body = await readFile(join(root, '404.html'));
          res.writeHead(404, { 'Content-Type': MIME['.html'] });
          res.end(body);
          return;
        } catch {
          // No 404.html either: fall through to the plain response.
        }
      }
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('not found');
    }
  });

  await new Promise<void>((resolveListen) => {
    server.listen(port, () => resolveListen());
  });

  const address = server.address();
  const boundPort =
    typeof address === 'object' && address !== null ? address.port : port;

  return {
    port: boundPort,
    stop: () =>
      new Promise<void>((resolveStop, rejectStop) => {
        server.close((error) => (error ? rejectStop(error) : resolveStop()));
      }),
  };
}
