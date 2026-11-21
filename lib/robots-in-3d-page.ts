/**
 * What /robots-in-3d/ derives from data/models-3d.ts and
 * data/maker-model-sources.ts: the lead sentences, the addresses the viewer
 * loads, each record as the rows of its definition table, and the register's
 * four tables. Every value on the page comes from a record through here, so
 * the page holds whatever the two modules hold.
 */
import {
  MAKER_MODEL_SOURCES,
  MAKER_MODEL_SOURCES_AS_OF,
  type MakerModelSource,
  type MakerModelStatus,
} from '../data/maker-model-sources.ts';
import { MODELS_3D, type Model3d } from '../data/models-3d.ts';
import { formatLongDate } from './dates.ts';
import { MAKER_MODEL_STATUS_ORDER, countsByStatus, rowsByStatus } from './maker-model-sources.ts';
import { formatShortDate } from './market-map.ts';

export const ROBOTS_IN_3D_PATH = '/robots-in-3d/';
export const ROBOTS_IN_3D_TITLE = 'Robots in 3D';

const NUMBER_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

const count = (n: number) => NUMBER_WORDS[n] ?? String(n);
const grouped = (n: number) => n.toLocaleString('en-US');

/** "A", "A and B", "A, B and C". */
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** The latest `checked` day over the records, `YYYY-MM-DD`. */
export function newestChecked(models: readonly Model3d[] = MODELS_3D): string {
  if (models.length === 0) throw new Error('robots-in-3d: no models');
  return models.map((model) => model.checked).reduce((a, b) => (b > a ? b : a));
}

/** Whether every record ships exactly as many triangles as its maker's files hold. */
export function trianglesUnchanged(models: readonly Model3d[] = MODELS_3D): boolean {
  return models.every((model) => model.shippedTriangles === model.sourceTriangles);
}

/**
 * The header's lead, without its closing full stop: how many models, whose
 * files, and whether the triangle counts equal the makers'. The header ends
 * it on the newest `checked` date.
 */
export function robotsIn3dLead(models: readonly Model3d[] = MODELS_3D): string {
  const makers = joinNames([...new Set(models.map((model) => model.maker))]);
  const one = models.length === 1;
  const subject = `${count(models.length)} robot ${one ? 'model' : 'models'} drawn from ${one ? 'its maker’s' : 'their makers’'} own URDF and mesh files, by ${makers}`;
  const triangles = trianglesUnchanged(models)
    ? `${one ? 'with' : 'each with'} the same triangle count as the maker’s meshes`
    : 'with the triangle counts of the maker’s meshes and of the shipped files';
  return `${subject}, ${triangles}`;
}

/** The site address of a file under the record's folder. */
export function modelFileUrl(model: Model3d, file: string): string {
  return `/${model.dir.replace(/^public\//, '')}/${file}`;
}

/** The shipped URDF the viewer assembles the model from. */
export function urdfUrl(model: Model3d): string {
  return modelFileUrl(model, model.urdf);
}

/** The name app/robots-in-3d/licences/[file]/route.ts serves the record's licence under. */
export function licenceFileName(model: Model3d): string {
  return `${model.id}.txt`;
}

/**
 * The licence text shipped beside the files, as the site serves it: the
 * route copies `licence.file` byte for byte to an address with an
 * extension, which the host serves without a trailing-slash redirect.
 */
export function licenceUrl(model: Model3d): string {
  return `${ROBOTS_IN_3D_PATH}licences/${licenceFileName(model)}`;
}

/** The maker's folder at the pinned commit. */
export function sourceTreeUrl(model: Model3d): string {
  return `${model.repository}/tree/${model.commit}/${model.sourcePath}`;
}

export function shortCommit(model: Model3d): string {
  return model.commit.slice(0, 8);
}

/** `owner/name` of a GitHub repository address. */
export function repositoryName(model: Model3d): string {
  return new URL(model.repository).pathname.replace(/^\/|\/$/g, '');
}

/** Decimal megabytes to two significant figures: "0.97 MB", "1.8 MB". */
export function formatMegabytes(bytes: number): string {
  return `${Number((bytes / 1e6).toPrecision(2))} MB`;
}

