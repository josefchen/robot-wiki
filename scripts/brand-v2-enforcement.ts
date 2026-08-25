import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  evidenceResultSchema,
  enforcementMapSchema,
  buildEnforcementPopulationSources,
  extractBrandV2Assertions,
  validateEnforcementCorpus,
  type EvidenceResult,
  type EnforcementMap,
} from '../lib/brand-v2-enforcement.ts';
import { BRAND_V2_DEEP_ROWS } from '../lib/brand-v2-runners.ts';

const ROOT = process.cwd();
const MAP_PATH = join(ROOT, 'contract', 'brand-v2-enforcement-map.json');
const RESULTS_PATH = join(ROOT, 'evidence', 'brand-v2', 'results.json');

type Registry = Parameters<
  typeof buildEnforcementPopulationSources
>[0]['registry'];

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function populationSources(assertionIds: string[]) {
  const registry = readJson(
    join(ROOT, 'contract', 'brand-v2-registries.json'),
  ) as Registry;
  const baseline = readJson(
    join(ROOT, 'evidence', 'brand-v2', 'baseline', 'baseline.json'),
  ) as { manifests: Record<string, unknown> };
  return buildEnforcementPopulationSources({
    registry,
    baselineManifestIds: Object.keys(baseline.manifests).sort(),
    deepRowIds: BRAND_V2_DEEP_ROWS.map(({ id }) => id),
    assertionIds,
  });
}

function populationSourceFor(id: string): string {
  const area = id.split('-')[2];
  if (area === 'BASE') {
    return 'evidence/brand-v2/baseline/baseline.json#manifests';
  }
  if (area === 'VIZ') {
    return id === 'VAL-B2-VIZ-012'
      ? 'contract/brand-v2-registries.json#interactive.mounts'
      : 'contract/brand-v2-registries.json#interactive.sources';
  }
  if (area === 'EVID') {
    return 'lib/brand-v2-runners.ts#BRAND_V2_DEEP_ROWS';
  }
  if (area === 'GOV') {
    return 'contract/design-integrity.md#VAL-B2-assertions';
  }
  if (area === 'TYPE') return 'contract/brand-v2-registries.json#typeRoles';
  if (area === 'GRID') return 'contract/brand-v2-registries.json#gridDevices';
  if (area === 'SURF') return 'contract/brand-v2-registries.json#surfaces';
  if (area === 'SPACE') return 'contract/brand-v2-registries.json#pageFrames';
  if (area === 'COMP') return 'contract/brand-v2-registries.json#controls';
  if (area === 'IMG') return 'contract/brand-v2-registries.json#assets';
  if (area === 'OG') return 'contract/brand-v2-registries.json#metadata';
  if (area === 'ART') {
    return 'contract/brand-v2-registries.json#routes.public:article';
  }
  return 'contract/brand-v2-registries.json#routes.public';
}

function modeFor(id: string): EnforcementMap['rows'][number]['enforcementMode'] {
  const area = id.split('-')[2];
  if (
    ['GOV', 'BASE'].includes(area) ||
    ['VAL-B2-EVID-014', 'VAL-B2-EVID-016'].includes(id)
  ) {
    return 'automated-machine';
  }
  if (area === 'OG') return 'generated-image';
  if (['EVID', 'IMG', 'TYPE', 'COL', 'GRID', 'SURF'].includes(area)) {
    return 'autonomous-visual';
  }
  return 'browser-state';
}

function resultFor(
  assertionId: string,
  populationMemberIds: string[],
  requirement: string,
  populationSource: string,
  mode: EnforcementMap['rows'][number]['enforcementMode'],
): EvidenceResult {
  const common = {
    resultId: `result:${assertionId}`,
    assertionId,
    populationMemberId: `population:${populationSource}`,
    coveredPopulationMemberIds: populationMemberIds,
    status: 'pending' as const,
    expected: requirement,
    actual: 'awaiting responsible rollout milestone',
    selectorOrRegistryId: populationSource,
    exceptionVerdict: 'none' as const,
  };
  if (mode === 'generated-image') {
    return {
      ...common,
      payload: {
        kind: 'generated-image',
        imagePath: `pending://${assertionId}`,
        width: 1200,
        height: 630,
        sha256: '0'.repeat(64),
        generator: 'pending brand-v2 rollout',
      },
    };
  }
  if (mode === 'autonomous-visual') {
    return {
      ...common,
      payload: {
        kind: 'autonomous-reference-comparison',
        referenceIds: [
          'library/brand-reference-board.jpeg',
          'library/brand-reference-article.png',
        ],
        anchors: [
          {
            id: assertionId,
            expected: requirement,
            actual: 'pending',
            passed: false,
          },
        ],
        screenshotPaths: [`pending://${assertionId}`],
      },
    };
  }
  if (mode === 'browser-state') {
    return {
      ...common,
      payload: {
        kind: 'browser-state',
        computed: { status: 'pending' },
      },
    };
  }
  return {
    ...common,
    payload: {
      kind: 'source-build',
      sourcePath: 'contract/design-integrity.md',
      predicate: requirement,
      observed: 'pending',
      tool: 'brand-v2-enforcement',
    },
  };
}

