/**
 * Reads the authored `--color-*` tokens from `app/globals.css`, so the Open
 * Graph renderer can check that the colours it paints match what the site
 * declares (lib/og-card-manifest.ts).
 */
const HEX = /^#[0-9A-F]{6}$/;

/** Every `--color-*` declaration in the authored stylesheet, alias-resolved. */
export function deriveAuthoredColorTokens(css: string): {
  hexByToken: Record<string, string>;
  aliasTargetByToken: Record<string, string>;
  computedTokens: string[];
} {
  const declared = new Map<string, string>();
  for (const match of css.matchAll(/--color-([a-z0-9-]+):\s*([^;]+);/g)) {
    const token = match[1];
    if (declared.has(token)) {
      throw new Error(`app/globals.css declares --color-${token} twice`);
    }
    declared.set(token, match[2].trim());
  }
  if (declared.size === 0) {
    throw new Error('app/globals.css declares no --color-* token');
  }
  const hexByToken: Record<string, string> = {};
  const aliasTargetByToken: Record<string, string> = {};
  const computedTokens: string[] = [];
  const resolve = (token: string, depth: number): string | null => {
    if (depth > 4) return null;
    const value = declared.get(token);
    if (value === undefined) return null;
    if (HEX.test(value.toUpperCase())) return value.toUpperCase();
    const alias = /^var\(--color-([a-z0-9-]+)\)$/.exec(value);
    if (alias) {
      if (depth === 0) aliasTargetByToken[token] = alias[1];
      return resolve(alias[1], depth + 1);
    }
    return null;
  };
  for (const token of declared.keys()) {
    const resolved = resolve(token, 0);
    if (resolved === null) computedTokens.push(token);
    else hexByToken[token] = resolved;
  }
  return { hexByToken, aliasTargetByToken, computedTokens };
}