/** What the frame shows before the reader loads the model. */
export function modelSummary(model: Model3d): string {
  return `${grouped(model.meshCount)} meshes, ${formatMegabytes(model.shippedBytes)}`;
}

/** The figure's headline. */
export function modelHeading(model: Model3d): string {
  return `${model.product} at the zero pose of its URDF`;
}

/** The figure's caption: what is drawn and whose choice the surface is. */
export function modelCaption(model: Model3d): string {
  return `Assembled in the browser from the shipped URDF and its ${grouped(model.meshCount)} meshes, in one neutral grey that the site chose.`;
}

/** The canvas's text alternative. */
export function modelAltText(model: Model3d): string {
  return `3D model of the ${model.product} by ${model.maker}, assembled from ${model.urdfFile} and ${grouped(model.meshCount)} meshes at the zero pose. Drag or use the arrow keys to turn it; scroll, pinch or press + or - to zoom.`;
}

/**
 * The two stills of the viewer's opening view, one per stage shape
 * (components/model-viewer/model-viewer.css: 1:1, and 16:10 from 640 px).
 * scripts/render-model-stills.ts renders them in the viewer itself from the
 * shipped URDF and meshes and writes them beside the URDF. The viewer fits
 * each shape at one share of the stage at every width (FIT_STAGE_PX in
 * model-scene.tsx), so each still is rendered once, in the window where its
 * stage is widest (`stageWidth` CSS px), at the canvas's largest pixel ratio
 * (2): the browser only ever scales it down.
 */
export const MODEL_STILLS = {
  wide: {
    file: 'still-16x10.webp',
    width: 1824,
    height: 1140,
    media: '(min-width: 640px)',
    window: { width: 1440, height: 900 },
    stageWidth: 910,
  },
  square: { file: 'still-1x1.webp', width: 1114, height: 1114, window: { width: 639, height: 900 }, stageWidth: 557 },
} as const;

type StillFile = { src: string; width: number; height: number };

export type ModelStill = {
  /** The 16:10 still, for stages from 640 px wide (`media`). */
  wide: StillFile & { media: string };
  /** The 1:1 still, for narrower stages. */
  square: StillFile;
  alt: string;
};

/** The still's text alternative. */
export function modelStillAlt(model: Model3d): string {
  return `The ${model.product} by ${model.maker} at the zero pose of ${model.urdfFile}, rendered from its ${grouped(model.meshCount)} shipped meshes.`;
}

export function modelStill(model: Model3d): ModelStill {
  const { wide, square } = MODEL_STILLS;
  return {
    wide: { src: modelFileUrl(model, wide.file), width: wide.width, height: wide.height, media: wide.media },
    square: { src: modelFileUrl(model, square.file), width: square.width, height: square.height },
    alt: modelStillAlt(model),
  };
}

/** Everything the viewer takes for a record, so every page mounts it alike. */
export function modelViewerProps(model: Model3d) {
  return {
    id: model.id,
    product: model.product,
    summary: modelSummary(model),
    heading: modelHeading(model),
    caption: modelCaption(model),
    alt: modelAltText(model),
    urdf: urdfUrl(model),
    still: modelStill(model),
  };
}

export type RecordRow = {
  key: string;
  label: string;
  /** The value; a link when `href` is set. */
  text: string;
  href?: string;
  /** A second, muted part of the value. */
  detail?: string;
  /** Whether the detail is a figure or hash, set in the monospace. */
  detailMono?: boolean;
  /** Figures, file names and hashes set in the monospace. */
  mono: boolean;
  /** An ISO day, rendered in a <time>. */
  date?: string;
};

