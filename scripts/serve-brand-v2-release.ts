import { join } from 'node:path';
import { readReleaseBuildStamp } from '../lib/brand-v2-release-build.ts';
import { startStaticExportServer } from '../tests/e2e/static-export-server.ts';

readReleaseBuildStamp(process.cwd());
const server = await startStaticExportServer(join(process.cwd(), 'out'), 3200, { notFoundFallback: true });
console.log(`Frozen Robot Wiki export available at http://localhost:${server.port}`);
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => { void server.stop().finally(() => process.exit(0)); });
