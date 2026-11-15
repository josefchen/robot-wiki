/**
 * What /robots-in-3d/ derives from data/models-3d.ts: the lead sentence, the
 * addresses the viewer loads, and each record as the rows of its definition
 * table. Every value on the page comes from a record through here, so the
 * page holds whatever MODELS_3D holds.
 */
import { MODELS_3D, type Model3d } from '../data/models-3d.ts';
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
    { key: 'checked', label: 'Checked', text: formatShortDate(model.checked), date: model.checked, mono: true },
  ];
}
