/**
 * Market-map company logos: the licensed marks plotted on /market-map.
 *
 * Full provenance (creator, licence, source URL, verbatim Commons sentence)
 * lives here so /credits and validate:content stay honest. The market-map
 * client never imports this module. CompanyLogo reads the slim lookup in
 * data/logos.ts, which carries only {file, width, height}.
 *
 * Licensed Commons files keep their named licence. Official first-party
 * marks with no reuse grant are registered as `unlicensed` (or `unknown`
 * when the licence cannot be named). Do not invent a Commons licence to
 * skip a mark: the market map plots every company's real logo.
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
  {
    id: 'skild-ai-logo',
    file: '/images/logos/skild-ai.svg',
    alt: 'Skild AI company mark from the official website',
    caption: 'Skild AI logo from the official website, used on the market map.',
    sourceName: 'Skild AI official website',
    sourceUrl: 'https://www.skild.ai/',
    creator: 'Skild AI',
    licence: 'unlicensed',
    licenceUrl: 'https://www.skild.ai/',
    retrieved: '2026-08-21',
    width: 173,
    height: 40,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'generalist-ai-logo',
    file: '/images/logos/generalist-ai.svg',
    alt: 'Generalist AI company mark from the official website',
    caption: 'Generalist AI logo from the official website, used on the market map.',
    sourceName: 'Generalist AI official website',
    sourceUrl: 'https://generalistai.com/',
    creator: 'Generalist AI',
    licence: 'unlicensed',
    licenceUrl: 'https://generalistai.com/',
    retrieved: '2026-08-21',
    width: 262,
    height: 262,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'dyna-robotics-logo',
    file: '/images/logos/dyna-robotics.svg',
    alt: 'Dyna Robotics company mark from the official website',
    caption: 'Dyna Robotics logo from the official website, used on the market map.',
    sourceName: 'Dyna Robotics official website',
    sourceUrl: 'https://www.dyna.co/',
    creator: 'Dyna Robotics',
    licence: 'unlicensed',
    licenceUrl: 'https://www.dyna.co/',
    retrieved: '2026-08-21',
    width: 339,
    height: 72,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'sunday-robotics-logo',
    file: '/images/logos/sunday-robotics.svg',
    alt: 'Sunday Robotics company mark from the official website',
    caption: 'Sunday Robotics logo from the official website, used on the market map.',
    sourceName: 'Sunday Robotics official website',
    sourceUrl: 'https://www.sunday.ai/',
    creator: 'Sunday Robotics',
    licence: 'unlicensed',
    licenceUrl: 'https://www.sunday.ai/',
    retrieved: '2026-08-21',
    width: 260,
    height: 260,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'field-ai-logo',
    file: '/images/logos/field-ai.svg',
    alt: 'Field AI company mark from the official website',
    caption: 'Field AI logo from the official website, used on the market map.',
    sourceName: 'Field AI official website',
    sourceUrl: 'https://www.fieldai.com/',
    creator: 'Field AI',
    licence: 'unlicensed',
    licenceUrl: 'https://www.fieldai.com/',
    retrieved: '2026-08-21',
    width: 284,
    height: 70,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'genesis-ai-logo',
    file: '/images/logos/genesis-ai.svg',
    alt: 'Genesis AI company mark from the official website',
    caption: 'Genesis AI logo from the official website, used on the market map.',
    sourceName: 'Genesis AI official website',
    sourceUrl: 'https://www.genesis.ai/',
    creator: 'Genesis AI',
    licence: 'unlicensed',
    licenceUrl: 'https://www.genesis.ai/',
    retrieved: '2026-08-21',
    width: 16,
    height: 16,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'rhoda-ai-logo',
    file: '/images/logos/rhoda-ai.svg',
    alt: 'Rhoda AI company mark from the official website',
    caption: 'Rhoda AI logo from the official website, used on the market map.',
    sourceName: 'Rhoda AI official website',
    sourceUrl: 'https://www.rhoda.ai/',
    creator: 'Rhoda AI',
    licence: 'unlicensed',
    licenceUrl: 'https://www.rhoda.ai/',
    retrieved: '2026-08-21',
    width: 815,
    height: 186,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'mind-robotics-logo',
    file: '/images/logos/mind-robotics.png',
    alt: 'Mind Robotics company mark from the official website',
    caption: 'Mind Robotics logo from the official website, used on the market map.',
    sourceName: 'Mind Robotics official website',
    sourceUrl: 'https://www.mindrobotics.com/',
    creator: 'Mind Robotics',
    licence: 'unlicensed',
    licenceUrl: 'https://www.mindrobotics.com/',
    retrieved: '2026-08-21',
    width: 180,
    height: 180,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'google-deepmind-robotics-logo',
    file: '/images/logos/google-deepmind-robotics.svg',
    alt: 'Google DeepMind wordmark in blue on a transparent field',
    caption: 'Google DeepMind logo from Wikimedia Commons, used on the market map.',
    sourceName: 'Wikimedia Commons',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:DeepMind_new_logo.svg',
    creator: 'DeepMind',
    licence: 'public-domain',
    licenceUrl: 'https://commons.wikimedia.org/wiki/Template:PD-textlogo',
    retrieved: '2026-08-21',
    width: 512,
    height: 119,
    // Licence sentence read on the file page: "This logo image consists only of simple geometric shapes or
    // text. It does not meet the threshold of originality needed
    // for copyright protection, and is therefore in the public
    // domain."
  },
  {
    id: 'applied-intuition-logo',
    file: '/images/logos/applied-intuition.svg',
    alt: 'Applied Intuition company mark from the official website',
    caption: 'Applied Intuition logo from the official website, used on the market map.',
    sourceName: 'Applied Intuition official website',
    sourceUrl: 'https://www.appliedintuition.com/',
    creator: 'Applied Intuition',
    licence: 'unlicensed',
    licenceUrl: 'https://www.appliedintuition.com/',
    retrieved: '2026-08-21',
    width: 220,
    height: 220,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'xdof-logo',
    file: '/images/logos/xdof.svg',
    alt: 'XDOF company mark from the official website',
    caption: 'XDOF logo from the official website, used on the market map.',
    sourceName: 'XDOF official website',
    sourceUrl: 'https://www.xdof.ai/',
    creator: 'XDOF',
    licence: 'unlicensed',
    licenceUrl: 'https://www.xdof.ai/',
    retrieved: '2026-08-21',
    width: 360,
    height: 72,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'encord-logo',
    file: '/images/logos/encord.svg',
    alt: 'Encord company mark from the official website',
    caption: 'Encord logo from the official website, used on the market map.',
    sourceName: 'Encord official website',
    sourceUrl: 'https://encord.com/',
    creator: 'Encord',
    licence: 'unlicensed',
    licenceUrl: 'https://encord.com/',
    retrieved: '2026-08-21',
    width: 44,
    height: 50,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'micro1-logo',
    file: '/images/logos/micro1.png',
    alt: 'Micro1 company mark from the official website',
    caption: 'Micro1 logo from the official website, used on the market map.',
    sourceName: 'Micro1 official website',
    sourceUrl: 'https://www.micro1.ai/',
    creator: 'Micro1',
    licence: 'unlicensed',
    licenceUrl: 'https://www.micro1.ai/',
    retrieved: '2026-08-21',
    width: 32,
    height: 32,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: '1x-technologies-logo',
    file: '/images/logos/1x-technologies.svg',
    alt: '1X Technologies company mark from the official website',
    caption: '1X Technologies logo from the official website, used on the market map.',
    sourceName: '1X Technologies official website',
    sourceUrl: 'https://www.1x.tech/',
    creator: '1X Technologies',
    licence: 'unlicensed',
    licenceUrl: 'https://www.1x.tech/',
    retrieved: '2026-08-21',
    width: 26,
    height: 16,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'apptronik-logo',
    file: '/images/logos/apptronik.svg',
    alt: 'Apptronik company mark from the official website',
    caption: 'Apptronik logo from the official website, used on the market map.',
    sourceName: 'Apptronik official website',
    sourceUrl: 'https://apptronik.com/',
    creator: 'Apptronik',
    licence: 'unlicensed',
    licenceUrl: 'https://apptronik.com/',
    retrieved: '2026-08-21',
    width: 342,
    height: 28,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'boston-dynamics-logo',
    file: '/images/logos/boston-dynamics.svg',
    alt: 'Boston Dynamics company mark from the official website',
    caption: 'Boston Dynamics logo from the official website, used on the market map.',
    sourceName: 'Boston Dynamics official website',
    sourceUrl: 'https://bostondynamics.com/',
    creator: 'Boston Dynamics',
    licence: 'unlicensed',
    licenceUrl: 'https://bostondynamics.com/',
    retrieved: '2026-08-21',
    width: 216,
    height: 216,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'fourier-intelligence-logo',
    file: '/images/logos/fourier-intelligence.svg',
    alt: 'Fourier company mark from the official website',
    caption: 'Fourier logo from the official website, used on the market map.',
    sourceName: 'Fourier official website',
    sourceUrl: 'https://www.fftai.com/',
    creator: 'Fourier',
    licence: 'unlicensed',
    licenceUrl: 'https://www.fftai.com/',
    retrieved: '2026-08-21',
    width: 400,
    height: 400,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'galbot-logo',
    file: '/images/logos/galbot.gif',
    alt: 'Galbot company mark from the official website',
    caption: 'Galbot logo from the official website, used on the market map.',
    sourceName: 'Galbot official website',
    sourceUrl: 'https://www.galbot.com/en',
    creator: 'Galbot',
    licence: 'unlicensed',
    licenceUrl: 'https://www.galbot.com/en',
    retrieved: '2026-08-21',
    width: 128,
    height: 128,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'agibot-logo',
    file: '/images/logos/agibot.png',
    alt: 'AgiBot company mark from the official website',
    caption: 'AgiBot logo from the official website, used on the market map.',
    sourceName: 'AgiBot official website',
    sourceUrl: 'https://www.agibot.com/',
    creator: 'AgiBot',
    licence: 'unlicensed',
    licenceUrl: 'https://www.agibot.com/',
    retrieved: '2026-08-21',
    width: 1038,
    height: 491,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'sanctuary-ai-logo',
    file: '/images/logos/sanctuary-ai.png',
    alt: 'Sanctuary AI company mark from the official website',
    caption: 'Sanctuary AI logo from the official website, used on the market map.',
    sourceName: 'Sanctuary AI official website',
    sourceUrl: 'https://sanctuary.ai/',
    creator: 'Sanctuary AI',
    licence: 'unlicensed',
    licenceUrl: 'https://sanctuary.ai/',
    retrieved: '2026-08-21',
    width: 270,
    height: 270,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'humanoid-uk-logo',
    file: '/images/logos/humanoid-uk.png',
    alt: 'Humanoid company mark from the official website',
    caption: 'Humanoid logo from the official website, used on the market map.',
    sourceName: 'Humanoid official website',
    sourceUrl: 'https://thehumanoid.ai/',
    creator: 'Humanoid',
    licence: 'unlicensed',
    licenceUrl: 'https://thehumanoid.ai/',
    retrieved: '2026-08-21',
    width: 270,
    height: 270,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'spirit-ai-logo',
    file: '/images/logos/spirit-ai.svg',
    alt: 'Spirit AI company mark from the official website',
    caption: 'Spirit AI logo from the official website, used on the market map.',
    sourceName: 'Spirit AI official website',
    sourceUrl: 'https://www.spirit-ai.com/',
    creator: 'Spirit AI',
    licence: 'unlicensed',
    licenceUrl: 'https://www.spirit-ai.com/',
    retrieved: '2026-08-21',
    width: 103,
    height: 42,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'galaxea-ai-logo',
    file: '/images/logos/galaxea-ai.png',
    alt: 'Official Galaxea Xinghaitu wordmark in orange on a black field',
    caption: 'Galaxea logo from the official website header, used on the market map.',
    sourceName: 'Galaxea official website',
    sourceUrl: 'https://www.galaxea-ai.com/',
    creator: 'Galaxea',
    licence: 'unlicensed',
    licenceUrl: 'https://www.galaxea-ai.com/',
    retrieved: '2026-08-21',
    width: 1238,
    height: 376,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'engineai-logo',
    file: '/images/logos/engineai.png',
    alt: 'EngineAI company mark from the official website',
    caption: 'EngineAI logo from the official website, used on the market map.',
    sourceName: 'EngineAI official website',
    sourceUrl: 'https://www.engineai.com.cn/',
    creator: 'EngineAI',
    licence: 'unlicensed',
    licenceUrl: 'https://www.engineai.com.cn/',
    retrieved: '2026-08-21',
    width: 945,
    height: 473,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'robot-era-logo',
    file: '/images/logos/robot-era.png',
    alt: 'RobotEra company mark from the official website',
    caption: 'RobotEra logo from the official website, used on the market map.',
    sourceName: 'RobotEra GitHub organisation',
    sourceUrl: 'https://github.com/roboterax',
    creator: 'RobotEra',
    licence: 'unlicensed',
    licenceUrl: 'https://github.com/roboterax',
    retrieved: '2026-08-21',
    width: 108,
    height: 108,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'tars-robotics-logo',
    file: '/images/logos/tars-robotics.svg',
    alt: 'TARS Robotics company mark from the official website',
    caption: 'TARS Robotics logo from the official website, used on the market map.',
    sourceName: 'TARS Robotics official website',
    sourceUrl: 'https://wiyh.tars-ai.com/',
    creator: 'TARS Robotics',
    licence: 'unlicensed',
    licenceUrl: 'https://wiyh.tars-ai.com/',
    retrieved: '2026-08-21',
    width: 145,
    height: 126,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'x-square-robot-logo',
    file: '/images/logos/x-square-robot.svg',
    alt: 'X Square Robot company mark from the official website',
    caption: 'X Square Robot logo from the official website, used on the market map.',
    sourceName: 'X Square Robot official website',
    sourceUrl: 'https://x2robot.com/',
    creator: 'X Square Robot',
    licence: 'unlicensed',
    licenceUrl: 'https://x2robot.com/',
    retrieved: '2026-08-21',
    width: 95,
    height: 66,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'deep-robotics-logo',
    file: '/images/logos/deep-robotics.png',
    alt: 'Deep Robotics company mark from the official website',
    caption: 'Deep Robotics logo from the official website, used on the market map.',
    sourceName: 'Deep Robotics official website',
    sourceUrl: 'https://www.deeprobotics.cn/',
    creator: 'Deep Robotics',
    licence: 'unlicensed',
    licenceUrl: 'https://www.deeprobotics.cn/',
    retrieved: '2026-08-21',
    width: 519,
    height: 160,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'kepler-robot-logo',
    file: '/images/logos/kepler-robot.png',
    alt: 'Kepler Robot company mark from the official website',
    caption: 'Kepler Robot logo from the official website, used on the market map.',
    sourceName: 'Kepler official website',
    sourceUrl: 'https://gotokepler.com/',
    creator: 'Kepler',
    licence: 'unlicensed',
    licenceUrl: 'https://gotokepler.com/',
    retrieved: '2026-08-21',
    width: 3065,
    height: 3066,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'limx-dynamics-logo',
    file: '/images/logos/limx-dynamics.png',
    alt: 'LimX Dynamics company mark from the official website',
    caption: 'LimX Dynamics logo from the official website, used on the market map.',
    sourceName: 'LimX Dynamics official website',
    sourceUrl: 'https://www.limxdynamics.com/en',
    creator: 'LimX Dynamics',
    licence: 'unlicensed',
    licenceUrl: 'https://www.limxdynamics.com/en',
    retrieved: '2026-08-21',
    width: 1200,
    height: 630,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'clone-robotics-logo',
    file: '/images/logos/clone-robotics.png',
    alt: 'Clone Robotics company mark from the official website',
    caption: 'Clone Robotics logo from the official website, used on the market map.',
    sourceName: 'Clone Robotics official website',
    sourceUrl: 'https://www.clonerobotics.com/',
    creator: 'Clone Robotics',
    licence: 'unlicensed',
    licenceUrl: 'https://www.clonerobotics.com/',
    retrieved: '2026-08-21',
    width: 750,
    height: 138,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'mentee-robotics-logo',
    file: '/images/logos/mentee-robotics.svg',
    alt: 'Mentee Robotics company mark from the official website',
    caption: 'Mentee Robotics logo from the official website, used on the market map.',
    sourceName: 'Mentee Robotics official website',
    sourceUrl: 'https://www.menteebot.com/',
    creator: 'Mentee Robotics',
    licence: 'unlicensed',
    licenceUrl: 'https://www.menteebot.com/',
    retrieved: '2026-08-21',
    width: 226,
    height: 19,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'persona-ai-logo',
    file: '/images/logos/persona-ai.webp',
    alt: 'Persona AI company mark from the official website',
    caption: 'Persona AI logo from the official website, used on the market map.',
    sourceName: 'Persona AI official website',
    sourceUrl: 'https://persona.ai/',
    creator: 'Persona AI',
    licence: 'unlicensed',
    licenceUrl: 'https://persona.ai/',
    retrieved: '2026-08-21',
    width: 300,
    height: 68,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'symbotic-logo',
    file: '/images/logos/symbotic.svg',
    alt: 'Symbotic company mark from the official website',
    caption: 'Symbotic logo from the official website, used on the market map.',
    sourceName: 'Symbotic official website',
    sourceUrl: 'https://www.symbotic.com/',
    creator: 'Symbotic',
    licence: 'unlicensed',
    licenceUrl: 'https://www.symbotic.com/',
    retrieved: '2026-08-21',
    width: 205,
    height: 44,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'dexterity-logo',
    file: '/images/logos/dexterity.svg',
    alt: 'Dexterity company mark from the official website',
    caption: 'Dexterity logo from the official website, used on the market map.',
    sourceName: 'Dexterity official website',
    sourceUrl: 'https://dexterity.ai/',
    creator: 'Dexterity',
    licence: 'unlicensed',
    licenceUrl: 'https://dexterity.ai/',
    retrieved: '2026-08-21',
    width: 1166,
    height: 101,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'nimble-robotics-logo',
    file: '/images/logos/nimble-robotics.svg',
    alt: 'Nimble company mark from the official website',
    caption: 'Nimble logo from the official website, used on the market map.',
    sourceName: 'Nimble official website',
    sourceUrl: 'https://nimble.ai/',
    creator: 'Nimble',
    licence: 'unlicensed',
    licenceUrl: 'https://nimble.ai/',
    retrieved: '2026-08-21',
    width: 583,
    height: 125,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'locus-robotics-logo',
    file: '/images/logos/locus-robotics.svg',
    alt: 'Locus Robotics company mark from the official website',
    caption: 'Locus Robotics logo from the official website, used on the market map.',
    sourceName: 'Locus Robotics official website',
    sourceUrl: 'https://www.locusrobotics.com/',
    creator: 'Locus Robotics',
    licence: 'unlicensed',
    licenceUrl: 'https://www.locusrobotics.com/',
    retrieved: '2026-08-21',
    width: 204,
    height: 48,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'mujin-logo',
    file: '/images/logos/mujin.svg',
    alt: 'Mujin company mark from the official website',
    caption: 'Mujin logo from the official website, used on the market map.',
    sourceName: 'Mujin official website',
    sourceUrl: 'https://www.mujin.co.jp/',
    creator: 'Mujin',
    licence: 'unlicensed',
    licenceUrl: 'https://www.mujin.co.jp/',
    retrieved: '2026-08-21',
    width: 73,
    height: 34,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'righthand-robotics-logo',
    file: '/images/logos/righthand-robotics.svg',
    alt: 'RightHand Robotics company mark from the official website',
    caption: 'RightHand Robotics logo from the official website, used on the market map.',
    sourceName: 'RightHand Robotics official website',
    sourceUrl: 'https://righthandrobotics.com/',
    creator: 'RightHand Robotics',
    licence: 'unlicensed',
    licenceUrl: 'https://righthandrobotics.com/',
    retrieved: '2026-08-21',
    width: 312,
    height: 69,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'ambirobotics-logo',
    file: '/images/logos/ambirobotics.svg',
    alt: 'Ambi Robotics company mark from the official website',
    caption: 'Ambi Robotics logo from the official website, used on the market map.',
    sourceName: 'Ambi Robotics official website',
    sourceUrl: 'https://www.ambirobotics.com/',
    creator: 'Ambi Robotics',
    licence: 'unlicensed',
    licenceUrl: 'https://www.ambirobotics.com/',
    retrieved: '2026-08-21',
    width: 106,
    height: 39,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'plus-one-robotics-logo',
    file: '/images/logos/plus-one-robotics.png',
    alt: 'Plus One Robotics company mark from the official website',
    caption: 'Plus One Robotics logo from the official website, used on the market map.',
    sourceName: 'Plus One Robotics official website',
    sourceUrl: 'https://www.plusonerobotics.com/',
    creator: 'Plus One Robotics',
    licence: 'unlicensed',
    licenceUrl: 'https://www.plusonerobotics.com/',
    retrieved: '2026-08-21',
    width: 752,
    height: 216,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'carbon-robotics-logo',
    file: '/images/logos/carbon-robotics.png',
    alt: 'Carbon Robotics company mark from the official website',
    caption: 'Carbon Robotics logo from the official website, used on the market map.',
    sourceName: 'Carbon Robotics official website',
    sourceUrl: 'https://carbonrobotics.com/',
    creator: 'Carbon Robotics',
    licence: 'unlicensed',
    licenceUrl: 'https://carbonrobotics.com/',
    retrieved: '2026-08-21',
    width: 400,
    height: 114,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'farm-ng-logo',
    file: '/images/logos/farm-ng.svg',
    alt: 'Farm-ng company mark from the official website',
    caption: 'Farm-ng logo from the official website, used on the market map.',
    sourceName: 'Bonsai Robotics official website',
    sourceUrl: 'https://bonsairobotics.ai/',
    creator: 'Bonsai Robotics',
    licence: 'unlicensed',
    licenceUrl: 'https://bonsairobotics.ai/',
    retrieved: '2026-08-21',
    width: 168,
    height: 39,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'chef-robotics-logo',
    file: '/images/logos/chef-robotics.svg',
    alt: 'Chef Robotics company mark from the official website',
    caption: 'Chef Robotics logo from the official website, used on the market map.',
    sourceName: 'Chef Robotics official website',
    sourceUrl: 'https://www.chefrobotics.ai/',
    creator: 'Chef Robotics',
    licence: 'unlicensed',
    licenceUrl: 'https://www.chefrobotics.ai/',
    retrieved: '2026-08-21',
    width: 72,
    height: 33,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'simbe-robotics-logo',
    file: '/images/logos/simbe-robotics.svg',
    alt: 'Simbe Robotics company mark from the official website',
    caption: 'Simbe Robotics logo from the official website, used on the market map.',
    sourceName: 'Simbe Robotics official website',
    sourceUrl: 'https://www.simberobotics.com/',
    creator: 'Simbe Robotics',
    licence: 'unlicensed',
    licenceUrl: 'https://www.simberobotics.com/',
    retrieved: '2026-08-21',
    width: 139,
    height: 34,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'moon-surgical-logo',
    file: '/images/logos/moon-surgical.svg',
    alt: 'Moon Surgical company mark from the official website',
    caption: 'Moon Surgical logo from the official website, used on the market map.',
    sourceName: 'Moon Surgical official website',
    sourceUrl: 'https://www.moonsurgical.com/',
    creator: 'Moon Surgical',
    licence: 'unlicensed',
    licenceUrl: 'https://www.moonsurgical.com/',
    retrieved: '2026-08-21',
    width: 150,
    height: 135,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'serve-robotics-logo',
    file: '/images/logos/serve-robotics.svg',
    alt: 'Serve Robotics company mark from the official website',
    caption: 'Serve Robotics logo from the official website, used on the market map.',
    sourceName: 'Serve Robotics official website',
    sourceUrl: 'https://www.serverobotics.com/',
    creator: 'Serve Robotics',
    licence: 'unlicensed',
    licenceUrl: 'https://www.serverobotics.com/',
    retrieved: '2026-08-21',
    width: 540,
    height: 540,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'gecko-robotics-logo',
    file: '/images/logos/gecko-robotics.svg',
    alt: 'Gecko Robotics company mark from the official website',
    caption: 'Gecko Robotics logo from the official website, used on the market map.',
    sourceName: 'Gecko Robotics official website',
    sourceUrl: 'https://www.geckorobotics.com/',
    creator: 'Gecko Robotics',
    licence: 'unlicensed',
    licenceUrl: 'https://www.geckorobotics.com/',
    retrieved: '2026-08-21',
    width: 80,
    height: 27,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'standard-bots-logo',
    file: '/images/logos/standard-bots.svg',
    alt: 'Standard Bots company mark from the official website',
    caption: 'Standard Bots logo from the official website, used on the market map.',
    sourceName: 'Standard Bots official website',
    sourceUrl: 'https://standardbots.com/',
    creator: 'Standard Bots',
    licence: 'unlicensed',
    licenceUrl: 'https://standardbots.com/',
    retrieved: '2026-08-21',
    width: 165,
    height: 18,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'collaborative-robotics-logo',
    file: '/images/logos/collaborative-robotics.png',
    alt: 'Collaborative Robotics company mark from the official website',
    caption: 'Collaborative Robotics logo from the official website, used on the market map.',
    sourceName: 'Collaborative Robotics official website',
    sourceUrl: 'https://www.co.bot/',
    creator: 'Collaborative Robotics',
    licence: 'unlicensed',
    licenceUrl: 'https://www.co.bot/',
    retrieved: '2026-08-21',
    width: 180,
    height: 180,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'the-bot-company-logo',
    file: '/images/logos/the-bot-company.png',
    alt: 'The Bot Company company mark from the official website',
    caption: 'The Bot Company logo from the official website, used on the market map.',
    sourceName: 'The Bot Company official website',
    sourceUrl: 'https://www.bot.co/',
    creator: 'The Bot Company',
    licence: 'unlicensed',
    licenceUrl: 'https://www.bot.co/',
    retrieved: '2026-08-21',
    width: 880,
    height: 260,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'weave-robotics-logo',
    file: '/images/logos/weave-robotics.png',
    alt: 'Weave Robotics company mark from the official website',
    caption: 'Weave Robotics logo from the official website, used on the market map.',
    sourceName: 'Weave Robotics official website',
    sourceUrl: 'https://www.weaverobotics.com/',
    creator: 'Weave Robotics',
    licence: 'unlicensed',
    licenceUrl: 'https://www.weaverobotics.com/',
    retrieved: '2026-08-21',
    width: 180,
    height: 180,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'k-scale-labs-logo',
    file: '/images/logos/k-scale-labs.png',
    alt: 'K-Scale Labs company mark from the official website',
    caption: 'K-Scale Labs logo from the official website, used on the market map.',
    sourceName: 'Y Combinator company page',
    sourceUrl: 'https://www.ycombinator.com/companies/k-scale-labs',
    creator: 'K-Scale Labs',
    licence: 'unlicensed',
    licenceUrl: 'https://www.ycombinator.com/companies/k-scale-labs',
    retrieved: '2026-08-21',
    width: 150,
    height: 150,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'automata-logo',
    file: '/images/logos/automata.svg',
    alt: 'Automata company mark from the official website',
    caption: 'Automata logo from the official website, used on the market map.',
    sourceName: 'Automata official website',
    sourceUrl: 'https://www.automata.tech/',
    creator: 'Automata',
    licence: 'unlicensed',
    licenceUrl: 'https://www.automata.tech/',
    retrieved: '2026-08-21',
    width: 2000,
    height: 289,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'lila-sciences-logo',
    file: '/images/logos/lila-sciences.svg',
    alt: 'Lila Sciences company mark from the official website',
    caption: 'Lila Sciences logo from the official website, used on the market map.',
    sourceName: 'Lila Sciences official website',
    sourceUrl: 'https://www.lila.ai/',
    creator: 'Lila Sciences',
    licence: 'unlicensed',
    licenceUrl: 'https://www.lila.ai/',
    retrieved: '2026-08-21',
    width: 290,
    height: 25,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'avidbots-logo',
    file: '/images/logos/avidbots.svg',
    alt: 'Avidbots company mark from the official website',
    caption: 'Avidbots logo from the official website, used on the market map.',
    sourceName: 'Avidbots official website',
    sourceUrl: 'https://avidbots.com/',
    creator: 'Avidbots',
    licence: 'unlicensed',
    licenceUrl: 'https://avidbots.com/',
    retrieved: '2026-08-21',
    width: 260,
    height: 260,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'leaderdrive-logo',
    file: '/images/logos/leaderdrive.png',
    alt: 'Leaderdrive company mark from the official website',
    caption: 'Leaderdrive logo from the official website, used on the market map.',
    sourceName: 'Leaderdrive official website',
    sourceUrl: 'https://www.leaderdrive.com/',
    creator: 'Leaderdrive',
    licence: 'unlicensed',
    licenceUrl: 'https://www.leaderdrive.com/',
    retrieved: '2026-08-21',
    width: 797,
    height: 240,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'sanhua-logo',
    file: '/images/logos/sanhua.png',
    alt: 'Sanhua company mark from the official website',
    caption: 'Sanhua logo from the official website, used on the market map.',
    sourceName: 'Sanhua official website',
    sourceUrl: 'https://www.sanhuagroup.com/',
    creator: 'Sanhua',
    licence: 'unlicensed',
    licenceUrl: 'https://www.sanhuagroup.com/',
    retrieved: '2026-08-21',
    width: 96,
    height: 96,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'shadow-robot-logo',
    file: '/images/logos/shadow-robot.svg',
    alt: 'Shadow Robot company mark from the official website',
    caption: 'Shadow Robot logo from the official website, used on the market map.',
    sourceName: 'Shadow Robot official website',
    sourceUrl: 'https://shadowrobot.com/',
    creator: 'Shadow Robot',
    licence: 'unlicensed',
    licenceUrl: 'https://shadowrobot.com/',
    retrieved: '2026-08-21',
    width: 102,
    height: 79,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'sharpa-logo',
    file: '/images/logos/sharpa.svg',
    alt: 'Sharpa company mark from the official website',
    caption: 'Sharpa logo from the official website, used on the market map.',
    sourceName: 'Sharpa official website',
    sourceUrl: 'https://www.sharpa.com/',
    creator: 'Sharpa',
    licence: 'unlicensed',
    licenceUrl: 'https://www.sharpa.com/',
    retrieved: '2026-08-21',
    width: 1292,
    height: 256,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'xela-robotics-logo',
    file: '/images/logos/xela-robotics.png',
    alt: 'XELA Robotics company mark from the official website',
    caption: 'XELA Robotics logo from the official website, used on the market map.',
    sourceName: 'XELA Robotics official website',
    sourceUrl: 'https://xelarobotics.com/',
    creator: 'XELA Robotics',
    licence: 'unlicensed',
    licenceUrl: 'https://xelarobotics.com/',
    retrieved: '2026-08-21',
    width: 280,
    height: 66,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'assured-robot-intelligence-logo',
    file: '/images/logos/assured-robot-intelligence.png',
    alt: 'Assured Robot Intelligence company mark from the official website',
    caption: 'Assured Robot Intelligence logo from the official website, used on the market map.',
    sourceName: 'Assured Robot Intelligence official website',
    sourceUrl: 'https://ari.bot/',
    creator: 'Assured Robot Intelligence',
    licence: 'unlicensed',
    licenceUrl: 'https://ari.bot/',
    retrieved: '2026-08-21',
    width: 512,
    height: 512,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'saronic-logo',
    file: '/images/logos/saronic.png',
    alt: 'Saronic company mark from the official website',
    caption: 'Saronic logo from the official website, used on the market map.',
    sourceName: 'Saronic official website',
    sourceUrl: 'https://www.saronic.com/',
    creator: 'Saronic',
    licence: 'unlicensed',
    licenceUrl: 'https://www.saronic.com/',
    retrieved: '2026-08-21',
    width: 64,
    height: 64,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'eka-robotics-logo',
    file: '/images/logos/eka-robotics.svg',
    alt: 'Eka Robotics company mark from the official website',
    caption: 'Eka Robotics logo from the official website, used on the market map.',
    sourceName: 'Eka Robotics official website',
    sourceUrl: 'https://ekarobotics.com/',
    creator: 'Eka Robotics',
    licence: 'unlicensed',
    licenceUrl: 'https://ekarobotics.com/',
    retrieved: '2026-08-21',
    width: 714,
    height: 713,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'foundry-robotics-logo',
    file: '/images/logos/foundry-robotics.svg',
    alt: 'Foundry Robotics company mark from the official website',
    caption: 'Foundry Robotics logo from the official website, used on the market map.',
    sourceName: 'Foundry Robotics official website',
    sourceUrl: 'https://foundryrobotics.ai/',
    creator: 'Foundry Robotics',
    licence: 'unlicensed',
    licenceUrl: 'https://foundryrobotics.ai/',
    retrieved: '2026-08-21',
    width: 50,
    height: 50,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'mytra-logo',
    file: '/images/logos/mytra.png',
    alt: 'Mytra company mark from the official website',
    caption: 'Mytra logo from the official website, used on the market map.',
    sourceName: 'Mytra official website',
    sourceUrl: 'https://mytra.ai/',
    creator: 'Mytra',
    licence: 'unlicensed',
    licenceUrl: 'https://mytra.ai/',
    retrieved: '2026-08-21',
    width: 291,
    height: 291,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'formic-logo',
    file: '/images/logos/formic.svg',
    alt: 'Formic company mark from the official website',
    caption: 'Formic logo from the official website, used on the market map.',
    sourceName: 'Formic official website',
    sourceUrl: 'https://formic.co/',
    creator: 'Formic',
    licence: 'unlicensed',
    licenceUrl: 'https://formic.co/',
    retrieved: '2026-08-21',
    width: 132,
    height: 132,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'astribot-logo',
    file: '/images/logos/astribot.png',
    alt: 'Astribot company mark from the official website',
    caption: 'Astribot logo from the official website, used on the market map.',
    sourceName: 'Astribot official website',
    sourceUrl: 'https://www.astribot.com/',
    creator: 'Astribot',
    licence: 'unlicensed',
    licenceUrl: 'https://www.astribot.com/',
    retrieved: '2026-08-21',
    width: 447,
    height: 196,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'booster-robotics-logo',
    file: '/images/logos/booster-robotics.svg',
    alt: 'Booster Robotics company mark from the official website',
    caption: 'Booster Robotics logo from the official website, used on the market map.',
    sourceName: 'Booster Robotics official website',
    sourceUrl: 'https://www.booster.tech/',
    creator: 'Booster Robotics',
    licence: 'unlicensed',
    licenceUrl: 'https://www.booster.tech/',
    retrieved: '2026-08-21',
    width: 48,
    height: 48,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'leju-robotics-logo',
    file: '/images/logos/leju-robotics.png',
    alt: 'Leju Robotics company mark from the official website',
    caption: 'Leju Robotics logo from the official website, used on the market map.',
    sourceName: 'Leju Robotics official website',
    sourceUrl: 'https://www.lejurobot.com/en',
    creator: 'Leju Robotics',
    licence: 'unlicensed',
    licenceUrl: 'https://www.lejurobot.com/en',
    retrieved: '2026-08-21',
    width: 774,
    height: 111,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'paxini-logo',
    file: '/images/logos/paxini.png',
    alt: 'PaXini company mark from the official website',
    caption: 'PaXini logo from the official website, used on the market map.',
    sourceName: 'PaXini official website',
    sourceUrl: 'https://www.paxini.com/cn/',
    creator: 'PaXini',
    licence: 'unlicensed',
    licenceUrl: 'https://www.paxini.com/cn/',
    retrieved: '2026-08-21',
    width: 1731,
    height: 477,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'miso-robotics-logo',
    file: '/images/logos/miso-robotics.png',
    alt: 'Miso Robotics company mark from the official website',
    caption: 'Miso Robotics logo from the official website, used on the market map.',
    sourceName: 'Miso Robotics official website',
    sourceUrl: 'https://www.misorobotics.com/',
    creator: 'Miso Robotics',
    licence: 'unlicensed',
    licenceUrl: 'https://www.misorobotics.com/',
    retrieved: '2026-08-21',
    width: 250,
    height: 84,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'coco-robotics-logo',
    file: '/images/logos/coco-robotics.png',
    alt: 'Coco company mark from the official website',
    caption: 'Coco logo from the official website, used on the market map.',
    sourceName: 'Coco official website',
    sourceUrl: 'https://www.cocodelivery.com/',
    creator: 'Coco',
    licence: 'unlicensed',
    licenceUrl: 'https://www.cocodelivery.com/',
    retrieved: '2026-08-21',
    width: 614,
    height: 440,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'knightscope-logo',
    file: '/images/logos/knightscope.svg',
    alt: 'Knightscope company mark from the official website',
    caption: 'Knightscope logo from the official website, used on the market map.',
    sourceName: 'Knightscope official website',
    sourceUrl: 'https://knightscope.com/',
    creator: 'Knightscope',
    licence: 'unlicensed',
    licenceUrl: 'https://knightscope.com/',
    retrieved: '2026-08-21',
    width: 4712,
    height: 4712,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'brain-corp-logo',
    file: '/images/logos/brain-corp.svg',
    alt: 'Brain Corp company mark from the official website',
    caption: 'Brain Corp logo from the official website, used on the market map.',
    sourceName: 'Brain Corp official website',
    sourceUrl: 'https://www.braincorp.com/',
    creator: 'Brain Corp',
    licence: 'unlicensed',
    licenceUrl: 'https://www.braincorp.com/',
    retrieved: '2026-08-21',
    width: 431,
    height: 170,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'diligent-robotics-logo',
    file: '/images/logos/diligent-robotics.png',
    alt: 'Diligent Robotics company mark from the official website',
    caption: 'Diligent Robotics logo from the official website, used on the market map.',
    sourceName: 'Diligent Robotics official website',
    sourceUrl: 'https://www.diligentrobots.com/',
    creator: 'Diligent Robotics',
    licence: 'unlicensed',
    licenceUrl: 'https://www.diligentrobots.com/',
    retrieved: '2026-08-21',
    width: 358,
    height: 121,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'fox-robotics-logo',
    file: '/images/logos/fox-robotics.svg',
    alt: 'Fox Robotics company mark from the official website',
    caption: 'Fox Robotics logo from the official website, used on the market map.',
    sourceName: 'Fox Robotics official website',
    sourceUrl: 'https://foxrobotics.com/',
    creator: 'Fox Robotics',
    licence: 'unlicensed',
    licenceUrl: 'https://foxrobotics.com/',
    retrieved: '2026-08-21',
    width: 760,
    height: 322,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'zebra-robotics-automation-logo',
    file: '/images/logos/zebra-robotics-automation.svg',
    alt: 'Zebra Technologies (Robotics Automation) company mark from the official website',
    caption: 'Zebra Technologies (Robotics Automation) logo from the official website, used on the market map.',
    sourceName: 'Zebra Technologies (Robotics Automation) official website',
    sourceUrl: 'https://www.zebra.com/us/en.html',
    creator: 'Zebra Technologies',
    licence: 'unlicensed',
    licenceUrl: 'https://www.zebra.com/us/en.html',
    retrieved: '2026-08-21',
    width: 127,
    height: 42,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'robotphoenix-logo',
    file: '/images/logos/robotphoenix.webp',
    alt: 'Robotphoenix company mark from the official website',
    caption: 'Robotphoenix logo from the official website, used on the market map.',
    sourceName: 'Robotphoenix official website',
    sourceUrl: 'https://www.rprobotic.com/',
    creator: 'Robotphoenix',
    licence: 'unlicensed',
    licenceUrl: 'https://www.rprobotic.com/',
    retrieved: '2026-08-21',
    width: 250,
    height: 100,
    // Official first-party mark fetched from the source page. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
];
