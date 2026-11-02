import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { releaseSourceFingerprint } from './brand-v2-release-evidence.ts';
export const RELEASE_RESIDUE_PATH = 'evidence/brand-v2/release/residue.json';
export const RELEASE_RESIDUE_VIEWPORTS = [{
  width: 1440,
  height: 900
}, {
  width: 375,
  height: 812
}] as const;
const textRecord = z.object({
  selector: z.string().min(1),
  kind: z.string().min(1),
  value: z.string(),
  technicalContext: z.boolean()
}).strict();
const effect = z.object({
  selector: z.string(),
  backdrop: z.string(),
  shadow: z.string(),
  filter: z.string(),
  mask: z.string(),
  logoId: z.string().nullable()
}).strict();
const logo = z.object({
  id: z.string(),
  file: z.string(),
  ink: z.string(),
  mask: z.string(),
  maskMode: z.string(),
  maskComposite: z.string(),
  filter: z.string(),
  inkFilter: z.string(),
  background: z.string(),
  shadow: z.string(),
  border: z.array(z.number()),
  padding: z.array(z.number()),
  width: z.number(),
  height: z.number()
}).strict();
export const residueObservationSchema = z.object({
  route: z.string(),
  viewport: z.string(),
  status: z.number(),
  elementCount: z.number().int().positive(),
  texts: z.array(textRecord).min(1),
  rawPaints: z.array(z.object({
    selector: z.string(),
    attribute: z.string(),
    value: z.string()
  }).strict()),
  computedPaints: z.record(z.string(), z.number().int().positive()).refine(value => Object.keys(value).length > 0, 'empty computed paint population'),
  resources: z.array(z.string()),
  fonts: z.array(z.string()).min(1),
  displayFaces: z.array(z.object({
    selector: z.string(),
    family: z.string(),
    text: z.string()
  }).strict()).min(1),
  effects: z.array(effect),
  assets: z.array(z.object({
    selector: z.string(),
    url: z.string(),
    imageId: z.string().nullable()
  }).strict()),
  logos: z.array(logo),
  iconDeclarations: z.array(z.string())
}).strict();
export const releaseResidueSchema = z.object({
  version: z.literal(1),
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  routes: z.array(z.string()).min(1),
  observations: z.array(residueObservationSchema).min(1)
}).strict();
export type ResidueObservation = z.infer<typeof residueObservationSchema>;
export type ReleaseResidueRuntime = z.infer<typeof releaseResidueSchema>;

/** The export is part of the identity: a current source tree alongside an
 * old output directory is not current browser evidence. No generated report
 * contributes to its own fingerprint. */
export function releaseResidueFingerprint(root: string): string {
  const hash = createHash('sha256').update(releaseSourceFingerprint(root));
  let count = 0;
  const walk = (dir: string) => {
    for (const e of readdirSync(join(root, dir), {
      withFileTypes: true
    }).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = dir + '/' + e.name;
      if (e.isSymbolicLink()) throw Error('Symlink in release export: ' + path);
      if (e.isDirectory()) walk(path);else if (/\.(html|js|css|xml|json|webmanifest|svg|png|ico|woff2?|ttf)$/.test(path)) {
        hash.update(path).update('\0').update(readFileSync(join(root, path))).update('\0');
        count++;
      }
    }
  };
  walk('out');
  if (!count) throw Error('Empty residue export population');
  return hash.digest('hex');
}
export function readReleaseResidueRuntime(input: {
  artifact: unknown;
  fingerprint: string;
  routes: readonly string[];
}): ReleaseResidueRuntime {
  const data = releaseResidueSchema.parse(input.artifact);
  const equal = (a: readonly string[], b: readonly string[]) => a.length === b.length && new Set(a).size === a.length && [...a].sort().every((x, i) => x === [...b].sort()[i]);
  if (data.fingerprint !== input.fingerprint) throw Error('Stale release residue fingerprint');
  if (!input.routes.length || !equal(data.routes, input.routes)) throw Error('Release residue route population differs');
  const expected = input.routes.flatMap(r => RELEASE_RESIDUE_VIEWPORTS.map(v => r + '|' + v.width + 'x' + v.height));
  if (!equal(data.observations.map(o => o.route + '|' + o.viewport), expected)) throw Error('Missing, extra or duplicate residue observation');
  for (const o of data.observations) if (o.status !== 200 && !(o.route === '/404/' && o.status === 404)) throw Error('Unrendered residue route: ' + o.route);
  return data;
}
