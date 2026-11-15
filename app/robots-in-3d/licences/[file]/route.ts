import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MODELS_3D } from '@/data/models-3d';
import { licenceFileName } from '@/lib/robots-in-3d-page';

/**
 * Each record's licence text, byte for byte the file shipped beside its
 * model, at an address with an extension. The shipped files are named
 * LICENSE, and with trailing slashes on, the host answers an extensionless
 * path with a redirect to a folder that does not exist.
 */
export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return MODELS_3D.map((model) => ({ file: licenceFileName(model) }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const model = MODELS_3D.find((candidate) => licenceFileName(candidate) === file);
  if (!model) return new Response('Not found', { status: 404 });
  return new Response(readFileSync(join(process.cwd(), model.licence.file)), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
