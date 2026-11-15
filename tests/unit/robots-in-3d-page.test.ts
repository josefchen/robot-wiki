import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Object3D } from 'three';
import URDFLoader from 'urdf-loader';
import { describe, expect, it } from 'vitest';
import { GET, generateStaticParams } from '@/app/robots-in-3d/licences/[file]/route';
import { MODELS_3D, type Model3d } from '@/data/models-3d';
import { formatShortDate } from '@/lib/market-map';
import {
  joinNames,
  licenceFileName,
  licenceUrl,
  modelAltText,
  modelCaption,
  modelFileUrl,
  modelHeading,
  newestChecked,
  recordRows,
  repositoryName,
  robotsIn3dLead,
  shortCommit,
  sourceTreeUrl,
  trianglesUnchanged,
  urdfUrl,
  formatMegabytes,
  modelSummary,
} from '@/lib/robots-in-3d-page';

/**
 * lib/robots-in-3d-page.ts against MODELS_3D: the lead is true of every
 * record, each table value is the record's own, every address the page
 * links or loads exists in the built site's public folder, and every mesh
 * each shipped URDF names is on disk under the record's folder.
 */

const repoRoot = join(import.meta.dirname, '../..');
const publicFile = (url: string) => join(repoRoot, 'public', url);
const grouped = (n: number) => n.toLocaleString('en-US');
const words = (text: string) => text.trim().split(/\s+/).length;

/** The mesh addresses urdf-loader asks for when it parses the shipped URDF. */
function requestedMeshes(model: Model3d): string[] {
  const url = urdfUrl(model);
  const loader = new URDFLoader();
  const requested: string[] = [];
  loader.loadMeshCb = (meshUrl, _manager, _material, done) => {
    requested.push(meshUrl);
    done(new Object3D());
  };
  // The folder the browser resolves the URDF's relative mesh paths against.
  loader.workingPath = url.slice(0, url.lastIndexOf('/') + 1);
  loader.parse(readFileSync(publicFile(url), 'utf8'));
  return requested;
}

describe('the lead', () => {
  it('counts the records, names every maker and ends without punctuation', () => {
    const lead = robotsIn3dLead();
    expect(lead).not.toMatch(/[.,;:!?]\s*$/);
    for (const model of MODELS_3D) expect(lead, model.id).toContain(model.maker);
    const count = MODELS_3D.length;
    if (count <= 10) expect(lead).not.toMatch(/\d/);
    else expect(lead).toContain(String(count));
  });

  it('claims equal triangle counts only when every record has them', () => {
    const equal = MODELS_3D.every((model) => model.sourceTriangles === model.shippedTriangles);
    expect(trianglesUnchanged()).toBe(equal);
    expect(robotsIn3dLead().includes('same triangle count')).toBe(equal);
  });

  it('words one, two and an unequal record correctly', () => {
    const [first] = MODELS_3D;
    const other: Model3d = { ...first, id: 'other', maker: 'Second Maker', shippedTriangles: first.sourceTriangles - 1 };
    expect(robotsIn3dLead([first])).toBe(
      `One robot model drawn from its maker’s own URDF and mesh files, by ${first.maker}, with the same triangle count as the maker’s meshes`,
    );
    expect(robotsIn3dLead([first, { ...first, id: 'copy' }])).toBe(
      `Two robot models drawn from their makers’ own URDF and mesh files, by ${first.maker}, each with the same triangle count as the maker’s meshes`,
    );
    expect(robotsIn3dLead([first, other])).toBe(
      `Two robot models drawn from their makers’ own URDF and mesh files, by ${first.maker} and Second Maker, with the triangle counts of the maker’s meshes and of the shipped files`,
    );
    expect(joinNames(['A', 'B', 'C'])).toBe('A, B and C');
  });

  it('ends on the newest checked date', () => {
    const newest = newestChecked();
    for (const model of MODELS_3D) expect(model.checked <= newest, model.id).toBe(true);
    expect(MODELS_3D.map((model) => model.checked)).toContain(newest);
    const [first] = MODELS_3D;
    expect(newestChecked([first, { ...first, checked: '2030-01-02' }, { ...first, checked: '2029-05-06' }])).toBe('2030-01-02');
  });
});

