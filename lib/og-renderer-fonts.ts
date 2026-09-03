/**
 * The Open Graph renderer's registered font faces.
 *
 * Satori cannot consume a variable WOFF2, which is why the OG path uses
 * separately vendored static binaries rather than the browser faces. Each
 * registered face still has to serve one of the four first-party roles:
 * VAL-B2-TYPE-001's KaTeX exception is scoped to mathematical content and
 * must never substitute for a first-party role, so the renderer's mono
 * data/registration labels use the vendored static IBM Plex Mono.
 *
 * This module is the single source of both the CSS stacks the artwork
 * applies and the face list the generator registers with ImageResponse, so
 * a family cannot be painted without also being registered.
 */
import { PLEX_MONO_FONT_METADATA } from '../data/plex-mono-font-metadata.ts';
import { TEKTUR_FONT_METADATA } from '../data/tektur-font-metadata.ts';
import { FIRST_PARTY_TYPE_ROLES } from '../data/type-roles.ts';

export type OgRendererRoleId = (typeof FIRST_PARTY_TYPE_ROLES)[number]['id'];

/** The discrete weights satori accepts for a registered face. */
export type OgRendererFontWeight =
  | 100
  | 200
  | 300
  | 400
  | 500
  | 600
  | 700
  | 800
  | 900;

export type OgRendererFace = {
  faceId: string;
  /** Family name registered with the renderer and named first in `stack`. */
  family: string;
  roleId: OgRendererRoleId;
  /** The CSS font-family stack the card artwork applies. */
  stack: string;
  path: string;
  sha256: string;
  weight: OgRendererFontWeight;
  style: 'normal';
  licensePath: string;
  metadataPath: string;
};

export const OG_RENDERER_FACES: readonly OgRendererFace[] = [
  {
    faceId: 'og-face:display',
    family: TEKTUR_FONT_METADATA.family,
    roleId: 'display',
    stack: `${TEKTUR_FONT_METADATA.family}, sans-serif`,
    path: TEKTUR_FONT_METADATA.og.path,
    sha256: TEKTUR_FONT_METADATA.og.sha256,
    weight: TEKTUR_FONT_METADATA.og.weight,
    style: TEKTUR_FONT_METADATA.og.style,
    licensePath: TEKTUR_FONT_METADATA.license.path,
    metadataPath: 'assets/fonts/tektur/metadata.json',
  },
  {
    faceId: 'og-face:data',
    family: PLEX_MONO_FONT_METADATA.family,
    roleId: 'data',
    stack: `${PLEX_MONO_FONT_METADATA.family}, monospace`,
    path: PLEX_MONO_FONT_METADATA.og.path,
    sha256: PLEX_MONO_FONT_METADATA.og.sha256,
    weight: PLEX_MONO_FONT_METADATA.og.weight,
    style: PLEX_MONO_FONT_METADATA.og.style,
    licensePath: PLEX_MONO_FONT_METADATA.license.path,
    metadataPath: 'assets/fonts/ibm-plex-mono/metadata.json',
  },
];

function stackFor(roleId: OgRendererRoleId): string {
  const face = OG_RENDERER_FACES.find((entry) => entry.roleId === roleId);
  if (!face) {
    throw new Error(`No OG renderer face is registered for role ${roleId}`);
  }
  return face.stack;
}

export const OG_DISPLAY_STACK = stackFor('display');
export const OG_MONO_STACK = stackFor('data');

/** The family a CSS stack resolves to first, e.g. `IBM Plex Mono`. */
export function primaryFamily(stack: string): string {
  return (stack.split(',')[0] ?? '').trim().replace(/^["']|["']$/g, '');
}

export function ogRendererFaceForStack(
  stack: string,
): OgRendererFace | undefined {
  const family = primaryFamily(stack);
  return OG_RENDERER_FACES.find((face) => face.family === family);
}
