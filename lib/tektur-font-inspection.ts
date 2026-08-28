import { readFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { openSync, type Font } from 'fontkit';
import {
  tekturFontMetadataSchema,
  type TekturFontMetadata,
} from '../data/tektur-font-metadata.ts';
import {
  TEKTUR_ASSIGNED_STRINGS,
  typeRoleRegistrySchema,
  type TekturAssignedString,
} from '../data/type-roles.ts';
import { sha256 } from './brand-v2-baseline.ts';

export type TekturInspectionReport = {
  ok: boolean;
  failures: string[];
  metadataPath: string;
  webPath: string | null;
  ogPath: string | null;
  assignedStringCount: number;
  assignedCodePointCount: number;
};

export type InspectTekturAssetsOptions = {
  root?: string;
  metadataPath?: string;
  roleRegistryPath?: string;
  assignedStrings?: readonly TekturAssignedString[];
  openFont?: (path: string) => Font;
};

function resolve(root: string, path: string): string {
  return isAbsolute(path) ? path : join(root, path);
}

function codePoints(strings: readonly TekturAssignedString[], target: 'web' | 'og') {
  return new Map(
    strings
      .filter(({ targets }) => targets.includes(target))
      .flatMap(({ id, text }) =>
        [...text].map((character) => [
          character.codePointAt(0) ?? 0,
          `${id}:${character}`,
        ] as const),
      ),
  );
}

function inspectCmap(
  font: Font,
  strings: readonly TekturAssignedString[],
  target: 'web' | 'og',
  failures: string[],
): void {
  for (const [codePoint, witness] of codePoints(strings, target)) {
    if (!font.hasGlyphForCodePoint(codePoint)) {
      failures.push(
        `${target} cmap missing U+${codePoint.toString(16).toUpperCase().padStart(4, '0')} (${witness})`,
      );
    }
  }
}

function inspectAxes(
  font: Font,
  metadata: TekturFontMetadata,
  failures: string[],
): void {
  const actualTags = Object.keys(font.variationAxes).sort();
  const expectedTags = Object.keys(metadata.web.axes).sort();
  if (actualTags.join(',') !== expectedTags.join(',')) {
    failures.push(
      `web axes mismatch: expected ${expectedTags.join(',')}, received ${actualTags.join(',') || 'none'}`,
    );
  }
  for (const tag of expectedTags as Array<
    keyof TekturFontMetadata['web']['axes']
  >) {
    const expected = metadata.web.axes[tag];
    const actual = font.variationAxes[tag];
    if (!actual) continue;
    for (const field of ['min', 'default', 'max'] as const) {
      if (actual[field] !== expected[field]) {
        failures.push(
          `web ${tag} ${field} mismatch: expected ${expected[field]}, received ${actual[field]}`,
        );
      }
    }
    if (expected.label !== metadata.axisLabels[tag]) {
      failures.push(
        `metadata ${tag} label mismatch: expected ${metadata.axisLabels[tag]}, received ${expected.label}`,
      );
    }
  }
}

export function inspectTekturAssets(
  options: InspectTekturAssetsOptions = {},
): TekturInspectionReport {
  const root = options.root ?? process.cwd();
  const metadataPath = resolve(
    root,
    options.metadataPath ?? 'assets/fonts/tektur/metadata.json',
  );
  const roleRegistryPath = resolve(
    root,
    options.roleRegistryPath ?? 'data/type-roles.json',
  );
  const assignedStrings = options.assignedStrings ?? TEKTUR_ASSIGNED_STRINGS;
  const openFont = options.openFont ?? openSync;
  const failures: string[] = [];

  let metadata: TekturFontMetadata;
  let roleRegistry: ReturnType<typeof typeRoleRegistrySchema.parse>;
  try {
    metadata = tekturFontMetadataSchema.parse(
      JSON.parse(readFileSync(metadataPath, 'utf8')),
    );
    roleRegistry = typeRoleRegistrySchema.parse(
      JSON.parse(readFileSync(roleRegistryPath, 'utf8')),
    );
  } catch (error) {
    return {
      ok: false,
      failures: [`metadata or role registry invalid: ${(error as Error).message}`],
      metadataPath,
      webPath: null,
      ogPath: null,
      assignedStringCount: assignedStrings.length,
      assignedCodePointCount: 0,
    };
  }

  const webPath = resolve(root, metadata.web.path);
  const ogPath = resolve(root, metadata.og.path);
  const licensePath = resolve(root, metadata.license.path);
  let webFont: Font;
  let ogFont: Font;
  try {
    webFont = openFont(webPath);
    ogFont = openFont(ogPath);
  } catch (error) {
    return {
      ok: false,
      failures: [`font binary unreadable: ${(error as Error).message}`],
      metadataPath,
      webPath,
      ogPath,
      assignedStringCount: assignedStrings.length,
      assignedCodePointCount: 0,
    };
  }

  const license = readFileSync(licensePath, 'utf8');
  if (!license.includes('SIL OPEN FONT LICENSE Version 1.1')) {
    failures.push('OFL license text is missing or not version 1.1');
  }
  if (sha256(readFileSync(webPath)) !== metadata.web.sha256) {
    failures.push('web WOFF2 SHA-256 does not match metadata');
  }
  if (sha256(readFileSync(ogPath)) !== metadata.og.sha256) {
    failures.push('OG TTF SHA-256 does not match metadata');
  }
  if (webFont.type !== metadata.web.format) {
    failures.push(
      `web format mismatch: expected ${metadata.web.format}, received ${webFont.type}`,
    );
  }
  if (ogFont.type !== metadata.og.format) {
    failures.push(
      `OG format mismatch: expected ${metadata.og.format}, received ${ogFont.type}`,
    );
  }
  if (!webFont.familyName.startsWith(metadata.family)) {
    failures.push(`web family mismatch: ${webFont.familyName}`);
  }
  if (!ogFont.fullName.startsWith(metadata.family)) {
    failures.push(`OG family mismatch: ${ogFont.fullName}`);
  }

  inspectAxes(webFont, metadata, failures);
  if (Object.keys(ogFont.variationAxes).length > 0) {
    failures.push(
      `OG TTF must be static, received axes ${Object.keys(ogFont.variationAxes).join(',')}`,
    );
  }
  const weightClass = ogFont['OS/2']?.usWeightClass;
  const widthClass = ogFont['OS/2']?.usWidthClass;
  if (weightClass !== metadata.og.weight) {
    failures.push(
      `OG weight mismatch: expected ${metadata.og.weight}, received ${String(weightClass)}`,
    );
  }
  if (widthClass !== metadata.og.widthClass) {
    failures.push(
      `OG width class mismatch: expected ${metadata.og.widthClass}, received ${String(widthClass)}`,
    );
  }

  const ogRole = roleRegistry.tekturRoleInstances.find(
    ({ id }) => id === metadata.og.mappedRoleId,
  );
  if (!ogRole || roleRegistry.tekturOgRoleId !== metadata.og.mappedRoleId) {
    failures.push(`OG role mapping is missing for ${metadata.og.mappedRoleId}`);
  } else {
    if (ogRole.wght !== metadata.og.weight) {
      failures.push(
        `OG mapped role weight mismatch: ${ogRole.wght} vs ${metadata.og.weight}`,
      );
    }
    if (ogRole.wdth !== metadata.og.width) {
      failures.push(
        `OG mapped role width mismatch: ${ogRole.wdth} vs ${metadata.og.width}`,
      );
    }
  }

  inspectCmap(webFont, assignedStrings, 'web', failures);
  inspectCmap(ogFont, assignedStrings, 'og', failures);

  const assignedCodePoints = new Set(
    assignedStrings.flatMap(({ text }) =>
      [...text].map((character) => character.codePointAt(0) ?? 0),
    ),
  );
  return {
    ok: failures.length === 0,
    failures,
    metadataPath,
    webPath,
    ogPath,
    assignedStringCount: assignedStrings.length,
    assignedCodePointCount: assignedCodePoints.size,
  };
}
