/**
 * Image registry: the single source of truth for every content image.
 *
 * MDX content and the home page reference these via <Image id="..."/> (the
 * ImageRef resolver); scripts/validate-content.ts fails the build if a page
 * references an id that is not registered here, if a registered image is
 * referenced nowhere, or if an entry's licence is missing or outside the
 * permitted set. The /credits page
 * is generated from this registry, so it cannot drift from what renders.
 *
 * Licensing policy lives in library/imagery.md and is a hard gate. Every
 * entry below records the verbatim licence sentence read on the asset's own
 * page (the anti-fabrication rule) in a comment next to the entry. Never
 * invent a Commons licence. Official market-map marks with no reuse grant
 * use licence `unlicensed` or `unknown` and still name creator plus source.
 *
 * Market-map logos live in data/logo-images.ts (files under
 * public/images/logos/) and are concatenated here. Article photographs
 * stay in this file under public/images/. The market-map client reads
 * logos through data/logos.ts so it does not pull this registry.
 *
 * Type-only relative import so this file loads under plain node, Vitest,
 * and Next.js alike.
 */
import { LOGO_IMAGES } from './logo-images.ts';
import {
  CREDIT_NOUNS,
  LEGAL_BASIS_BY_LICENCE,
  LICENCE_LABELS,
  attributionSentence,
  isCompanyMarkFile,
  type FigureKind,
  type LegalBasis,
  type PreservationPolicy,
  type SiteImage,
} from './schemas/image.ts';

export type { SiteImage } from './schemas/image.ts';

const ARTICLE_IMAGES: SiteImage[] = [
  {
    id: 'spot-raf-agile-liberty-2021',
    figureKind: 'photograph',
    legalBasis: 'public-domain',
    attributionText:
      'Photo: Senior Airman John Ennis, U.S. Air Force / Wikimedia Commons. Licence: Public domain.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/spot-raf-agile-liberty-2021.jpg',
    alt: 'A yellow Boston Dynamics Spot quadruped robot walks across an airfield tarmac alongside Royal Air Force airmen in camouflage uniform.',
    caption:
      'A Boston Dynamics Spot quadruped walks with Royal Air Force airmen at RAF Leeming during the Agile Liberty 21-2 technology trials in August 2021.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Spot_robot_Royal_Air_Force.jpg',
    creator: 'Senior Airman John Ennis, U.S. Air Force',
    licence: 'public-domain',
    licenceUrl:
      'https://commons.wikimedia.org/wiki/Template:PD-USGov-Military-Air_Force',
    retrieved: '2026-08-10',
    width: 1920,
    height: 869,
    // Licence sentence read on the file page: "This image or file is a work
    // of a U.S. Air Force Airman or employee, taken or made as part of that
    // person's official duties. As a work of the U.S. federal government,
    // the image or file is in the public domain in the United States."
  },
  {
    id: 'atlas-darpa-frontview-2013',
    figureKind: 'photograph',
    legalBasis: 'public-domain',
    attributionText:
      'Photo: DARPA / Wikimedia Commons. Licence: Public domain.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/atlas-darpa-frontview-2013.jpg',
    alt: 'The 2013 DARPA Atlas humanoid robot stands facing forward with its exposed metal frame, hydraulic lines, and stereo camera head visible.',
    caption:
      'The original Atlas humanoid, built for the 2013 DARPA Robotics Challenge: hydraulically actuated, tethered, with its frame and sensor head exposed. The electric Atlas discussed above is its clean-sheet successor.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Atlas_frontview_2013.jpg',
    creator: 'DARPA',
    licence: 'public-domain',
    licenceUrl: 'https://commons.wikimedia.org/wiki/Template:PD-USGov',
    retrieved: '2026-08-10',
    width: 1280,
    height: 1762,
    // Licence sentence read on the file page: "This image or file is a work
    // of a Defense Advanced Research Projects Agency (DARPA), an agency of
    // the United States Department of Defense, employee, taken or made as
    // part of that person's official duties. As a work of the U.S. federal
    // government, the image is in the public domain."
  },
  {
    id: 'puma-560-nasa-ames',
    figureKind: 'photograph',
    legalBasis: 'public-domain',
    attributionText:
      'Photo: NASA / Dominic Hart / Wikimedia Commons. Licence: Public domain.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/puma-560-nasa-ames.jpg',
    alt: 'A stroboscopic NASA photograph shows a PUMA 560 robot arm in several successive positions as it moves small parts between fixtures on a table.',
    caption:
      'A PUMA 560 at NASA Ames, photographed in a stroboscopic exposure as it cycles through its workspace. The six-revolute PUMA layout is the canonical teaching example for the Denavit-Hartenberg convention.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Puma_Robotic_Arm_-_GPN-2000-001817.jpg',
    creator: 'NASA / Dominic Hart',
    licence: 'public-domain',
    licenceUrl: 'https://commons.wikimedia.org/wiki/Template:PD-USGov-NASA',
    retrieved: '2026-08-10',
    width: 1280,
    height: 1627,
    // Licence sentence read on the file page: "This file is in the public
    // domain in the United States because it was solely created by NASA."
  },
  {
    id: 'anymal-anybotics-2022',
    figureKind: 'photograph',
    legalBasis: 'cc-by-sa',
    attributionText:
      'Photo: ANYbotics / Wikimedia Commons. Licence: CC BY-SA 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/anymal-anybotics-2022.jpg',
    alt: 'A red and grey ANYmal quadruped robot stands on a metal grate walkway inside an industrial facility, surrounded by pipes and machinery.',
    caption:
      'ANYmal, the ANYbotics quadruped behind the ETH Zurich locomotion lineage, on an industrial inspection floor. The actuator-network and terrain-curriculum results above all ran on this platform.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:ANYbotics_robot_dog_ANYmal.jpg',
    creator: 'ANYbotics',
    licence: 'cc-by-sa-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    retrieved: '2026-08-10',
    width: 1920,
    height: 1280,
    // Licence sentence read on the file page: "This file is licensed under
    // the Creative Commons Attribution-Share Alike 4.0 International
    // license." (author ANYbotics, own work).
  },
  {
    id: 'franka-emika-panda-cebit-2017',
    figureKind: 'photograph',
    legalBasis: 'cc-by-sa',
    attributionText:
      'Photo: Ims / Wikimedia Commons. Licence: CC BY-SA 4.0.',
    preservationPolicy: 'external-bytes-preserved',
    file: '/images/franka-emika-panda-cebit-2017.jpg',
    alt: 'A white seven-axis Franka Emika Panda robot arm mounted on a demonstration table at CeBIT 2017, guided by hand above trays of small parts.',
    caption:
      'The Franka Emika Panda, the seven-DoF research arm, demonstrated at CeBIT 2017 with a human guiding it by hand.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Franka_Emika2.jpg',
    creator: 'Ims',
    licence: 'cc-by-sa-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    retrieved: '2026-08-10',
    width: 1920,
    height: 1280,
    // Licence sentence read on the file page: "This file is licensed under
    // the Creative Commons Attribution-Share Alike 4.0 International
    // license." (author Ims, own work, CeBIT 2017 Hannover).
  },
  {
    id: 'covariate-shift',
    figureKind: 'original-schematic',
    legalBasis: 'owned',
    attributionText:
      'Diagram: Robot Wiki contributors / Robot Wiki (original diagram). Licence: CC BY 4.0.',
    preservationPolicy: 'first-party-restyled-semantics-preserved',
    file: '/images/covariate-shift.svg',
    alt: 'Diagram of covariate shift: demonstration trajectories form a narrow corridor around the expert path, while the policy rollout starts inside the corridor and drifts outside it.',
    caption:
      'Demonstrations cover a narrow corridor of states around the expert path. The policy\'s first mistake takes it outside that corridor, where its next mistake is more likely. Deviation feeds itself.',
    sourceName: 'Robot Wiki (original diagram)',
    creator: 'Robot Wiki contributors',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-08-08',
    width: 640,
    height: 250,
    // Original SVG drawn for this site. Convention (library/imagery.md):
    // site-created diagrams carry no sourceUrl, because there is no
    // external original to link to; the credit names Robot Wiki as the
    // creator in text. The licence basis is the site's content licence
    // (CC BY 4.0, mission.md).
  },
  {
    id: 'temporal-ensembling',
    figureKind: 'original-schematic',
    legalBasis: 'owned',
    attributionText:
      'Diagram: Robot Wiki contributors / Robot Wiki (original diagram). Licence: CC BY 4.0.',
    preservationPolicy: 'first-party-restyled-semantics-preserved',
    file: '/images/temporal-ensembling.svg',
    alt: 'Diagram of temporal ensembling: three overlapping action chunks each contain a prediction for the same action a_t, and exponential weights favor the newest prediction.',
    caption:
      'Three chunks in flight at time t. Each contains a prediction for the current action; the ensemble averages the predictions with exponential weights that favor the newest chunk.',
    sourceName: 'Robot Wiki (original diagram)',
    creator: 'Robot Wiki contributors',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-08-07',
    width: 640,
    height: 250,
    // Original SVG drawn for this site; same no-sourceUrl convention as
    // covariate-shift above.
  },
];

