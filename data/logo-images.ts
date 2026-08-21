/**
 * Market-map company logos: the licensed marks plotted on /market-map.
 *
 * Full provenance (creator, licence, source URL, verbatim Commons sentence)
 * lives here so /credits and validate:content stay honest. The market-map
 * client never imports this module. CompanyLogo reads the slim lookup in
 * data/logos.ts, which carries only {file, width, height}.
 *
 * A Commons file is registered only when the creator and a permitted
 * licence can be named and the file is a real mark (company-authored or
 * PD-textlogo / PD-logo official wordmark). User recreations are skipped
 * even when a named CC licence exists; they go on
 * research/market-map-logo-misses.md. Do not invent licences.
 *
 * Type-only relative import so this file loads under plain node, Vitest,
 * and Next.js alike.
 */
import type { SiteImage } from './schemas/image.ts';

export const LOGO_IMAGES: SiteImage[] = [
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