/** The record as its definition table, field by field, in a fixed order. */
export function recordRows(model: Model3d): RecordRow[] {
  return [
    { key: 'maker', label: 'Maker', text: model.maker, mono: false },
    { key: 'product', label: 'Product', text: model.product, mono: false },
    { key: 'urdf', label: 'Maker’s URDF', text: model.urdfFile, mono: true },
    { key: 'maker-label', label: 'Maker’s label', text: model.makerLabel, mono: false },
    {
      key: 'repository',
      label: 'Repository',
      text: `${repositoryName(model)}/${model.sourcePath}`,
      href: sourceTreeUrl(model),
      detail: `commit ${shortCommit(model)}`,
      detailMono: true,
      mono: true,
    },
    { key: 'licence', label: 'Licence', text: model.licence.name, href: licenceUrl(model), mono: false },
    { key: 'meshes', label: 'Meshes', text: grouped(model.meshCount), mono: true },
    { key: 'source-triangles', label: 'Triangles in the maker’s files', text: grouped(model.sourceTriangles), mono: true },
    { key: 'shipped-triangles', label: 'Triangles shipped', text: grouped(model.shippedTriangles), mono: true },
    { key: 'size', label: 'Shipped size', text: `${grouped(model.shippedBytes)} bytes`, mono: true },
    { key: 'encoding', label: 'Encoding', text: model.encoding, mono: false },
    {
      key: 'bound',
      label: 'Position bound per axis',
      text: `${model.positionBoundUm} µm`,
      detail: 'half a quantization step, computed, not measured',
      mono: true,
    },
    { key: 'change', label: 'What the conversion changed', text: model.change, mono: false },
    {
      key: 'still',
      label: 'Still before loading',
      text: 'Rendered from the shipped URDF and meshes, in the viewer’s opening view, light and grey',
      mono: false,
    },
    { key: 'checked', label: 'Checked', text: formatShortDate(model.checked), date: model.checked, mono: true },
  ];
}

/** The id of a model's block on the page: its section, viewer and record. */
export function modelBlockId(model: Model3d): string {
  return model.id;
}

/* The register of makers' own model files. */

export const MAKER_FILES_ID = 'maker-files';
export const MAKER_FILES_TITLE = 'Makers’ own model files';

/** Each status's table title, in display order. */
export const REGISTER_TABLE_TITLES: Readonly<Record<MakerModelStatus, string>> = {
  official: 'Published under a licence',
  restricted: 'Published with limits',
  'no-licence': 'Published with no licence',
  'none-found': 'None found',
};

export type RegisterTable = {
  status: MakerModelStatus;
  /** The table caption's id. */
  id: string;
  title: string;
  rows: MakerModelSource[];
};

/** The four tables, in MAKER_MODEL_STATUS_ORDER, each with its rows in data order. */
export function registerTables(rows: readonly MakerModelSource[] = MAKER_MODEL_SOURCES): RegisterTable[] {
  return MAKER_MODEL_STATUS_ORDER.map((status) => ({
    status,
    id: `${MAKER_FILES_ID}-${status}`,
    title: REGISTER_TABLE_TITLES[status],
    rows: rowsByStatus(rows, status),
  }));
}

const plural = (n: number, one: string, many: string) => `${grouped(n)} ${n === 1 ? one : many}`;

/** "Published under a licence, 21 entries". */
export function registerTableHeading(table: RegisterTable): string {
  return `${table.title}, ${plural(table.rows.length, 'entry', 'entries')}`;
}

/** The distinct git repositories read at a pinned commit. */
export function repositoriesRead(rows: readonly MakerModelSource[] = MAKER_MODEL_SOURCES): string[] {
  const repositories = rows.flatMap((row) => (row.commit && row.repository ? [row.repository] : []));
  return [...new Set(repositories)];
}

/**
 * The distinct pages read that are not a repository at a commit: every page
 * a row without a commit links or cites, its download or documentation page
 * and each of its sources.
 */
export function pagesRead(rows: readonly MakerModelSource[] = MAKER_MODEL_SOURCES): string[] {
  const pages = rows.flatMap((row) => {
    if (row.commit) return [];
    return [...(row.repository ? [row.repository] : []), ...row.sources.map((source) => source.url)];
  });
  return [...new Set(pages)];
}

/** Rows that name a licence: the official and restricted ones. */
export function licensedCount(rows: readonly MakerModelSource[] = MAKER_MODEL_SOURCES): number {
  const counts = countsByStatus(rows);
  return counts.official + counts.restricted;
}

