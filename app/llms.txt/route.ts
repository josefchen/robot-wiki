import { buildLlmsTxt } from '@/lib/llms';
import { registryLlmsInput } from '@/lib/llms-registry';

export const dynamic = 'force-static';

export function GET() {
  return new Response(buildLlmsTxt(registryLlmsInput()), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
