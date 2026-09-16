import { parseCrossrefWork, type CrossrefWork } from './citation-links.ts';

/** Crossref's public pool permits one concurrent request and five per second. */
const CROSSREF_MIN_INTERVAL_MS = 225;
const CROSSREF_MAX_ATTEMPTS = 3;
const CROSSREF_RETRY_BASE_MS = 750;
const CROSSREF_USER_AGENT = 'RobotWikiCitationAudit/1.0 (+https://robot-wiki.com)';

let crossrefQueue: Promise<void> = Promise.resolve();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Build the official Crossref REST transform URL for a DOI. */
export function crossrefApiUrl(doi: string): string {
  return (
    `https://api.crossref.org/works/${encodeURIComponent(doi)}` +
    '/transform/application/vnd.citationstyles.csl%2Bjson'
  );
}

/**
 * Serialize Crossref calls and leave a small interval between them. The
 * citation sweep itself runs several workers, while Crossref's public API
 * advertises a one-request concurrency limit. Respecting that limit prevents
 * a random DOI from failing whenever several bot-walled publishers reach the
 * metadata fallback together.
 */
async function withCrossrefSlot<T>(task: () => Promise<T>): Promise<T> {
  const previous = crossrefQueue;
  let release = (): void => undefined;
  crossrefQueue = new Promise<void>((resolve) => {
    release = resolve;
  });

  await previous;
  try {
    return await task();
  } finally {
    await sleep(CROSSREF_MIN_INTERVAL_MS);
    release();
  }
}

async function fetchOnce(doi: string, timeoutMs: number): Promise<CrossrefWork | null> {
  return withCrossrefSlot(async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(crossrefApiUrl(doi), {
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent': CROSSREF_USER_AGENT,
          Accept: 'application/vnd.citationstyles.csl+json',
        },
      });
      if (!response.ok) return null;
      return parseCrossrefWork(await response.json());
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  });
}

/**
 * Fetch title/year metadata from Crossref with bounded exponential retry.
 * A null answer remains inconclusive; callers never turn it into a pass.
 */
export async function fetchCrossrefWork(
  doi: string,
  timeoutMs: number,
): Promise<CrossrefWork | null> {
  for (let attempt = 0; attempt < CROSSREF_MAX_ATTEMPTS; attempt += 1) {
    const work = await fetchOnce(doi, timeoutMs);
    if (work) return work;
    if (attempt < CROSSREF_MAX_ATTEMPTS - 1) {
      await sleep(CROSSREF_RETRY_BASE_MS * 2 ** attempt);
    }
  }
  return null;
}