function generate() {
  const contract = readFileSync(
    join(ROOT, 'contract', 'design-integrity.md'),
    'utf8',
  );
  const assertions = extractBrandV2Assertions(contract);
  const sources = populationSources(assertions.map(({ id }) => id));
  const results: EvidenceResult[] = [];
  const rows: EnforcementMap['rows'] = assertions.map(
    ({ id, requirement }) => {
      const canonicalPopulationSource = populationSourceFor(id);
      const population = sources[canonicalPopulationSource];
      if (!population?.length) {
        throw new Error(`Population is empty for ${id}: ${canonicalPopulationSource}`);
      }
      const enforcementMode = modeFor(id);
      const assertionResult = resultFor(
        id,
        population,
        requirement,
        canonicalPopulationSource,
        enforcementMode,
      );
      results.push(assertionResult);
      return {
        assertionId: id,
        canonicalPopulationSource,
        enforcementTargets: [{
          kind: 'evidence-row' as const,
          evidenceRowId: assertionResult.resultId,
          mechanism: `${id} exhaustive predicate over ${canonicalPopulationSource}`,
        }],
        enforcementMode,
        machinePredicate: {
          statement: requirement,
          expected: requirement,
          actualSource: 'evidence/brand-v2/results.json',
          nonEmptyPopulation: true as const,
          omissionMustFail: true as const,
        },
        producedResult: {
          resultIds: [assertionResult.resultId],
        },
      };
    },
  );
  return {
    sources,
    map: enforcementMapSchema.parse({ schemaVersion: 1, rows }),
    results: results.map((result) => evidenceResultSchema.parse(result)),
  };
}

const mode = process.argv[2];
const generated = generate();
if (mode === '--write') {
  writeFileSync(MAP_PATH, `${JSON.stringify(generated.map, null, 2)}\n`);
  writeFileSync(
    RESULTS_PATH,
    `${JSON.stringify({ schemaVersion: 1, results: generated.results }, null, 2)}\n`,
  );
  console.log(
    `brand-v2-enforcement: wrote ${generated.map.rows.length} assertion rows and ${generated.results.length} tagged results`,
  );
} else if (mode === '--check' || mode === '--check-release') {
  const map = enforcementMapSchema.parse(readJson(MAP_PATH));
  const resultDocument = readJson(RESULTS_PATH) as {
    schemaVersion: number;
    results: unknown[];
  };
  if (resultDocument.schemaVersion !== 1) {
    throw new Error('Evidence result document schemaVersion must be 1.');
  }
  const results = resultDocument.results.map((result) =>
    evidenceResultSchema.parse(result),
  );
  const failures = validateEnforcementCorpus({
    assertionIds: generated.map.rows.map(({ assertionId }) => assertionId),
    populationSources: generated.sources,
    map,
    results,
    allowPendingResults: mode === '--check',
  });
  if (JSON.stringify(map) !== JSON.stringify(generated.map)) {
    failures.push({
      reason: 'generated-map-drift',
      expected: 'deterministic generated enforcement map',
      actual: MAP_PATH,
    });
  }
  if (JSON.stringify(results) !== JSON.stringify(generated.results)) {
    failures.push({
      reason: 'generated-results-drift',
      expected: 'deterministic generated tagged results',
      actual: RESULTS_PATH,
    });
  }
  if (failures.length > 0) {
    for (const failure of failures.slice(0, 20)) {
      console.error(JSON.stringify(failure));
    }
    if (failures.length > 20) {
      console.error(`... ${failures.length - 20} more enforcement failures`);
    }
    process.exitCode = 1;
  } else {
    console.log(
      `brand-v2-enforcement: OK (${map.rows.length} assertions, ${results.length} tagged results)`,
    );
  }
} else {
  console.error(
    'Usage: node scripts/brand-v2-enforcement.ts --write|--check|--check-release',
  );
  process.exitCode = 2;
}