/** Distinct makers in the register, and those with at least one found row. */
export function makerCounts(rows: readonly MakerModelSource[] = MAKER_MODEL_SOURCES): {
  searched: number;
  found: number;
} {
  const searched = new Set(rows.map((row) => row.maker));
  const found = new Set(rows.filter((row) => row.status !== 'none-found').map((row) => row.maker));
  return { searched: searched.size, found: found.size };
}

/** The register's lead under its heading: what was read, what carries a licence, and when. */
export function registerLead(
  rows: readonly MakerModelSource[] = MAKER_MODEL_SOURCES,
  asOf: string = MAKER_MODEL_SOURCES_AS_OF,
): string {
  const repositories = plural(repositoriesRead(rows).length, 'repository', 'repositories');
  const pages = plural(pagesRead(rows).length, 'web page', 'web pages');
  const licensed = licensedCount(rows);
  const carry = `${grouped(licensed)} of them ${licensed === 1 ? 'carries' : 'carry'} a licence`;
  const commits = new Set(rows.flatMap((row) => (row.commit ? [row.commit.hash] : []))).size;
  const pinned = commits === 1 ? 'a pinned commit' : 'pinned commits';
  return `As of ${formatLongDate(asOf)} the register holds ${plural(rows.length, 'entry', 'entries')}, read from ${repositories} at ${pinned} and ${pages}, and ${carry}.`;
}

/** The page header's date: the newer of the models' newest check and the register's. */
export function pageAsOf(
  models: readonly Model3d[] = MODELS_3D,
  registerAsOf: string = MAKER_MODEL_SOURCES_AS_OF,
): string {
  const modelsAsOf = newestChecked(models);
  return registerAsOf > modelsAsOf ? registerAsOf : modelsAsOf;
}

/**
 * The page header's lead, without its closing full stop: the hosted models,
 * then for how many of the makers searched model files were found. It says
 * only what was found, never that the others publish none. The header ends
 * it on pageAsOf().
 */
export function robotsIn3dPageLead(
  models: readonly Model3d[] = MODELS_3D,
  rows: readonly MakerModelSource[] = MAKER_MODEL_SOURCES,
): string {
  const { searched, found } = makerCounts(rows);
  const share = found === searched ? `all ${grouped(searched)}` : `${grouped(found)} of the ${grouped(searched)}`;
  return `${robotsIn3dLead(models)}, and model files found for ${share} makers searched`;
}

export type RegisterLink = { text: string; href: string };

/** An address as link text: host and path, without "www." or a trailing slash. */
export function displayAddress(url: string): string {
  const { hostname, pathname } = new URL(url);
  return `${hostname.replace(/^www\./, '')}${pathname}`.replace(/\/$/, '');
}

/** The repository at its pinned commit, or the download page when no commit is pinned. */
export function repositoryLink(row: MakerModelSource): RegisterLink | null {
  if (!row.repository) return null;
  if (!row.commit) return { text: displayAddress(row.repository), href: row.repository };
  const { hostname, pathname } = new URL(row.repository);
  const text = hostname === 'github.com' ? pathname.replace(/^\/|\/$/g, '') : displayAddress(row.repository);
  return { text, href: `${row.repository}/tree/${row.commit.hash}` };
}

/** The pinned commit's first eight characters, or null off git. */
export function registerShortCommit(row: MakerModelSource): string | null {
  return row.commit ? row.commit.hash.slice(0, 8) : null;
}

export function licenceLink(row: MakerModelSource): RegisterLink | null {
  return row.licence ? { text: row.licence.name, href: row.licence.url } : null;
}

/** A row whose files the site ships: the link to that model's block on this page. */
export function hostedLink(row: MakerModelSource, models: readonly Model3d[] = MODELS_3D): RegisterLink | null {
  if (!row.hostedModelId) return null;
  const model = models.find((candidate) => candidate.id === row.hostedModelId);
  if (!model) throw new Error(`robots-in-3d: ${row.id} names ${row.hostedModelId}, which the site does not ship`);
  return { text: model.product, href: `#${modelBlockId(model)}` };
}

/** The pages a none-found row read. */
export function pagesReadLinks(row: MakerModelSource): RegisterLink[] {
  return row.sources.map((source) => ({ text: displayAddress(source.url), href: source.url }));
}