export const IMAGES: SiteImage[] = [...ARTICLE_IMAGES, ...LOGO_IMAGES];

const byId = new Map(IMAGES.map((image) => [image.id, image]));

/** Look up a registry entry; undefined for an unregistered id. */
export function getImage(id: string): SiteImage | undefined {
  return byId.get(id);
}

/** The display label a credit line and /credits show for a licence. */
export function licenceLabel(image: SiteImage): string {
  return LICENCE_LABELS[image.licence];
}

/**
 * What the entry is. Declared on every editorial image; derived for the
 * market-map marks, whose hundred-odd rows are owned by `VAL-B2-MAP-010`
 * and are all the same kind by construction (they live under
 * `public/images/logos/` because they are company marks).
 */
export function figureKind(image: SiteImage): FigureKind {
  if (image.figureKind) return image.figureKind;
  if (isCompanyMarkFile(image.file)) return 'official-mark';
  throw new Error(
    `${image.id} declares no figureKind and is not a market-map mark`,
  );
}

/** The §1.13 legal basis, declared or derived from the recorded licence. */
export function legalBasis(image: SiteImage): LegalBasis {
  return image.legalBasis ?? LEGAL_BASIS_BY_LICENCE[image.licence];
}

/**
 * The byte/style preservation policy. A mark carries the same promise as an
 * external photograph: the shipped bytes are the retrieved bytes, and only
 * the contain-fit placement `VAL-B2-MAP-010` registers may differ.
 */
export function preservationPolicy(image: SiteImage): PreservationPolicy {
  return image.preservationPolicy ?? 'external-bytes-preserved';
}

/** The noun the visible credit opens with, from what the figure is. */
export function creditNoun(image: SiteImage): string {
  return CREDIT_NOUNS[figureKind(image)];
}

/**
 * The attribution sentence this entry requires, in the wording the credit
 * renders. Editorial entries also record it verbatim; the schema refuses a
 * record that disagrees with this derivation, so the two cannot drift.
 */
export function attributionText(image: SiteImage): string {
  return image.attributionText ?? attributionSentence(image);
}