describe('each record', () => {
  it('becomes its table row for row, every value from the record', () => {
    for (const model of MODELS_3D) {
      const rows = Object.fromEntries(recordRows(model).map((row) => [row.key, row]));
      expect(rows.maker.text).toBe(model.maker);
      expect(rows.product.text).toBe(model.product);
      expect(rows.urdf.text).toBe(model.urdfFile);
      expect(rows['maker-label'].text).toBe(model.makerLabel);
      expect(rows.repository.text).toBe(`${repositoryName(model)}/${model.sourcePath}`);
      expect(rows.repository.href).toBe(`${model.repository}/tree/${model.commit}/${model.sourcePath}`);
      expect(rows.repository.detail).toBe(`commit ${model.commit.slice(0, 8)}`);
      expect(rows.licence.text).toBe(model.licence.name);
      expect(rows.licence.href).toBe(licenceUrl(model));
      expect(rows.meshes.text).toBe(grouped(model.meshCount));
      expect(rows['source-triangles'].text).toBe(grouped(model.sourceTriangles));
      expect(rows['shipped-triangles'].text).toBe(grouped(model.shippedTriangles));
      expect(rows.size.text).toBe(`${grouped(model.shippedBytes)} bytes`);
      expect(rows.encoding.text).toBe(model.encoding);
      expect(rows.bound.text).toBe(`${model.positionBoundUm} µm`);
      expect(rows.change.text).toBe(model.change);
      expect(rows.checked.text).toBe(formatShortDate(model.checked));
      expect(rows.checked.date).toBe(model.checked);
      expect(recordRows(model)).toHaveLength(14);
    }
  });

  it('links the maker’s folder at the pinned commit on GitHub', () => {
    for (const model of MODELS_3D) {
      const url = new URL(sourceTreeUrl(model));
      expect(url.hostname, model.id).toBe('github.com');
      expect(url.pathname, model.id).toBe(`/${repositoryName(model)}/tree/${model.commit}/${model.sourcePath}`);
      expect(shortCommit(model)).toBe(model.commit.slice(0, 8));
    }
  });

  it('links its shipped licence, served byte for byte at an address with an extension', async () => {
    expect(generateStaticParams()).toEqual(MODELS_3D.map((model) => ({ file: licenceFileName(model) })));
    for (const model of MODELS_3D) {
      const url = licenceUrl(model);
      expect(url, model.id).toBe(`/robots-in-3d/licences/${licenceFileName(model)}`);
      // The host redirects an extensionless path to a folder; a file name keeps it a file.
      expect(url, model.id).toMatch(/\/[^/]+\.\w+$/);
      const shipped = readFileSync(join(repoRoot, model.licence.file));
      expect(shipped.length, model.id).toBeGreaterThan(0);
      const response = await GET(new Request(`https://example.test${url}`), {
        params: Promise.resolve({ file: licenceFileName(model) }),
      });
      expect(response.status, model.id).toBe(200);
      expect(response.headers.get('content-type'), model.id).toBe('text/plain; charset=utf-8');
      expect(Buffer.from(await response.arrayBuffer()).equals(shipped), model.id).toBe(true);
    }
    const missing = await GET(new Request('https://example.test/'), { params: Promise.resolve({ file: 'none.txt' }) });
    expect(missing.status).toBe(404);
  });

  it('loads a URDF the site serves', () => {
    for (const model of MODELS_3D) {
      expect(urdfUrl(model)).toBe(modelFileUrl(model, model.urdf));
      expect(existsSync(publicFile(urdfUrl(model))), model.id).toBe(true);
    }
  });

  it('names in its URDF only meshes that exist under its folder, and loads every shipped mesh', () => {
    for (const model of MODELS_3D) {
      const requested = requestedMeshes(model);
      expect(requested.length, model.id).toBeGreaterThan(0);
      const prefix = modelFileUrl(model, '');
      for (const url of requested) {
        expect(url.startsWith(prefix), `${model.id}: ${url}`).toBe(true);
        expect(existsSync(publicFile(url)), `${model.id}: ${url}`).toBe(true);
      }
      expect(new Set(requested).size, model.id).toBe(model.meshCount);
    }
  });

  it('keeps the figure text inside the frame’s limits and the agreed wording', () => {
    for (const model of MODELS_3D) {
      expect(words(modelHeading(model)), model.id).toBeLessThanOrEqual(10);
      expect(words(modelCaption(model)), model.id).toBeLessThanOrEqual(25);
      for (const text of [modelHeading(model), modelCaption(model), modelAltText(model), ...recordRows(model).map((row) => `${row.label} ${row.text} ${row.detail ?? ''}`)]) {
        expect(text, model.id).not.toMatch(/\bCAD\b|converted from|[–—]/);
      }
      expect(modelAltText(model)).toContain(model.product);
      expect(modelAltText(model)).toContain(model.urdfFile);
    }
  });

  it('sizes the model in decimal megabytes before loading', () => {
    expect(formatMegabytes(974_000)).toBe('0.97 MB');
    expect(formatMegabytes(1_830_000)).toBe('1.8 MB');
    expect(formatMegabytes(12_400_000)).toBe('12 MB');
    for (const model of MODELS_3D) {
      expect(modelSummary(model)).toBe(`${grouped(model.meshCount)} meshes, ${formatMegabytes(model.shippedBytes)}`);
    }
  });
});
