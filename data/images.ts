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
 * register an image whose creator and licence you cannot name.
 *
 * Market-map logos live under public/images/logos/ and are referenced
 * from company.logo. Article photographs stay directly under
 * public/images/.
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
    file: '/images/covariate-shift.svg',
    alt: 'Diagram of covariate shift: demonstration trajectories form a narrow corridor around the expert path, while the policy rollout starts inside the corridor and drifts outside it.',
    caption:
      'Demonstrations cover a narrow corridor of states around the expert path. The policy\'s first mistake takes it outside that corridor, where its next mistake is more likely. Deviation feeds itself.',
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
  {
    id: 'physical-intelligence-logo',
    file: '/images/logos/physical-intelligence.png',
    alt: 'Physical Intelligence wordmark and mark on a transparent field',
    caption: 'Physical Intelligence logo from Wikimedia Commons, used on the market map.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Physical_Intelligence_logo.png',
    creator: 'Physical Intelligence',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-08-20',
    width: 200,
    height: 200,
    // Licence sentence read on the file page: "This file is licensed under the Creative Commons Attribution
    // 4.0 International license."
  },
  {
    id: 'covariant-logo',
    file: '/images/logos/covariant.png',
    alt: 'Covariant wordmark used by the robotics foundation model company',
    caption: 'Covariant logo from Wikimedia Commons, used on the market map.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Covariant_Logo_2021.png',
    creator: 'Covariant.AI',
    licence: 'cc-by-sa-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    retrieved: '2026-08-20',
    width: 2000,
    height: 832,
    // Licence sentence read on the file page: "This file is licensed under the Creative Commons
    // Attribution-Share Alike 4.0 International license."
  },
  {
    id: 'nvidia-logo',
    file: '/images/logos/nvidia.svg',
    alt: 'NVIDIA wordmark in the company green on a transparent field',
    caption: 'NVIDIA wordmark from Wikimedia Commons, used on the market map.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Nvidia_logo.svg',
    creator: 'NVIDIA',
    licence: 'public-domain',
    licenceUrl: 'https://commons.wikimedia.org/wiki/Template:PD-textlogo',
    retrieved: '2026-08-20',
    width: 630,
    height: 118,
    // Licence sentence read on the file page: "This logo image consists only of simple geometric shapes or
    // text. It does not meet the threshold of originality needed
    // for copyright protection, and is therefore in the public
    // domain."
  },
  {
    id: 'hugging-face-logo',
    file: '/images/logos/hugging-face.svg',
    alt: 'Hugging Face wordmark with the smiling face mark',
    caption: 'Hugging Face logo from Wikimedia Commons, used on the market map.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Hf-logo-with-title.svg',
    creator: 'Victor (Hugging Face Staff)',
    licence: 'public-domain',
    licenceUrl: 'https://commons.wikimedia.org/wiki/Template:PD-textlogo',
    retrieved: '2026-08-20',
    width: 963,
    height: 256,
    // Licence sentence read on the file page: "This logo image consists only of simple geometric shapes or
    // text. It does not meet the threshold of originality needed
    // for copyright protection, and is therefore in the public
    // domain."
  },
  {
    id: 'applied-intuition-logo',
    file: '/images/logos/applied-intuition.png',
    alt: 'Applied Intuition wordmark on a transparent field',
    caption: 'Applied Intuition logo from Wikimedia Commons, used on the market map.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Applied_Intuition_Logo.png',
    creator: 'Redpod22',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-08-20',
    width: 6000,
    height: 800,
    // Licence sentence read on the file page: "This file is licensed under the Creative Commons Attribution
    // 4.0 International license."
  },
  {
    id: 'figure-ai-logo',
    file: '/images/logos/figure-ai.svg',
    alt: 'Figure AI circular mark used by the humanoid company',
    caption: 'Figure AI logo from Wikimedia Commons, used on the market map.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Figure-ai-logo.svg',
    creator: 'Figure AI',
    licence: 'cc-by-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0',
    retrieved: '2026-08-20',
    width: 512,
    height: 512,
    // Licence sentence read on the file page: "This file is licensed under the Creative Commons Attribution
    // 4.0 International license."
  },
  {
    id: 'agility-robotics-logo',
    file: '/images/logos/agility-robotics.svg',
    alt: 'Agility Robotics wordmark on a transparent field',
    caption: 'Agility Robotics logo from Wikimedia Commons, used on the market map.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Agility_Robotics_logo.svg',
    creator: 'Agility Robotics',
    licence: 'public-domain',
    licenceUrl: 'https://commons.wikimedia.org/wiki/Template:PD-logo',
    retrieved: '2026-08-20',
    width: 724,
    height: 164,
    // Licence sentence read on the file page: "This logo image consists only of simple geometric shapes or
    // text. It does not meet the threshold of originality needed
    // for copyright protection, and is therefore in the public
    // domain."
  },
  {
    id: 'tesla-logo',
    file: '/images/logos/tesla.svg',
    alt: 'Tesla T shield mark in red on a transparent field',
    caption: 'Tesla mark from Wikimedia Commons, used on the market map.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Tesla_Motors.svg',
    creator: 'Tesla',
    licence: 'public-domain',
    licenceUrl: 'https://commons.wikimedia.org/wiki/Template:PD-textlogo',
    retrieved: '2026-08-20',
    width: 279,
    height: 360,
    // Licence sentence read on the file page: "This logo image consists only of simple geometric shapes or
    // text. It does not meet the threshold of originality needed
    // for copyright protection, and is therefore in the public
    // domain."
  },
  {
    id: 'boston-dynamics-logo',
    file: '/images/logos/boston-dynamics.svg',
    alt: 'Boston Dynamics wordmark on a transparent field',
    caption: 'Boston Dynamics logo from Wikimedia Commons, used on the market map.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:BostonDynamics_Logo.svg',
    creator: 'Cleanoxygenforeveryone',
    licence: 'cc-by-sa-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    retrieved: '2026-08-20',
    width: 512,
    height: 512,
    // Licence sentence read on the file page: "This file is licensed under the Creative Commons
    // Attribution-Share Alike 4.0 International license."
  },
  {
    id: 'unitree-logo',
    file: '/images/logos/unitree.svg',
    alt: 'Unitree wordmark on a transparent field',
    caption: 'Unitree Robotics logo from Wikimedia Commons, used on the market map.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Unitree.svg',
    creator: 'Unitree',
    licence: 'public-domain',
    licenceUrl: 'https://commons.wikimedia.org/wiki/Template:PD-textlogo',
    retrieved: '2026-08-20',
    width: 512,
    height: 115,
    // Licence sentence read on the file page: "This logo image consists only of simple geometric shapes or
    // text. It does not meet the threshold of originality needed
    // for copyright protection, and is therefore in the public
    // domain."
  },
  {
    id: 'ubtech-logo',
    file: '/images/logos/ubtech.svg',
    alt: 'UBTECH wordmark on a transparent field',
    caption: 'UBTECH Robotics logo from Wikimedia Commons, used on the market map.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:UBTECH.svg',
    creator: 'UBTECH Robotics Inc.',
    licence: 'public-domain',
    licenceUrl: 'https://commons.wikimedia.org/wiki/Template:PD-textlogo',
    retrieved: '2026-08-20',
    width: 512,
    height: 127,
    // Licence sentence read on the file page: "This logo image consists only of simple geometric shapes or
    // text. It does not meet the threshold of originality needed
    // for copyright protection, and is therefore in the public
    // domain."
  },
  {
    id: 'neura-robotics-logo',
    file: '/images/logos/neura-robotics.svg',
    alt: 'NEURA Robotics wordmark on a transparent field',
    caption: 'NEURA Robotics logo from Wikimedia Commons, used on the market map.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Neura_robotics_logo.svg',
    creator: 'Neura Robotics GmbH',
    licence: 'public-domain',
    licenceUrl: 'https://commons.wikimedia.org/wiki/Template:PD-textlogo',
    retrieved: '2026-08-20',
    width: 184,
    height: 22,
    // Licence sentence read on the file page: "This logo image consists only of simple geometric shapes or
    // text. It does not meet the threshold of originality needed
    // for copyright protection, and is therefore in the public
    // domain."
  },
  {
    id: 'wandercraft-logo',
    file: '/images/logos/wandercraft.svg',
    alt: 'Wandercraft wordmark on a transparent field',
    caption: 'Wandercraft logo from Wikimedia Commons, used on the market map.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Wandercraft_logo.svg',
    creator: 'Wandercraft',
    licence: 'public-domain',
    licenceUrl: 'https://commons.wikimedia.org/wiki/Template:PD-textlogo',
    retrieved: '2026-08-20',
    width: 512,
    height: 93,
    // Licence sentence read on the file page: "This logo image consists only of simple geometric shapes or
    // text. It does not meet the threshold of originality needed
    // for copyright protection, and is therefore in the public
    // domain."
  },
  {
    id: 'rainbow-robotics-logo',
    file: '/images/logos/rainbow-robotics.png',
    alt: 'Rainbow Robotics wordmark in black on a transparent field',
    caption: 'Rainbow Robotics logo from Wikimedia Commons, used on the market map.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Rainbow_Robotics_Logo_Black.png',
    creator: 'Rainbow Robotics',
    licence: 'public-domain',
    licenceUrl: 'https://commons.wikimedia.org/wiki/Template:PD-textlogo',
    retrieved: '2026-08-20',
    width: 1772,
    height: 540,
    // Licence sentence read on the file page: "This logo image consists only of simple geometric shapes or
    // text. It does not meet the threshold of originality needed
    // for copyright protection, and is therefore in the public
    // domain."
  },
  {
    id: 'berkshire-grey-logo',
    file: '/images/logos/berkshire-grey.svg',
    alt: 'Berkshire Grey wordmark on a transparent field',
    caption: 'Berkshire Grey logo from Wikimedia Commons, used on the market map.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Berkshire_Grey_logo_2022.svg',
    creator: 'Berkshire Grey',
    licence: 'public-domain',
    licenceUrl: 'https://commons.wikimedia.org/wiki/Template:PD-textlogo',
    retrieved: '2026-08-20',
    width: 135,
    height: 32,
    // Licence sentence read on the file page: "This logo image consists only of simple geometric shapes or
    // text. It does not meet the threshold of originality needed
    // for copyright protection, and is therefore in the public
    // domain."
  },
  {
    id: 'amazon-robotics-logo',
    file: '/images/logos/amazon-robotics.svg',
    alt: 'Amazon Robotics wordmark on a transparent field',
    caption: 'Amazon Robotics logo from Wikimedia Commons, used on the market map.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Amazon_Robotics_logo.svg',
    creator: 'Amazon.com, Inc.',
    licence: 'public-domain',
    licenceUrl: 'https://commons.wikimedia.org/wiki/Template:PD-textlogo',
    retrieved: '2026-08-20',
    width: 585,
    height: 182,
    // Licence sentence read on the file page: "This logo image consists only of simple geometric shapes or
    // text. It does not meet the threshold of originality needed
    // for copyright protection, and is therefore in the public
    // domain."
  },
  {
    id: 'bedrock-robotics-logo',
    file: '/images/logos/bedrock-robotics.svg',
    alt: 'Bedrock Robotics wordmark on a transparent field',
    caption: 'Bedrock Robotics logo from Wikimedia Commons, used on the market map.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Bedrock_Robotics_logo.svg',
    creator: 'Bedrock Robotics Inc.',
    licence: 'public-domain',
    licenceUrl: 'https://commons.wikimedia.org/wiki/Template:PD-textlogo',
    retrieved: '2026-08-20',
    width: 3274,
    height: 437,
    // Licence sentence read on the file page: "This logo image consists only of simple geometric shapes or
    // text. It does not meet the threshold of originality needed
    // for copyright protection, and is therefore in the public
    // domain."
  },
  {
    id: 'intuitive-surgical-logo',
    file: '/images/logos/intuitive-surgical.svg',
    alt: 'Intuitive Surgical wordmark on a transparent field',
    caption: 'Intuitive Surgical logo from Wikimedia Commons, used on the market map.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Intuitive_Surgical_logo.svg',
    creator: 'Intuitive Surgical',
    licence: 'public-domain',
    licenceUrl: 'https://commons.wikimedia.org/wiki/Template:PD-textlogo',
    retrieved: '2026-08-20',
    width: 173,
    height: 69,
    // Licence sentence read on the file page: "This logo image consists only of simple geometric shapes or
    // text. It does not meet the threshold of originality needed
    // for copyright protection, and is therefore in the public
    // domain."
  },
  {
    id: 'cmr-surgical-logo',
    file: '/images/logos/cmr-surgical.png',
    alt: 'CMR Surgical circular mark on a transparent field',
    caption: 'CMR Surgical logo from Wikimedia Commons, used on the market map.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:CMR_Surgical_logo.png',
    creator: 'CMR Surgical',
    licence: 'cc-by-sa-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    retrieved: '2026-08-20',
    width: 225,
    height: 225,
    // Licence sentence read on the file page: "This file is licensed under the Creative Commons
    // Attribution-Share Alike 4.0 International license."
  },
  {
    id: 'nuro-logo',
    file: '/images/logos/nuro.svg',
    alt: 'Nuro wordmark on a transparent field',
    caption: 'Nuro logo from Wikimedia Commons, used on the market map.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Nuro_logo.svg',
    creator: 'Nuro, Inc.',
    licence: 'public-domain',
    licenceUrl: 'https://commons.wikimedia.org/wiki/Template:PD-logo',
    retrieved: '2026-08-20',
    width: 751,
    height: 214,
    // Licence sentence read on the file page: "This logo image consists only of simple geometric shapes or
    // text. It does not meet the threshold of originality needed
    // for copyright protection, and is therefore in the public
    // domain."
  },
  {
    id: 'irobot-logo',
    file: '/images/logos/irobot.svg',
    alt: 'iRobot wordmark on a transparent field',
    caption: 'iRobot logo from Wikimedia Commons, used on the market map.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:IRobot_logo.svg',
    creator: 'iRobot',
    licence: 'public-domain',
    licenceUrl: 'https://commons.wikimedia.org/wiki/Template:PD-textlogo',
    retrieved: '2026-08-20',
    width: 1024,
    height: 203,
    // Licence sentence read on the file page: "This logo image consists only of simple geometric shapes or
    // text. It does not meet the threshold of originality needed
    // for copyright protection, and is therefore in the public
    // domain."
  },
  {
    id: 'harmonic-drive-logo',
    file: '/images/logos/harmonic-drive.svg',
    alt: 'Harmonic Drive wordmark used by the reducer maker',
    caption: 'Harmonic Drive logo from Wikimedia Commons, used on the market map.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Harmonic_Drive_AG_logo.svg',
    creator: 'Harmonic Drive AG',
    licence: 'public-domain',
    licenceUrl: 'https://commons.wikimedia.org/wiki/Template:PD-textlogo',
    retrieved: '2026-08-20',
    width: 1024,
    height: 323,
    // Licence sentence read on the file page: "This logo image consists only of simple geometric shapes or
    // text. It does not meet the threshold of originality needed
    // for copyright protection, and is therefore in the public
    // domain."
  },
  {
    id: 'nabtesco-logo',
    file: '/images/logos/nabtesco.svg',
    alt: 'Nabtesco wordmark on a transparent field',
    caption: 'Nabtesco logo from Wikimedia Commons, used on the market map.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Nabtesco_company_logo.svg',
    creator: 'Nabtesco',
    licence: 'public-domain',
    licenceUrl: 'https://commons.wikimedia.org/wiki/Template:PD-textlogo',
    retrieved: '2026-08-20',
    width: 310,
    height: 58,
    // Licence sentence read on the file page: "This logo image consists only of simple geometric shapes or
    // text. It does not meet the threshold of originality needed
    // for copyright protection, and is therefore in the public
    // domain."
  },
  {
    id: 'wonik-logo',
    file: '/images/logos/wonik.png',
    alt: 'Wonik wordmark used by Wonik Robotics',
    caption: 'Wonik logo from Wikimedia Commons, used on the market map.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Wonik_Logo.png',
    creator: 'Wonik USA',
    licence: 'cc-by-sa-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    retrieved: '2026-08-20',
    width: 2330,
    height: 1800,
    // Licence sentence read on the file page: "This file is licensed under the Creative Commons
    // Attribution-Share Alike 4.0 International license."
  },
  {
    id: 'openai-logo',
    file: '/images/logos/openai.svg',
    alt: 'OpenAI wordmark in use since February 2025',
    caption: 'OpenAI wordmark from Wikimedia Commons, used on the market map.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:OpenAI_logo_2025_(wordmark).svg',
    creator: 'OpenAI',
    licence: 'public-domain',
    licenceUrl: 'https://commons.wikimedia.org/wiki/Template:PD-textlogo',
    retrieved: '2026-08-20',
    width: 512,
    height: 138,
    // Licence sentence read on the file page: "This logo image consists only of simple geometric shapes or
    // text. It does not meet the threshold of originality needed
    // for copyright protection, and is therefore in the public
    // domain."
  },
  {
    id: 'meta-logo',
    file: '/images/logos/meta.svg',
    alt: 'Meta wordmark with the infinity mark on a transparent field',
    caption: 'Meta Platforms logo from Wikimedia Commons, used on the market map.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Meta_Platforms_Inc._logo.svg',
    creator: 'Meta Platforms',
    licence: 'public-domain',
    licenceUrl: 'https://commons.wikimedia.org/wiki/Template:PD-textlogo',
    retrieved: '2026-08-20',
    width: 948,
    height: 191,
    // Licence sentence read on the file page: "This logo image consists only of simple geometric shapes or
    // text. It does not meet the threshold of originality needed
    // for copyright protection, and is therefore in the public
    // domain."
  },
  {
    id: 'switchbot-logo',
    file: '/images/logos/switchbot.png',
    alt: 'SwitchBot wordmark on a transparent field',
    caption: 'SwitchBot logo from Wikimedia Commons, used on the market map.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:SwitchBot_Logo.png',
    creator: 'SwitchBot',
    licence: 'public-domain',
    licenceUrl: 'https://commons.wikimedia.org/wiki/Template:PD-textlogo',
    retrieved: '2026-08-20',
    width: 120,
    height: 26,
    // Licence sentence read on the file page: "This logo image consists only of simple geometric shapes or
    // text. It does not meet the threshold of originality needed
    // for copyright protection, and is therefore in the public
    // domain."
  },
  {
    id: 'hanson-robotics-logo',
    file: '/images/logos/hanson-robotics.png',
    alt: 'Hanson Robotics wordmark on a transparent field',
    caption: 'Hanson Robotics logo from Wikimedia Commons, used on the market map.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Hanson_Robotics_logo.png',
    creator: 'Hanson Robotics Ltd.',
    licence: 'public-domain',
    licenceUrl: 'https://commons.wikimedia.org/wiki/Template:PD-textlogo',
    retrieved: '2026-08-20',
    width: 1800,
    height: 431,
    // Licence sentence read on the file page: "This logo image consists only of simple geometric shapes or
    // text. It does not meet the threshold of originality needed
    // for copyright protection, and is therefore in the public
    // domain."
  },
  {
    id: 'starship-logo',
    file: '/images/logos/starship.svg',
    alt: 'Starship Technologies wordmark on a transparent field',
    caption: 'Starship Technologies logo from Wikimedia Commons, used on the market map.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Starship_Technologies_logo.svg',
    creator: 'Starship Technologies',
    licence: 'public-domain',
    licenceUrl: 'https://commons.wikimedia.org/wiki/Template:PD-textlogo',
    retrieved: '2026-08-20',
    width: 112,
    height: 17,
    // Licence sentence read on the file page: "This logo image consists only of simple geometric shapes or
    // text. It does not meet the threshold of originality needed
    // for copyright protection, and is therefore in the public
    // domain."
  },
  {
    id: 'pollen-robotics-logo',
    file: '/images/logos/pollen-robotics.svg',
    alt: 'Pollen Robotics wordmark on a transparent field',
    caption: 'Pollen Robotics logo from Wikimedia Commons, used on the market map.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Pollen_Robotics_Logo.svg',
    creator: 'Pollen Robotics',
    licence: 'public-domain',
    licenceUrl: 'https://commons.wikimedia.org/wiki/Template:PD-textlogo',
    retrieved: '2026-08-20',
    width: 512,
    height: 91,
    // Licence sentence read on the file page: "This logo image consists only of simple geometric shapes or
    // text. It does not meet the threshold of originality needed
    // for copyright protection, and is therefore in the public
    // domain."
  },
  {
    id: 'anduril-logo',
    file: '/images/logos/anduril.svg',
    alt: 'Anduril Industries wordmark on a transparent field',
    caption: 'Anduril Industries logo from Wikimedia Commons, used on the market map.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Anduril_Industries_Logo.svg',
    creator: 'Anduril Industries, Inc.',
    licence: 'public-domain',
    licenceUrl: 'https://commons.wikimedia.org/wiki/Template:PD-textlogo',
    retrieved: '2026-08-20',
    width: 546,
    height: 100,
    // Licence sentence read on the file page: "This logo image consists only of simple geometric shapes or
    // text. It does not meet the threshold of originality needed
    // for copyright protection, and is therefore in the public
    // domain."
  },
  {
    id: 'abb-logo',
    file: '/images/logos/abb.svg',
    alt: 'ABB wordmark on a transparent field',
    caption: 'ABB logo from Wikimedia Commons, used on the market map.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:ABB_logo.svg',
    creator: 'ABB',
    licence: 'public-domain',
    licenceUrl: 'https://commons.wikimedia.org/wiki/Template:PD-textlogo',
    retrieved: '2026-08-20',
    width: 512,
    height: 203,
    // Licence sentence read on the file page: "This logo image consists only of simple geometric shapes or
    // text. It does not meet the threshold of originality needed
    // for copyright protection, and is therefore in the public
    // domain."
  },
  {
    id: 'mitsubishi-logo',
    file: '/images/logos/mitsubishi.svg',
    alt: 'Mitsubishi three diamond mark on a transparent field',
    caption: 'Mitsubishi mark from Wikimedia Commons, used on the market map.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Mitsubishi_logo.svg',
    creator: 'Mitsubishi',
    licence: 'public-domain',
    licenceUrl: 'https://commons.wikimedia.org/wiki/Template:PD-textlogo',
    retrieved: '2026-08-20',
    width: 850,
    height: 733,
    // Licence sentence read on the file page: "This logo image consists only of simple geometric shapes or
    // text. It does not meet the threshold of originality needed
    // for copyright protection, and is therefore in the public
    // domain."
  },
  {
    id: 'monarch-tractor-logo',
    file: '/images/logos/monarch-tractor.png',
    alt: 'Monarch Tractor wordmark on a transparent field',
    caption: 'Monarch Tractor logo from Wikimedia Commons, used on the market map.',
    sourceName: 'Wikimedia Commons',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Monarch_Tractor_logo.png',
    creator: 'Monarch Tractor',
    licence: 'cc-by-sa-4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    retrieved: '2026-08-20',
    width: 450,
    height: 336,
    // Licence sentence read on the file page: "This file is licensed under the Creative Commons
    // Attribution-Share Alike 4.0 International license."
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
