import { COMPANIES } from '@/data/companies';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-static';

export function GET() {
  const companies = Object.fromEntries(
    COMPANIES.map(({ id, name, sources }) => [
      id,
      { name, marketMapUrl: `${SITE_URL}/market-map/#company-${id}`, sources },
    ]),
  );
  return Response.json({ companies });
}
