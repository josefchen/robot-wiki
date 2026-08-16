/**
 * Image registry: the single source of truth for every content image.
 *
 * MDX content and the home page reference these via <Image id="..."/> (the
 * ImageRef resolver); scripts/validate-content.ts fails the build if a page
 * references an id that is not registered here, if a registered image is
 * referenced nowhere, or if an entry's licence is missing or outside the
 * permitted set (VAL-IMG-006, VAL-IMG-007, VAL-IMG-008). The /credits page
 * is generated from this registry, so it cannot drift from what renders.
 *
 * Licensing policy lives in library/imagery.md and is a hard gate. Every
 * entry below records the verbatim licence sentence read on the asset's own
 * page (the anti-fabrication rule) in a comment next to the entry. Never
 * register an image whose creator and licence you cannot name.
 *
 * Type-only relative import so this file loads under plain node, Vitest,
 * and Next.js alike.
 */
import type { SiteImage } from './schemas/image.ts';

export type { SiteImage } from './schemas/image.ts';

export const IMAGES: SiteImage[] = [
  {
    id: 'spot-raf-agile-liberty-2021',
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
    file: '/images/franka-emika-panda-cebit-2017.jpg',
    alt: 'A white seven-axis Franka Emika Panda robot arm mounted on a demonstration table at CeBIT 2017, guided by hand above trays of small parts.',
    caption:
      'The Franka Emika Panda, the seven-DoF research arm, demonstrated at CeBIT 2017 with a human guiding it by hand.',
    sourceName: 'Wikimedia Commons',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Franka_Emika2.jpg',
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
    file: '/images/covariate-shift.svg',
    alt: 'Diagram of covariate shift: demonstration trajectories form a narrow corridor around the expert path, while the policy rollout starts inside the corridor and drifts outside it.',
    caption:
      "Demonstrations cover a narrow corridor of states around the expert path. The policy's first mistake takes it outside that corridor, where its next mistake is more likely. Deviation feeds itself.",
    sourceName: 'robot-wiki (original diagram)',
    creator: 'robot-wiki contributors',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-08-08',
    width: 640,
    height: 250,
    // Original SVG drawn for this site. Convention (library/imagery.md):
    // site-created diagrams carry no sourceUrl, because there is no
    // external original to link to; the credit names robot-wiki as the
    // creator in text. The licence basis is the site's content licence
    // (CC BY 4.0, mission.md).
  },
  {
    id: 'temporal-ensembling',
    file: '/images/temporal-ensembling.svg',
    alt: 'Diagram of temporal ensembling: three overlapping action chunks each contain a prediction for the same action a_t, and exponential weights favor the newest prediction.',
    caption:
      'Three chunks in flight at time t. Each contains a prediction for the current action; the ensemble averages the predictions with exponential weights that favor the newest chunk.',
    sourceName: 'robot-wiki (original diagram)',
    creator: 'robot-wiki contributors',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-08-07',
    width: 640,
    height: 250,
    // Original SVG drawn for this site; same no-sourceUrl convention as
    // covariate-shift above.
  },
];

const byId = new Map(IMAGES.map((image) => [image.id, image]));

/** Look up a registry entry; undefined for an unregistered id. */
export function getImage(id: string): SiteImage | undefined {
  return byId.get(id);
}

const LICENCE_LABELS: Record<SiteImage['licence'], string> = {
  cc0: 'CC0 1.0',
  'cc-by-4.0': 'CC BY 4.0',
  'cc-by-sa-4.0': 'CC BY-SA 4.0',
  'public-domain': 'Public domain',
  'press-kit': 'Press kit',
  permission: 'Used with permission',
};

/** The display label a credit line and /credits show for a licence. */
export function licenceLabel(image: SiteImage): string {
  return LICENCE_LABELS[image.licence];
}
