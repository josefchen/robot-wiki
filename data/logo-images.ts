/**
 * Market-map company logos: the registered marks plotted on /market-map and
 * on the public companies map, IPO watch and funding tables.
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
 * Relative imports let this file load under plain node, Vitest,
 * and Next.js alike.
 */
import { marketTableLogoIds } from '../lib/market-table-logos.ts';
import type { SiteImage } from './schemas/image.ts';

const mapImages: SiteImage[] = [
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
    file: '/images/logos/covariant.svg',
    alt: 'Covariant C mark from the official website',
    caption: 'Covariant logo from the official website, used on the market map.',
    sourceName: 'Covariant official website',
    sourceUrl: 'https://covariant.ai/',
    creator: 'Covariant',
    licence: 'unlicensed',
    licenceUrl: 'https://covariant.ai/',
    retrieved: '2026-10-19',
    width: 21,
    height: 21,
    // Official mark: the mark the site now shows, https://covariant.ai/covariant-c.svg; it replaces a 2021 wordmark
    // file drawn on an opaque white ground. File SHA-256
    // f3b4b71e2da692e1e7646066a2cdce3a3b19ea1db5b1372f16bf1aeae5a75833, retrieved 2026-10-19. No reuse grant named;
    // recorded as unlicensed rather than inventing a Commons licence.
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
    alt: 'Hugging Face monochrome face mark from the official brand page',
    caption: 'Hugging Face logo from the official brand page, used on the market map.',
    sourceName: 'Hugging Face brand page',
    sourceUrl: 'https://huggingface.co/brand',
    creator: 'Hugging Face',
    licence: 'unlicensed',
    licenceUrl: 'https://huggingface.co/brand',
    retrieved: '2026-10-19',
    width: 1500,
    height: 1500,
    // Official mark: the monochrome logo of the official brand assets,
    // https://huggingface.co/datasets/huggingface/brand-assets/resolve/main/hf-logo-monochrome.svg; it replaces a
    // colour file whose face drew as a solid shape. File SHA-256
    // 87ac947dc4f0a9146fcd42aad52b657909bef9860eb284c651a6690e935e0595, retrieved 2026-10-19. No reuse grant named;
    // recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'figure-ai-logo',
    file: '/images/logos/figure-ai.svg',
    alt: 'Figure AI wordmark from the official website',
    caption: 'Figure AI logo from the official website, used on the market map.',
    sourceName: 'Figure AI official website',
    sourceUrl: 'https://www.figure.ai/',
    creator: 'Figure AI',
    licence: 'unlicensed',
    licenceUrl: 'https://www.figure.ai/',
    retrieved: '2026-10-19',
    width: 461,
    height: 69,
    // Official mark: the header wordmark of https://www.figure.ai/, served from the site's asset host as
    // https://images.ctfassets.net/qx5k8y1u9drj/3ygvPaiOiIX62OhZ7oNO2h/d50ccd3bc449eab7ae098d87aa0cd040/figure-logo.svg;
    // it replaces a symbol file drawn on a black square. File SHA-256
    // 01566fa8768852f29fb60c27fe603f6715f4eaeadc18dcd03eeaaafac36b4682, retrieved 2026-10-19. No reuse grant named;
    // recorded as unlicensed rather than inventing a Commons licence.
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
    file: '/images/logos/cmr-surgical.svg',
    alt: 'CMR Surgical company mark from the official website',
    caption: 'CMR Surgical logo from the official website, used on the market map.',
    sourceName: 'CMR Surgical official website',
    sourceUrl: 'https://cmrsurgical.com/',
    creator: 'CMR Surgical',
    licence: 'unlicensed',
    licenceUrl: 'https://cmrsurgical.com/',
    retrieved: '2026-10-19',
    width: 1080,
    height: 470,
    // Official mark: the header logo,
    // https://cmrsurgical.com/wp-content/uploads/2022/04/cmr-surgical-logo-web-white.svg (the press kit at
    // https://cmrsurgical.com/press-kit carries the same mark as Logo-CMRSurgical-White.png); it replaces a file
    // drawn on an opaque white ground. File SHA-256
    // 18121d407b7da687efaba35878a6c4d9ae7653d038efee7f085ae8f81b4fd973, retrieved 2026-10-19. No reuse grant named;
    // recorded as unlicensed rather than inventing a Commons licence.
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
    file: '/images/logos/harmonic-drive-systems.png',
    alt: 'Harmonic Drive Systems company mark from the official website',
    caption: 'Harmonic Drive Systems logo from the official website, used on the market map.',
    sourceName: 'Harmonic Drive Systems official website',
    sourceUrl: 'https://www.hds.co.jp/english/',
    creator: 'Harmonic Drive Systems Inc.',
    licence: 'unlicensed',
    licenceUrl: 'https://www.hds.co.jp/english/',
    retrieved: '2026-10-19',
    width: 225,
    height: 60,
    // Official mark: the header logo for light backgrounds,
    // https://www.hds.co.jp/Portals/0/files/common/images/logo_blue_en.png; it replaces the Harmonic Drive AG mark,
    // a group company's. File SHA-256 9d3fef6d80f0549acd842e055f811675f6b08c28ff2568355b1cedf7e4ac4117, retrieved
    // 2026-10-19. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
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
    file: '/images/logos/wonik-robotics.svg',
    alt: 'Wonik Robotics company mark from the official website',
    caption: 'Wonik Robotics logo from the official website, used on the market map.',
    sourceName: 'Wonik Robotics official website',
    sourceUrl: 'https://wonikrobotics.com/index.php',
    creator: 'Wonik Robotics',
    licence: 'unlicensed',
    licenceUrl: 'https://wonikrobotics.com/index.php',
    retrieved: '2026-10-19',
    width: 296,
    height: 30,
    // Official mark: the header logo, https://wonikrobotics.com/img/svg/img_logo.svg; it replaces the WONIK
    // Corporation USA mark, a group company's. File SHA-256
    // 38b3b2f6d95e5e832c402c3a6bf20478124eff3694ebca9d61a50b460008cf2a, retrieved 2026-10-19. No reuse grant named;
    // recorded as unlicensed rather than inventing a Commons licence.
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
    retrieved: '2026-10-19',
    width: 982,
    height: 145,
    // Official mark: the header wordmark of https://www.sunday.ai/ (an inline SVG), saved as a standalone file
    // unchanged; it replaces an icon drawn on a yellow square. File SHA-256
    // afbe6d1eb3fd3f54c23c1addf0cfc56669b135731dab2baf8ce9785688ae1914, retrieved 2026-10-19. No reuse grant named;
    // recorded as unlicensed rather than inventing a Commons licence.
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
    retrieved: '2026-10-19',
    width: 98,
    height: 36,
    // Official mark: an inline SVG of https://www.genesis.ai/ (the ring and wordmark), saved as a standalone file
    // unchanged; it replaces a symbol file that drew as a solid disc. File SHA-256
    // f68da5b54cd5ff7415e835279ebcd47e7fbd3ddb6eaee45bd6bb67c790652b34, retrieved 2026-10-19. No reuse grant named;
    // recorded as unlicensed rather than inventing a Commons licence.
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
    file: '/images/logos/mind-robotics.svg',
    alt: 'Mind Robotics company mark from the official website',
    caption: 'Mind Robotics logo from the official website, used on the market map.',
    sourceName: 'Mind Robotics official website',
    sourceUrl: 'https://www.mindrobotics.com/',
    creator: 'Mind Robotics',
    licence: 'unlicensed',
    licenceUrl: 'https://www.mindrobotics.com/',
    retrieved: '2026-10-19',
    width: 80,
    height: 64,
    // Official mark: the mark of https://www.mindrobotics.com/ (an inline SVG), saved as a standalone file with its
    // viewBox size added; it replaces a file drawn on an opaque ground. File SHA-256
    // 032c5a7e937091711817ae998ea536f201080a1907db5b4f99aac89664c6ae82, retrieved 2026-10-19. No reuse grant named;
    // recorded as unlicensed rather than inventing a Commons licence.
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
    file: '/images/logos/micro1.svg',
    alt: 'Micro1 company mark from the official website',
    caption: 'Micro1 logo from the official website, used on the market map.',
    sourceName: 'Micro1 official website',
    sourceUrl: 'https://www.micro1.ai/',
    creator: 'Micro1',
    licence: 'unlicensed',
    licenceUrl: 'https://www.micro1.ai/',
    retrieved: '2026-10-19',
    width: 89,
    height: 20,
    // Official mark: the header wordmark of https://www.micro1.ai/ (an inline SVG), saved as a standalone file with
    // its width and height set to its viewBox; it replaces an icon drawn on a black square. File SHA-256
    // d47e282dc81a77947898972fbc5846de22d56ad81999fa338cf036d69ec73e97, retrieved 2026-10-19. No reuse grant named;
    // recorded as unlicensed rather than inventing a Commons licence.
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
    file: '/images/logos/galbot.svg',
    alt: 'Galbot company mark from the official website',
    caption: 'Galbot logo from the official website, used on the market map.',
    sourceName: 'Galbot official website',
    sourceUrl: 'https://galbot.com/',
    creator: 'Galbot',
    licence: 'unlicensed',
    licenceUrl: 'https://galbot.com/',
    retrieved: '2026-10-19',
    width: 463,
    height: 48,
    // Official mark: the header wordmark of https://galbot.com/ (the inline SVG with class brand-logo), saved as a
    // standalone file with its viewbox attribute spelled viewBox, as the page's parser reads it; it replaces an icon
    // drawn on a black square. File SHA-256 78ff7309207722d2d76d16b37ea60f00c37aaaec6f5806a978e503fe94f85179,
    // retrieved 2026-10-19. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
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
    retrieved: '2026-10-19',
    width: 243,
    height: 58,
    // Official mark: the header logo for light backgrounds,
    // https://www.agibot.com/public/static/index/en/images/logo2.png; it replaces a file drawn on an opaque ground.
    // File SHA-256 83535ee96d57a776b05e4f8f0c3b0c65014ea7994ff1bab96d18b173f87f5aa9, retrieved 2026-10-19. No reuse
    // grant named; recorded as unlicensed rather than inventing a Commons licence.
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
    file: '/images/logos/humanoid-uk.svg',
    alt: 'Humanoid company mark from the official website',
    caption: 'Humanoid logo from the official website, used on the market map.',
    sourceName: 'Humanoid official website',
    sourceUrl: 'https://thehumanoid.ai/',
    creator: 'Humanoid',
    licence: 'unlicensed',
    licenceUrl: 'https://thehumanoid.ai/',
    retrieved: '2026-10-19',
    width: 327,
    height: 31,
    // Official mark: the footer logo,
    // https://thehumanoid.ai/wp-content/themes/SKLTech/src/assets/images/footer-logo.svg; it replaces an icon drawn
    // on a rounded square. File SHA-256 0a86825d0538deb58434e567d00a9739a84f243702de6ed599a5b9de9a2696a9, retrieved
    // 2026-10-19. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
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
    alt: 'RobotEra wordmark',
    caption: 'RobotEra logo from its brand profile, used on the market map.',
    sourceName: 'Brand.dev profile of robotera.com',
    sourceUrl: 'https://media.brand.dev/83d34286-0941-4e2a-b869-c84f8ca40830.png',
    creator: 'RobotEra',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/83d34286-0941-4e2a-b869-c84f8ca40830.png',
    retrieved: '2026-10-19',
    width: 174,
    height: 64,
    // Official mark: the logo Brand.dev records for robotera.com, fetched from its file URL above; robotera.com
    // reset every request for its own logo files on 19 October 2026, and the wordmark reads "ROBOTERA 星动纪元", the
    // company's English and Chinese names. File SHA-256
    // 621f1d9593021fe92d222c1f71943a4b07a3e8c3d6be22e0dd1ecc0d9d7090ea, retrieved 2026-10-19. No reuse grant named;
    // recorded as unlicensed rather than inventing a Commons licence.
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
    file: '/images/logos/limx-dynamics.svg',
    alt: 'LimX Dynamics company mark from the official website',
    caption: 'LimX Dynamics logo from the official website, used on the market map.',
    sourceName: 'LimX Dynamics official website',
    sourceUrl: 'https://www.limxdynamics.com/en',
    creator: 'LimX Dynamics',
    licence: 'unlicensed',
    licenceUrl: 'https://www.limxdynamics.com/en',
    retrieved: '2026-10-19',
    width: 3232,
    height: 1024,
    // Official mark: the header logo, symbol icon-a-zhujidongli-yingwenLogozuhe1caise1 of
    // https://www.limxdynamics.com/iconfont/iconfont.js, its paths unchanged inside an svg element with the symbol's
    // viewBox; it replaces a sharing image drawn on an opaque grey ground. File SHA-256
    // 0322dd27750096f9151a6a122741a1f084116dcc8bcc8d4ec427230b035246b2, retrieved 2026-10-19. No reuse grant named;
    // recorded as unlicensed rather than inventing a Commons licence.
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
    retrieved: '2026-10-19',
    width: 105,
    height: 32,
    // Official mark: the header mark of https://nimble.ai/ (the inline SVG in the link named "Nimble Logo"), saved
    // as a standalone file with an xmlns and its viewBox size added. File SHA-256
    // 6919f3a3da946bf42595d946a79b74578a9fc78b552069e74c8e7616431bf14c, retrieved 2026-10-19. No reuse grant named;
    // recorded as unlicensed rather than inventing a Commons licence.
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
    alt: 'Farm-ng company mark, a prompt symbol over its name, from the archived company website',
    caption: 'Farm-ng logo from the company website as archived before the acquisition, used on the market map.',
    sourceName: 'Farm-ng official website (Wayback Machine capture)',
    sourceUrl:
      'https://web.archive.org/web/20250710134407/https://farm-ng.com/wp-content/uploads/2025/05/farm-ng-logo.svg',
    creator: 'Farm-ng',
    licence: 'unlicensed',
    licenceUrl:
      'https://web.archive.org/web/20250710134407/https://farm-ng.com/wp-content/uploads/2025/05/farm-ng-logo.svg',
    retrieved: '2026-10-19',
    width: 135,
    height: 57,
    // Official mark (decided 2026-10-19): the header logo of the company's own site,
    // https://farm-ng.com/wp-content/uploads/2025/05/farm-ng-logo.svg, in the Wayback Machine capture of
    // 2025-07-10 13:44:07 UTC (the header of the farm-ng.com capture of 2025-06-18 references it, under
    // "© 2025 Farm-ng, Inc."), from before farm-ng.com began redirecting to Bonsai Robotics; saved byte for byte.
    // File SHA-256 afce0abf0c8a8fbb1a833c44c0eef2dee44cc60a2d12150e08aa4a942469286f, retrieved 2026-10-19. No
    // reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
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
    retrieved: '2026-10-19',
    width: 255,
    height: 51,
    // Official mark: the header logo of https://www.serverobotics.com/ (an inline SVG), saved as a standalone file
    // with its viewBox size added; it replaces an icon drawn on a white square. File SHA-256
    // 0d564558c00258447b9cf24711d7f4dcb2cf373d05c48ebf7dc15ea34b67c5ab, retrieved 2026-10-19. No reuse grant named;
    // recorded as unlicensed rather than inventing a Commons licence.
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
    file: '/images/logos/collaborative-robotics.svg',
    alt: 'Collaborative Robotics (Cobot) wordmark',
    caption: 'Collaborative Robotics logo from its brand profile, used on the market map.',
    sourceName: 'Brand.dev profile of co.bot',
    sourceUrl: 'https://media.brand.dev/5464ba3d-049e-4500-a3ed-42ab07ab4944.svg',
    creator: 'Collaborative Robotics',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/5464ba3d-049e-4500-a3ed-42ab07ab4944.svg',
    retrieved: '2026-10-19',
    width: 112,
    height: 32,
    // Official mark: the wordmark Brand.dev records for co.bot, fetched from its file URL above; co.bot draws its
    // header logo by script, so the file could not be fetched from the site itself, and the wordmark reads "cobot",
    // the name the site gives its logo link. File SHA-256
    // 812ff81760dea8dc71fabf42e1de1d17d25da78298c6a0056c35f7ae288cd755, retrieved 2026-10-19. No reuse grant named;
    // recorded as unlicensed rather than inventing a Commons licence.
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
    file: '/images/logos/weave-robotics.svg',
    alt: 'Weave Robotics company mark from the official website',
    caption: 'Weave Robotics logo from the official website, used on the market map.',
    sourceName: 'Weave Robotics official website',
    sourceUrl: 'https://www.weaverobotics.com/',
    creator: 'Weave Robotics',
    licence: 'unlicensed',
    licenceUrl: 'https://www.weaverobotics.com/',
    retrieved: '2026-10-19',
    width: 158,
    height: 32,
    // Official mark: the header wordmark of https://www.weaverobotics.com/ (an inline SVG), saved as a standalone
    // file with its viewBox size added; it replaces a file drawn on an opaque ground. File SHA-256
    // fadd6aab37e07d0dc3ab065371f6ed73ccd84d1e8920fe9f02a919620c070025, retrieved 2026-10-19. No reuse grant named;
    // recorded as unlicensed rather than inventing a Commons licence.
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
    file: '/images/logos/saronic.svg',
    alt: 'Saronic company mark from the official website',
    caption: 'Saronic logo from the official website, used on the market map.',
    sourceName: 'Saronic official website',
    sourceUrl: 'https://www.saronic.com/',
    creator: 'Saronic',
    licence: 'unlicensed',
    licenceUrl: 'https://www.saronic.com/',
    retrieved: '2026-10-19',
    width: 140,
    height: 28,
    // Official mark: the header logo of https://www.saronic.com/ (an inline SVG), saved as a standalone file with
    // its viewBox size added; it replaces an icon drawn on a lime square. File SHA-256
    // fc59d18b3f78246c1e300d43f28da466ec1cbbffdd2d39b2dc306d2488c00cd6, retrieved 2026-10-19. No reuse grant named;
    // recorded as unlicensed rather than inventing a Commons licence.
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
    retrieved: '2026-10-19',
    width: 721,
    height: 132,
    // Official mark: the logo the site declares for itself, https://formic.co/formic-logo.svg (the same drawing as
    // its header); it replaces an icon drawn on an orange square. File SHA-256
    // 2321647ef9c5751d19e3b34bf0b55986b08a2c6ea7b3fc90fabb9ae25a9f8247, retrieved 2026-10-19. No reuse grant named;
    // recorded as unlicensed rather than inventing a Commons licence.
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
    file: '/images/logos/fox-robotics.png',
    alt: 'Fox Robotics company mark from the official website',
    caption: 'Fox Robotics logo from the official website, used on the market map.',
    sourceName: 'Fox Robotics official website',
    sourceUrl: 'https://foxrobotics.com/',
    creator: 'Fox Robotics',
    licence: 'unlicensed',
    licenceUrl: 'https://foxrobotics.com/',
    retrieved: '2026-10-19',
    width: 3167,
    height: 1342,
    // Official mark: the one-colour header logo, https://foxrobotics.com/hubfs/fox-logo-wht.png; it replaces a file
    // whose type sat on an opaque white panel. File SHA-256
    // 21fb2728292a852d655f42c0e1ddaec449b99acb1743441105516dabf6327561, retrieved 2026-10-19. No reuse grant named;
    // recorded as unlicensed rather than inventing a Commons licence.
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
  {
    id: 'agile-robots-logo',
    file: '/images/logos/agile-robots.svg',
    alt: 'Agile Robots mark and wordmark from the official website',
    caption: 'Agile Robots logo from the official website, used on the market map.',
    sourceName: 'Agile Robots official website',
    sourceUrl: 'https://www.agile-robots.com/en/',
    creator: 'Agile Robots',
    licence: 'unlicensed',
    licenceUrl: 'https://www.agile-robots.com/en/',
    retrieved: '2026-11-12',
    width: 641,
    height: 101,
    // Official mark: the header logo of https://www.agile-robots.com/en/ (an inline SVG, white on the site's dark
    // header), saved as a standalone file with its viewBox attribute restored to SVG case. File SHA-256
    // dedf35cd7294a7b644426fd35561b5cb65cb40e7392b06ad2ccf62b99d29b8c3, retrieved 2026-11-12. No reuse grant named;
    // recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'd-robotics-logo',
    file: '/images/logos/d-robotics.png',
    alt: 'D-Robotics mark and wordmark from the official website',
    caption: 'D-Robotics logo from the official website, used on the market map.',
    sourceName: 'D-Robotics official website',
    sourceUrl: 'https://en.d-robotics.cc/',
    creator: 'D-Robotics',
    licence: 'unlicensed',
    licenceUrl: 'https://en.d-robotics.cc/',
    retrieved: '2026-11-12',
    width: 373,
    height: 78,
    // Official mark: the header logo of https://en.d-robotics.cc/, served as
    // https://en.d-robotics.cc/_next/static/media/logo.07c01094.png and saved unchanged. File SHA-256
    // 4f199d5f434a0fb8a947948ceee506505d3f71667eb5030d7431cdda657cc66d, retrieved 2026-11-12. No reuse grant named;
    // recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'walden-robotics-logo',
    file: '/images/logos/walden-robotics.svg',
    alt: 'Walden Robotics wordmark from the official website',
    caption: 'Walden Robotics logo from the official website, used on the market map.',
    sourceName: 'Walden Robotics official website',
    sourceUrl: 'https://www.waldenrobotics.com/',
    creator: 'Walden Robotics',
    licence: 'unlicensed',
    licenceUrl: 'https://www.waldenrobotics.com/',
    retrieved: '2026-11-12',
    width: 650,
    height: 145,
    // Official mark: the "walden" wordmark of https://www.waldenrobotics.com/ (the inline SVG in the footer's home
    // link), saved as a standalone file with an xmlns and its viewBox size added; the header's stacked mark sets the
    // same word too small to read on a map tile. File SHA-256
    // 0611c0b6c40160284eed349523e09f04fe6f8bb4b786efe333128be2beb161a1, retrieved 2026-11-12. No reuse grant named;
    // recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'tutor-intelligence-logo',
    file: '/images/logos/tutor-intelligence.svg',
    alt: 'Tutor Intelligence wordmark from the official website',
    caption: 'Tutor Intelligence logo from the official website, used on the market map.',
    sourceName: 'Tutor Intelligence official website',
    sourceUrl: 'https://tutorintelligence.com/',
    creator: 'Tutor Intelligence',
    licence: 'unlicensed',
    licenceUrl: 'https://tutorintelligence.com/',
    retrieved: '2026-11-12',
    width: 160,
    height: 47,
    // Official mark: the "tutor" wordmark of https://tutorintelligence.com/ (the inline SVG in the footer's home
    // link, beside the round knob icon, which the site draws as a separate file), saved as a standalone file
    // unchanged. File SHA-256 be7d267a532ad18a6cf4c773d6b8edfe086a43be804923965ac50ec00e49e20f, retrieved 2026-11-12.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'noetix-robotics-logo',
    file: '/images/logos/noetix-robotics.svg',
    alt: 'Noetix Robotics mark and NOETIX wordmark from the official website',
    caption: 'Noetix Robotics logo from the official website, used on the market map.',
    sourceName: 'Noetix Robotics official website',
    sourceUrl: 'https://www.noetixrobotics.com/',
    creator: 'Noetix Robotics',
    licence: 'unlicensed',
    licenceUrl: 'https://www.noetixrobotics.com/',
    retrieved: '2026-11-12',
    width: 1250,
    height: 226,
    // Official mark: the organisation logo https://www.noetixrobotics.com/ declares in its structured data,
    // https://image.noetixrobotics.com/pc/logo_one.svg (the N mark, NOETIX and 松延), saved unchanged. File SHA-256
    // 3435ab75b272cb6a9dc2bc2c61323758ad418cac45839ab165eda507f28f77a0, retrieved 2026-11-12. No reuse grant named;
    // recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'zipline-logo',
    file: '/images/logos/zipline.svg',
    alt: 'Zipline mark and wordmark from the official website',
    caption: 'Zipline logo from the official website, used on the market map.',
    sourceName: 'Zipline official website',
    sourceUrl: 'https://www.zipline.com/',
    creator: 'Zipline',
    licence: 'unlicensed',
    licenceUrl: 'https://www.zipline.com/',
    retrieved: '2026-11-12',
    width: 117,
    height: 24,
    // Official mark: the header logo of https://www.zipline.com/ (an inline SVG), saved as a standalone file with
    // its viewBox size added. File SHA-256 698a08cb53abf10d886177d0796c299706ae621f6ae07f80a6b998f98a4d6e5b,
    // retrieved 2026-11-12. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'geek-plus-logo',
    file: '/images/logos/geek-plus.png',
    alt: 'Geek+ wordmark from the official website',
    caption: 'Geek+ logo from the official website, used on the market map.',
    sourceName: 'Geek+ official website',
    sourceUrl: 'https://www.geekplus.com/en',
    creator: 'Geek+',
    licence: 'unlicensed',
    licenceUrl: 'https://www.geekplus.com/en',
    retrieved: '2026-11-12',
    width: 2492,
    height: 946,
    // Official mark: the header logo of https://www.geekplus.com/en, the transparent file
    // https://www.geekplus.com/hubfs/geek+%20logo%20transparent-1.png saved unchanged. File SHA-256
    // e7c67ccf575f93123e8844912ee9b85f2314da05775ff4840315bad4edb1dee8, retrieved 2026-11-12. No reuse grant named;
    // recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'robco-logo',
    file: '/images/logos/robco.svg',
    alt: 'RobCo mark and wordmark from the official website',
    caption: 'RobCo logo from the official website, used on the market map.',
    sourceName: 'RobCo official website',
    sourceUrl: 'https://www.rob.co/',
    creator: 'RobCo',
    licence: 'unlicensed',
    licenceUrl: 'https://www.rob.co/',
    retrieved: '2026-11-12',
    width: 955,
    height: 260,
    // Official mark: the header logo of https://www.rob.co/, served as
    // https://cdn.prod.website-files.com/68f2341d705f07db40d6f962/68f2341d705f07db40d6ffad_RobCo%20Logo.svg and saved
    // unchanged. File SHA-256 54fd5266460a605667c52d74654763e4d58463d1d401e8b9210bc88a5883a7cc, retrieved
    // 2026-11-12. No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'procept-biorobotics-logo',
    file: '/images/logos/procept-biorobotics.png',
    alt: 'PROCEPT BioRobotics wordmark',
    caption: 'PROCEPT BioRobotics logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of procept-biorobotics.com',
    sourceUrl: 'https://media.brand.dev/7fdb7c6d-ee0c-46e1-b939-d3b2ffbf6af3.png',
    creator: 'PROCEPT BioRobotics',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/7fdb7c6d-ee0c-46e1-b939-d3b2ffbf6af3.png',
    retrieved: '2026-11-14',
    width: 202,
    height: 50,
    // Official mark: the logo Brand.dev records for procept-biorobotics.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 802df476fd752b41a3ba444c9a0d195e1b9b1d3cff90d7d759973cfa43f2a83f, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'microbot-medical-logo',
    file: '/images/logos/microbot-medical.svg',
    alt: 'Microbot Medical wordmark with its orange arc',
    caption: 'Microbot Medical logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of microbotmedical.com',
    sourceUrl: 'https://media.brand.dev/03804aee-99fc-4382-abd4-f924f81dc82a.svg',
    creator: 'Microbot Medical',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/03804aee-99fc-4382-abd4-f924f81dc82a.svg',
    retrieved: '2026-11-14',
    width: 480,
    height: 170,
    // Official mark: the logo Brand.dev records for microbotmedical.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 2549096fac6c685313cd1d6189271f2c1809d24b976ca4adf754e07995fd24e0, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'ss-innovations-logo',
    file: '/images/logos/ss-innovations.png',
    alt: 'SS Innovations S mark and SSii wordmark',
    caption: 'SS Innovations logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of ssinnovations.com',
    sourceUrl: 'https://media.brand.dev/e0a86211-ff4d-4516-8273-9276968119ec.png',
    creator: 'SS Innovations',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/e0a86211-ff4d-4516-8273-9276968119ec.png',
    retrieved: '2026-11-14',
    width: 124,
    height: 60,
    // Official mark: the logo Brand.dev records for ssinnovations.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 7b29bad0fd3e1ff251cad5303d65e29dfefe86ed297a4596134f3f4d44bf67f2, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'johnson-and-johnson-logo',
    file: '/images/logos/johnson-and-johnson.svg',
    alt: 'Johnson & Johnson wordmark',
    caption: 'Johnson & Johnson logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of jnj.com',
    sourceUrl: 'https://media.brand.dev/53bbe85f-369d-4ffd-a835-8ea50a927d3f.svg',
    creator: 'Johnson & Johnson',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/53bbe85f-369d-4ffd-a835-8ea50a927d3f.svg',
    retrieved: '2026-11-14',
    width: 308,
    height: 30,
    // Official mark: the logo Brand.dev records for jnj.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 4a2b19e761a80353bb69c543b1479a9aaf9eae2d1423f8750286e9b73c2d4595, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'globus-medical-logo',
    file: '/images/logos/globus-medical.png',
    alt: 'Globus Medical globe mark and wordmark',
    caption: 'Globus Medical logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of globusmedical.com',
    sourceUrl: 'https://media.brand.dev/89dc02d2-670e-4ada-a747-74cf5e9313e4.png',
    creator: 'Globus Medical',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/89dc02d2-670e-4ada-a747-74cf5e9313e4.png',
    retrieved: '2026-11-14',
    width: 1005,
    height: 219,
    // Official mark: the logo Brand.dev records for globusmedical.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 867ca1a508e756fb4a23b0fab4aa91fb4c7d939d42312b26ae820cb68d2f1e58, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'lifeward-logo',
    file: '/images/logos/lifeward.svg',
    alt: 'Lifeward wordmark with its leaf mark',
    caption: 'Lifeward logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of golifeward.com',
    sourceUrl: 'https://media.brand.dev/b5e8f680-a5c0-4a3a-934c-f64b824917cb.svg',
    creator: 'Lifeward',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/b5e8f680-a5c0-4a3a-934c-f64b824917cb.svg',
    retrieved: '2026-11-14',
    width: 261,
    height: 87,
    // Official mark: the logo Brand.dev records for golifeward.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 8db296db9e5add23b10ac8e85274b8e02373f9fe713c259152cce2a97fcdd5bb, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'myomo-logo',
    file: '/images/logos/myomo.png',
    alt: 'Myomo wordmark with the line my own motion',
    caption: 'Myomo logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of myomo.com',
    sourceUrl: 'https://media.brand.dev/2c8497bb-cd12-4cd9-88e9-be6cd1e20a17.png',
    creator: 'Myomo',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/2c8497bb-cd12-4cd9-88e9-be6cd1e20a17.png',
    retrieved: '2026-11-14',
    width: 1251,
    height: 320,
    // Official mark: the logo Brand.dev records for myomo.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 4d0b3f2559b8531016e72868c0073193db66585d96fd8ef7950e76c5dfeb8f5d, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'alphabet-logo',
    file: '/images/logos/alphabet.png',
    alt: 'Alphabet wordmark',
    caption: 'Alphabet logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of abc.xyz',
    sourceUrl: 'https://media.brand.dev/1cd3a86b-8fb0-4f34-b40b-dc609f96655d.png',
    creator: 'Alphabet',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/1cd3a86b-8fb0-4f34-b40b-dc609f96655d.png',
    retrieved: '2026-11-14',
    width: 800,
    height: 194,
    // Official mark: the logo Brand.dev records for abc.xyz, fetched from its file URL above and saved
    // unchanged. File SHA-256 fd06ce5686c3f6fd93476ba3551a6caae68364a2c1c7624139565606029ebdda, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'teradyne-logo',
    file: '/images/logos/teradyne.png',
    alt: 'Teradyne wordmark',
    caption: 'Teradyne logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of teradyne.com',
    sourceUrl: 'https://media.brand.dev/683098cb-d7aa-4b33-b1b8-ab67f94ab285.png',
    creator: 'Teradyne',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/683098cb-d7aa-4b33-b1b8-ab67f94ab285.png',
    retrieved: '2026-11-14',
    width: 432,
    height: 65,
    // Official mark: the logo Brand.dev records for teradyne.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 d9043c787485bf2454e326b5612416d9bc0b6a719ae568173603878bd17465c5, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'rockwell-automation-logo',
    file: '/images/logos/rockwell-automation.svg',
    alt: 'Rockwell Automation RA badge and wordmark',
    caption: 'Rockwell Automation logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of rockwellautomation.com',
    sourceUrl: 'https://media.brand.dev/4631db48-2026-450d-8b6f-f2f8719e40aa.svg',
    creator: 'Rockwell Automation',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/4631db48-2026-450d-8b6f-f2f8719e40aa.svg',
    retrieved: '2026-11-14',
    width: 1715,
    height: 396,
    // Official mark: the logo Brand.dev records for rockwellautomation.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 0463cd68a11c78d70b50ba7e2d873710f42042e11548709b5b968d4b7eb867de, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'richtech-robotics-logo',
    file: '/images/logos/richtech-robotics.svg',
    alt: 'Richtech Robotics wordmark',
    caption: 'Richtech Robotics logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of richtechrobotics.com',
    sourceUrl: 'https://media.brand.dev/326c6a5b-5787-4a14-978e-5356e057ac50.svg',
    creator: 'Richtech Robotics',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/326c6a5b-5787-4a14-978e-5356e057ac50.svg',
    retrieved: '2026-11-14',
    width: 1531,
    height: 327,
    // Official mark: the logo Brand.dev records for richtechrobotics.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 d9eb677f63ae02326846006bcc63902514447dcc93951738575723055dc5f970, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'ouster-logo',
    file: '/images/logos/ouster.svg',
    alt: 'Ouster mark and wordmark',
    caption: 'Ouster logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of ouster.com',
    sourceUrl: 'https://media.brand.dev/7e634aaf-9164-41e6-8145-2fc5c9c477db.svg',
    creator: 'Ouster',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/7e634aaf-9164-41e6-8145-2fc5c9c477db.svg',
    retrieved: '2026-11-14',
    width: 133,
    height: 18,
    // Official mark: the logo Brand.dev records for ouster.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 6f1cb255c58350fa053807e4cecee96e7935d6dbad1d0e40bca5536fd8c2b762, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'hesai-logo',
    file: '/images/logos/hesai.svg',
    alt: 'Hesai company wordmark',
    caption: 'Hesai logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of hesaitech.com',
    sourceUrl: 'https://media.brand.dev/877fcd6a-97ab-4a35-bf55-8d444cbe24b2.svg',
    creator: 'Hesai',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/877fcd6a-97ab-4a35-bf55-8d444cbe24b2.svg',
    retrieved: '2026-11-14',
    width: 157,
    height: 32,
    // Official mark: the logo Brand.dev records for hesaitech.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 964cb97e89d81a3f5d1478331e0b49e64328d541c460adc15e68df60c4b445ea, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'aurora-innovation-logo',
    file: '/images/logos/aurora-innovation.svg',
    alt: 'Aurora wordmark',
    caption: 'Aurora logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of aurora.tech',
    sourceUrl: 'https://media.brand.dev/7a2b53df-97a9-40a3-b56d-3417911b651e.svg',
    creator: 'Aurora',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/7a2b53df-97a9-40a3-b56d-3417911b651e.svg',
    retrieved: '2026-11-14',
    width: 110,
    height: 31,
    // Official mark: the logo Brand.dev records for aurora.tech, fetched from its file URL above and saved
    // unchanged. File SHA-256 d50c6a1ecf26183cbbe2e1b95d049e7ea9c99478a175384a03c5b414e6e82d93, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'kodiak-logo',
    file: '/images/logos/kodiak.svg',
    alt: 'Kodiak wordmark',
    caption: 'Kodiak logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of kodiak.ai',
    sourceUrl: 'https://media.brand.dev/65b63196-9ed8-4e1d-a3d2-c24b119c7243.svg',
    creator: 'Kodiak',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/65b63196-9ed8-4e1d-a3d2-c24b119c7243.svg',
    retrieved: '2026-11-14',
    width: 250,
    height: 60,
    // Official mark: the logo Brand.dev records for kodiak.ai, fetched from its file URL above and saved
    // unchanged. File SHA-256 e66fb92084288e4bcb823c3a560c8af775c8e4cd3df758051e5db4f2cd71c611, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'mobileye-logo',
    file: '/images/logos/mobileye.svg',
    alt: 'Mobileye m mark and wordmark',
    caption: 'Mobileye logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of mobileye.com',
    sourceUrl: 'https://media.brand.dev/94bdb088-c16e-46a1-b8f0-52ecbde73bdd.svg',
    creator: 'Mobileye',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/94bdb088-c16e-46a1-b8f0-52ecbde73bdd.svg',
    retrieved: '2026-11-14',
    width: 160,
    height: 31,
    // Official mark: the logo Brand.dev records for mobileye.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 deebde32b82e01849ecea611580a9abca51119556d1260640b12c998013b39f2, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'ehang-logo',
    file: '/images/logos/ehang.png',
    alt: 'EHang wordmark with its Chinese name',
    caption: 'EHang logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of ehang.com',
    sourceUrl: 'https://media.brand.dev/d9b52796-c204-43e1-8481-2f485b602345.png',
    creator: 'EHang',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/d9b52796-c204-43e1-8481-2f485b602345.png',
    retrieved: '2026-11-14',
    width: 153,
    height: 18,
    // Official mark: the logo Brand.dev records for ehang.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 933c76ff07e1fc9b9e107374bb6bc1d4790d673d1e66ebdd927f24260ab7c82b, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'kratos-logo',
    file: '/images/logos/kratos.png',
    alt: 'Kratos wordmark',
    caption: 'Kratos Defense logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of kratosdefense.com',
    sourceUrl: 'https://media.brand.dev/bc7a13de-f14c-4705-bc59-fd8e362ca542.png',
    creator: 'Kratos Defense',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/bc7a13de-f14c-4705-bc59-fd8e362ca542.png',
    retrieved: '2026-11-14',
    width: 4320,
    height: 4320,
    // Official mark: the logo Brand.dev records for kratosdefense.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 c4980f902a9d2ff2ede8dbe27460bf397686df61668fe9682277d4a07e8e8cd5, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'red-cat-logo',
    file: '/images/logos/red-cat.png',
    alt: 'Red Cat wordmark',
    caption: 'Red Cat logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of redcatholdings.com',
    sourceUrl: 'https://media.brand.dev/d5d557c5-a8f0-4f28-bb15-314d8016a2c1.png',
    creator: 'Red Cat',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/d5d557c5-a8f0-4f28-bb15-314d8016a2c1.png',
    retrieved: '2026-11-14',
    width: 232,
    height: 68,
    // Official mark: the logo Brand.dev records for redcatholdings.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 15fd0440ff1d49814127eb9f65adb4a4bfabd7bae235f98f2829e1d1a4ed9818, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'ondas-logo',
    file: '/images/logos/ondas.png',
    alt: 'Ondas company wordmark',
    caption: 'Ondas logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of ondas.com',
    sourceUrl: 'https://media.brand.dev/d0d999fc-6c11-4a59-9117-7de6b35b75d2.png',
    creator: 'Ondas',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/d0d999fc-6c11-4a59-9117-7de6b35b75d2.png',
    retrieved: '2026-11-14',
    width: 164,
    height: 24,
    // Official mark: the logo Brand.dev records for ondas.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 56eded10cba59adcedb3867078ef721f849b273611e1bdf39161ba44e69f4bc0, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'unusual-machines-logo',
    file: '/images/logos/unusual-machines.png',
    alt: 'Unusual Machines U mark and wordmark',
    caption: 'Unusual Machines logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of unusualmachines.com',
    sourceUrl: 'https://media.brand.dev/8b34bcb2-f699-4686-8323-488a407f034e.png',
    creator: 'Unusual Machines',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/8b34bcb2-f699-4686-8323-488a407f034e.png',
    retrieved: '2026-11-14',
    width: 166,
    height: 41,
    // Official mark: the logo Brand.dev records for unusualmachines.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 271f2104ad694826d584d9a7af1cc947143e8f9303b1ed8ec462176b013e1584, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'draganfly-logo',
    file: '/images/logos/draganfly.png',
    alt: 'Draganfly wordmark',
    caption: 'Draganfly logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of draganfly.com',
    sourceUrl: 'https://media.brand.dev/fc88e749-8e4b-423d-b7b3-328e55349e2a.png',
    creator: 'Draganfly',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/fc88e749-8e4b-423d-b7b3-328e55349e2a.png',
    retrieved: '2026-11-14',
    width: 418,
    height: 94,
    // Official mark: the logo Brand.dev records for draganfly.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 a72fb5bf2546ab4032c957537747980719e075dcbf9c178fae02127968f9db57, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'xtend-logo',
    file: '/images/logos/xtend.svg',
    alt: 'XTEND company wordmark',
    caption: 'XTEND logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of xtend.me',
    sourceUrl: 'https://media.brand.dev/c1c88188-6bda-4dde-9e26-00f966cc3f2b.svg',
    creator: 'XTEND',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/c1c88188-6bda-4dde-9e26-00f966cc3f2b.svg',
    retrieved: '2026-11-14',
    width: 148,
    height: 32,
    // Official mark: the logo Brand.dev records for xtend.me, fetched from its file URL above and saved
    // unchanged. File SHA-256 ec8e41f2333ed2b5c86201afe31b65a38d816e7a7cbe4d7e0892acf435bc0b36, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'exyn-logo',
    file: '/images/logos/exyn.png',
    alt: 'Exyn bracket mark and wordmark',
    caption: 'Exyn logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of exyn.com',
    sourceUrl: 'https://media.brand.dev/f0d7179d-14e5-4a7d-b7f7-c0987701f821.png',
    creator: 'Exyn',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/f0d7179d-14e5-4a7d-b7f7-c0987701f821.png',
    retrieved: '2026-11-14',
    width: 300,
    height: 68,
    // Official mark: the logo Brand.dev records for exyn.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 549a67e4c035999ace25c6af383e79fc00264a54d526d56c61e2471360090b95, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'guardforce-ai-logo',
    file: '/images/logos/guardforce-ai.png',
    alt: 'Guardforce AI G mark and GFAI wordmark',
    caption: 'Guardforce AI logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of guardforceai.com',
    sourceUrl: 'https://media.brand.dev/3d9ffc43-b263-436b-8f1c-b514e65bdc0b.png',
    creator: 'Guardforce AI',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/3d9ffc43-b263-436b-8f1c-b514e65bdc0b.png',
    retrieved: '2026-11-14',
    width: 508,
    height: 152,
    // Official mark: the logo Brand.dev records for guardforceai.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 f9d16b64eb1ee43cfeb717e7bb383bf1468eaaae08a346596ebddef8a2b8b891, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'xpeng-logo',
    file: '/images/logos/xpeng.svg',
    alt: 'XPENG X mark and wordmark',
    caption: 'XPENG logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of xpeng.com',
    sourceUrl: 'https://media.brand.dev/35787c70-67ec-47ca-a22b-0653936a2ff3.svg',
    creator: 'XPENG',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/35787c70-67ec-47ca-a22b-0653936a2ff3.svg',
    retrieved: '2026-11-14',
    width: 148,
    height: 20,
    // Official mark: the logo Brand.dev records for xpeng.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 664eafc0ddc4bbe96e2fcf45202fa8815506d7a5e07064d2f2d12722954d1467, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'yaskawa-logo',
    file: '/images/logos/yaskawa.svg',
    alt: 'Yaskawa wordmark',
    caption: 'Yaskawa logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of yaskawa-global.com',
    sourceUrl: 'https://media.brand.dev/55480998-e361-48bc-9ad8-46d554a43556.svg',
    creator: 'Yaskawa',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/55480998-e361-48bc-9ad8-46d554a43556.svg',
    retrieved: '2026-11-14',
    width: 182,
    height: 33,
    // Official mark: the logo Brand.dev records for yaskawa-global.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 3ceaa6383fbd39e550853ba60de499d2b11fc5d71d989a962ecaa1499b4a0667, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'daifuku-logo',
    file: '/images/logos/daifuku.svg',
    alt: 'Daifuku wordmark with the line Automation that Inspires',
    caption: 'Daifuku logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of daifuku.com',
    sourceUrl: 'https://media.brand.dev/6650d68f-6bd6-4ac6-a82b-041c3083edc5.svg',
    creator: 'Daifuku',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/6650d68f-6bd6-4ac6-a82b-041c3083edc5.svg',
    retrieved: '2026-11-14',
    width: 223,
    height: 69,
    // Official mark: the logo Brand.dev records for daifuku.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 b9ce176ddfc3f115c37d5158ac62444da24b0aabcc6ac4b88d24b388c52fde17, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'omron-logo',
    file: '/images/logos/omron.svg',
    alt: 'Omron company wordmark',
    caption: 'Omron logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of omron.com',
    sourceUrl: 'https://media.brand.dev/4209f339-5f2b-4a1d-aaa6-c2ff338e78d3.svg',
    creator: 'Omron',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/4209f339-5f2b-4a1d-aaa6-c2ff338e78d3.svg',
    retrieved: '2026-11-14',
    width: 160,
    height: 32,
    // Official mark: the logo Brand.dev records for omron.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 dbb93322d662c6c2224416d5ab706c61233b56f314f0816f4ec40998d0facc2a, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'epson-logo',
    file: '/images/logos/epson.svg',
    alt: 'Epson company wordmark',
    caption: 'Epson logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of global.epson.com',
    sourceUrl: 'https://media.brand.dev/93e71ad4-9e4c-4c86-82a2-5a47016429b6.svg',
    creator: 'Epson',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/93e71ad4-9e4c-4c86-82a2-5a47016429b6.svg',
    retrieved: '2026-11-14',
    width: 283,
    height: 100,
    // Official mark: the logo Brand.dev records for global.epson.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 4a768b44784fbc607136f5fdbb7ba7017fb6940fb3c2e6efc66a94d88e594a23, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'yamaha-motor-logo',
    file: '/images/logos/yamaha-motor.png',
    alt: 'Yamaha tuning fork emblem and wordmark',
    caption: 'Yamaha Motor logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of global.yamaha-motor.com',
    sourceUrl: 'https://media.brand.dev/6ba244c3-9a2a-4c87-b926-918908f013d5.png',
    creator: 'Yamaha Motor',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/6ba244c3-9a2a-4c87-b926-918908f013d5.png',
    retrieved: '2026-11-14',
    width: 500,
    height: 173,
    // Official mark: the logo Brand.dev records for global.yamaha-motor.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 2b39f04703dce69d0de978cd660e1e5d2aa2de6ad174490b329be55f5d3564f0, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'nachi-fujikoshi-logo',
    file: '/images/logos/nachi-fujikoshi.png',
    alt: 'Nachi wordmark with its Japanese name',
    caption: 'Nachi-Fujikoshi logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of nachi-fujikoshi.co.jp',
    sourceUrl: 'https://media.brand.dev/6173b2e8-149c-4112-b08d-3d13bae6775f.png',
    creator: 'Nachi-Fujikoshi',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/6173b2e8-149c-4112-b08d-3d13bae6775f.png',
    retrieved: '2026-11-14',
    width: 263,
    height: 135,
    // Official mark: the logo Brand.dev records for nachi-fujikoshi.co.jp, fetched from its file URL above and saved
    // unchanged. File SHA-256 f70f5651ab7cc8e8092c8a1b572dbb673cf3814323f4c79662bd16958a3dab3c, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'mitsubishi-electric-logo',
    file: '/images/logos/mitsubishi-electric.svg',
    alt: 'Mitsubishi Electric three diamond mark and wordmark',
    caption: 'Mitsubishi Electric logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of mitsubishielectric.com',
    sourceUrl: 'https://media.brand.dev/9e4b6ff3-1524-483d-bd3d-895e33be172b.svg',
    creator: 'Mitsubishi Electric',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/9e4b6ff3-1524-483d-bd3d-895e33be172b.svg',
    retrieved: '2026-11-14',
    width: 109,
    height: 46,
    // Official mark: the logo Brand.dev records for mitsubishielectric.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 aeb6589f8b129b9a54011ca5f1de3bf6f5b2ca8d067a395eef55af5d0baf73e1, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'softbank-group-logo',
    file: '/images/logos/softbank-group.svg',
    alt: 'SoftBank Group mark and wordmark',
    caption: 'SoftBank Group logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of group.softbank',
    sourceUrl: 'https://media.brand.dev/316714f9-e640-4769-9110-ea502131ace5.svg',
    creator: 'SoftBank Group',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/316714f9-e640-4769-9110-ea502131ace5.svg',
    retrieved: '2026-11-14',
    width: 157,
    height: 37,
    // Official mark: the logo Brand.dev records for group.softbank, fetched from its file URL above and saved
    // unchanged. File SHA-256 8da1a3265c5e7f47bf048eb8285b2d54972215c58f086950e08e28438c0a74de, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'cyberdyne-logo',
    file: '/images/logos/cyberdyne.svg',
    alt: 'Cyberdyne C mark and wordmark',
    caption: 'Cyberdyne logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of cyberdyne.jp',
    sourceUrl: 'https://media.brand.dev/af0e15f9-1212-4737-a6b5-541018d0b109.svg',
    creator: 'Cyberdyne',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/af0e15f9-1212-4737-a6b5-541018d0b109.svg',
    retrieved: '2026-11-14',
    width: 180,
    height: 40,
    // Official mark: the logo Brand.dev records for cyberdyne.jp, fetched from its file URL above and saved
    // unchanged. File SHA-256 02b7ef86e1d8246a5ebb379fb0f5701c659bfa2703d29f7b30c446835828b8ef, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'doosan-robotics-logo',
    file: '/images/logos/doosan-robotics.svg',
    alt: 'Doosan wordmark used by Doosan Robotics',
    caption: 'Doosan Robotics logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of doosanrobotics.com',
    sourceUrl: 'https://media.brand.dev/314af4e7-03ba-482e-9fc2-732a112e3df7.svg',
    creator: 'Doosan Robotics',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/314af4e7-03ba-482e-9fc2-732a112e3df7.svg',
    retrieved: '2026-11-14',
    width: 127,
    height: 18,
    // Official mark: the logo Brand.dev records for doosanrobotics.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 ce7d21cceb3bfdd4815c6d540dbf1e6d066183002fa240a2cb816ddaa8cdc3c3, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'samsung-logo',
    file: '/images/logos/samsung.svg',
    alt: 'Samsung wordmark',
    caption: 'Samsung logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of samsung.com',
    sourceUrl: 'https://media.brand.dev/27acd877-7dbd-4835-ade1-268c1ebc919c.svg',
    creator: 'Samsung',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/27acd877-7dbd-4835-ade1-268c1ebc919c.svg',
    retrieved: '2026-11-14',
    width: 130,
    height: 29,
    // Official mark: the logo Brand.dev records for samsung.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 fd8acc5b0fa8c55ac88d461541b25f61e3e869c8c553671eaec8b96abe301d08, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'yujin-robot-logo',
    file: '/images/logos/yujin-robot.png',
    alt: 'Yujin Robot wordmark with its robot figure',
    caption: 'Yujin Robot logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of yujinrobot.com',
    sourceUrl: 'https://media.brand.dev/7ad12fa3-ac0f-47c6-b1de-811678faf245.png',
    creator: 'Yujin Robot',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/7ad12fa3-ac0f-47c6-b1de-811678faf245.png',
    retrieved: '2026-11-14',
    width: 258,
    height: 86,
    // Official mark: the logo Brand.dev records for yujinrobot.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 2e72788b2b2ed05be55470ca584b90e45969eda3db890a40a831f4e0a437f818, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'neuromeka-logo',
    file: '/images/logos/neuromeka.png',
    alt: 'Neuromeka N mark and wordmark',
    caption: 'Neuromeka logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of neuromeka.com',
    sourceUrl: 'https://media.brand.dev/307bf5db-a2f3-4d6a-9cf7-ecf5a6ec342a.png',
    creator: 'Neuromeka',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/307bf5db-a2f3-4d6a-9cf7-ecf5a6ec342a.png',
    retrieved: '2026-11-14',
    width: 418,
    height: 60,
    // Official mark: the logo Brand.dev records for neuromeka.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 8ad83eb95673d7fd4f3e462bf50399ef4800227bfd96b4c3f4e057c71173655f, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'curexo-logo',
    file: '/images/logos/curexo.png',
    alt: 'Curexo mark and wordmark',
    caption: 'Curexo logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of curexo.com',
    sourceUrl: 'https://media.brand.dev/bd417d1a-e69a-4ae4-b120-bb9f5abe973d.png',
    creator: 'Curexo',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/bd417d1a-e69a-4ae4-b120-bb9f5abe973d.png',
    retrieved: '2026-11-14',
    width: 160,
    height: 40,
    // Official mark: the logo Brand.dev records for curexo.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 a0ab120c4b8dab7fee3fdbdf4b320f8eda6c4f342afc75ab3081fb5321815501, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'clobot-logo',
    file: '/images/logos/clobot.png',
    alt: 'Clobot cloud mark and wordmark',
    caption: 'Clobot logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of clobot.co.kr',
    sourceUrl: 'https://media.brand.dev/6687a7f4-570f-4b72-9a7a-62b1a6dd9c29.png',
    creator: 'Clobot',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/6687a7f4-570f-4b72-9a7a-62b1a6dd9c29.png',
    retrieved: '2026-11-14',
    width: 468,
    height: 105,
    // Official mark: the logo Brand.dev records for clobot.co.kr, fetched from its file URL above and saved
    // unchanged. File SHA-256 17d1993e68ac811e9c8990c6b4f3dad73db7c9f2d788fede685d080369c56aa0, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'spg-logo',
    file: '/images/logos/spg.png',
    alt: 'SPG company wordmark',
    caption: 'SPG logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of spg.co.kr',
    sourceUrl: 'https://media.brand.dev/dac0db21-d89c-4236-9cbb-25dd7fd28bc4.png',
    creator: 'SPG',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/dac0db21-d89c-4236-9cbb-25dd7fd28bc4.png',
    retrieved: '2026-11-14',
    width: 328,
    height: 160,
    // Official mark: the logo Brand.dev records for spg.co.kr, fetched from its file URL above and saved
    // unchanged. File SHA-256 d556f179dea29a570da5493d8f957795b9b3a8443e33de937f8fdb78bd1eea36, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'hiwin-logo',
    file: '/images/logos/hiwin.svg',
    alt: 'HIWIN company wordmark',
    caption: 'HIWIN logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of hiwin.tw',
    sourceUrl: 'https://media.brand.dev/38370fb2-8a58-4473-aa13-6c0fd2e0731c.svg',
    creator: 'HIWIN',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/38370fb2-8a58-4473-aa13-6c0fd2e0731c.svg',
    retrieved: '2026-11-14',
    width: 122,
    height: 24,
    // Official mark: the logo Brand.dev records for hiwin.tw, fetched from its file URL above and saved
    // unchanged. File SHA-256 16d9b834e771fe72d527d906f0421c13f3e10c31b774934a01489d050c5edc43, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'roborock-logo',
    file: '/images/logos/roborock.svg',
    alt: 'Roborock wordmark',
    caption: 'Roborock logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of roborock.com',
    sourceUrl: 'https://media.brand.dev/ea820036-fab9-4e57-87bf-35f2a4b97ae5.svg',
    creator: 'Roborock',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/ea820036-fab9-4e57-87bf-35f2a4b97ae5.svg',
    retrieved: '2026-11-14',
    width: 105,
    height: 15,
    // Official mark: the logo Brand.dev records for roborock.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 5a0ce21081956993afb81dfee2ac0cc6779fdab72634ffd47aaa6e959b8e4f35, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'ecovacs-logo',
    file: '/images/logos/ecovacs.png',
    alt: 'Ecovacs wordmark',
    caption: 'Ecovacs logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of ecovacs.com',
    sourceUrl: 'https://media.brand.dev/20e4cd23-015c-4e99-aab1-0bd47cdfbe5e.png',
    creator: 'Ecovacs',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/20e4cd23-015c-4e99-aab1-0bd47cdfbe5e.png',
    retrieved: '2026-11-14',
    width: 176,
    height: 50,
    // Official mark: the logo Brand.dev records for ecovacs.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 1f31da0902af5fa9b9ea54a7555d0189f173a46c772c95b87ba9a95ca144e0db, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'tinavi-logo',
    file: '/images/logos/tinavi.png',
    alt: 'Tinavi wordmark',
    caption: 'Tinavi logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of tinavi.com',
    sourceUrl: 'https://media.brand.dev/10bd4bc7-0957-48c3-afc5-ae3b1fcabf2e.png',
    creator: 'Tinavi',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/10bd4bc7-0957-48c3-afc5-ae3b1fcabf2e.png',
    retrieved: '2026-11-14',
    width: 139,
    height: 30,
    // Official mark: the logo Brand.dev records for tinavi.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 6bb20cc22ee00f59e2748301cc51765449820f365c4cd26de50ed982ba2cc451, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'orbbec-logo',
    file: '/images/logos/orbbec.svg',
    alt: 'Orbbec dot mark and wordmark',
    caption: 'Orbbec logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of orbbec.com',
    sourceUrl: 'https://media.brand.dev/feb5a872-2e91-4638-99bb-cf1882a86afc.svg',
    creator: 'Orbbec',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/feb5a872-2e91-4638-99bb-cf1882a86afc.svg',
    retrieved: '2026-11-14',
    width: 240,
    height: 45,
    // Official mark: the logo Brand.dev records for orbbec.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 919204ec4409bcd9ab3fd4fc7c2f300cb4fd22e16f0e598b79b858bbb5c2b9e9, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'yijiahe-logo',
    file: '/images/logos/yijiahe.svg',
    alt: 'Yijiahe round mark and wordmark',
    caption: 'Yijiahe logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of yijiahe.com',
    sourceUrl: 'https://media.brand.dev/750c0275-d605-4fda-9315-b9699cca3559.svg',
    creator: 'Yijiahe',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/750c0275-d605-4fda-9315-b9699cca3559.svg',
    retrieved: '2026-11-14',
    width: 320,
    height: 122,
    // Official mark: the logo Brand.dev records for yijiahe.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 5f5cc812f7e698ab52aceea58e16cd2f783054c13f37f6ec591628fa6b279c3c, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'dobot-logo',
    file: '/images/logos/dobot.svg',
    alt: 'Dobot hexagon mark and wordmark',
    caption: 'Dobot logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of dobot-robots.com',
    sourceUrl: 'https://media.brand.dev/ff904a27-88e6-450e-80a1-34d1d75172a2.svg',
    creator: 'Dobot',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/ff904a27-88e6-450e-80a1-34d1d75172a2.svg',
    retrieved: '2026-11-14',
    width: 90,
    height: 30,
    // Official mark: the logo Brand.dev records for dobot-robots.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 f44d5d7c7579d3221005e124b35706d9d593d82cbb173e11ba57e29545e401b6, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'microport-medbot-logo',
    file: '/images/logos/microport-medbot.png',
    alt: 'MedBot mark and wordmark',
    caption: 'MicroPort MedBot logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of medbotsurgical.com',
    sourceUrl: 'https://media.brand.dev/204ea133-d752-4fa2-9b8a-092727a17786.png',
    creator: 'MicroPort MedBot',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/204ea133-d752-4fa2-9b8a-092727a17786.png',
    retrieved: '2026-11-14',
    width: 241,
    height: 67,
    // Official mark: the logo Brand.dev records for medbotsurgical.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 4272c895e7998411daaa78d2f7611cf073ad28f58f02b51111196e6eaa2bf673, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'ldrobot-logo',
    file: '/images/logos/ldrobot.png',
    alt: 'LDROBOT wordmark with the line Move Smarter',
    caption: 'LDROBOT logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of ldrobot.com',
    sourceUrl: 'https://media.brand.dev/915a522d-02d3-48b3-8577-bb9104a3743e.png',
    creator: 'LDROBOT',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/915a522d-02d3-48b3-8577-bb9104a3743e.png',
    retrieved: '2026-11-14',
    width: 830,
    height: 205,
    // Official mark: the logo Brand.dev records for ldrobot.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 8e802df8ac8ce7cb55b480c95b5b62db8d0ee9f933c74899482a188cd1665b61, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'uisee-logo',
    file: '/images/logos/uisee.svg',
    alt: 'UISEE wordmark with its Chinese name',
    caption: 'UISEE logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of uisee.com',
    sourceUrl: 'https://media.brand.dev/a833cd66-2522-413e-a718-24959718d725.svg',
    creator: 'UISEE',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/a833cd66-2522-413e-a718-24959718d725.svg',
    retrieved: '2026-11-14',
    width: 147,
    height: 48,
    // Official mark: the logo Brand.dev records for uisee.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 c85ea6941525cfd75827c07787ca61e820e3b5b6a3d3d3fc38837ac89de403f9, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'seer-robotics-logo',
    file: '/images/logos/seer-robotics.svg',
    alt: 'Seer Robotics wordmark',
    caption: 'Seer Robotics logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of seer-group.com',
    sourceUrl: 'https://media.brand.dev/e3e93a62-bd14-4160-8b5f-13fbe4a7c519.svg',
    creator: 'Seer Robotics',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/e3e93a62-bd14-4160-8b5f-13fbe4a7c519.svg',
    retrieved: '2026-11-14',
    width: 252,
    height: 28,
    // Official mark: the logo Brand.dev records for seer-group.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 dabd65fc6900a796456f1446fe0ad69eb238db746b9c5e6b7bec5b818d719554, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'laifual-logo',
    file: '/images/logos/laifual.png',
    alt: 'Laifual Drive wordmark with its Chinese name',
    caption: 'Laifual Drive logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of laifual.com',
    sourceUrl: 'https://media.brand.dev/8e9621f9-f9bd-4ba1-8d06-ff14ca32fb00.png',
    creator: 'Laifual Drive',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/8e9621f9-f9bd-4ba1-8d06-ff14ca32fb00.png',
    retrieved: '2026-11-14',
    width: 217,
    height: 102,
    // Official mark: the logo Brand.dev records for laifual.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 a02bb58a35f3d507ba58398fe3963ad9bb8c46664cda294f3a43df3bf4231a96, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'momenta-logo',
    file: '/images/logos/momenta.png',
    alt: 'Momenta M mark and wordmark',
    caption: 'Momenta logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of momenta.ai',
    sourceUrl: 'https://media.brand.dev/fac1f32f-018b-4828-afaa-52665a331cf9.png',
    creator: 'Momenta',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/fac1f32f-018b-4828-afaa-52665a331cf9.png',
    retrieved: '2026-11-14',
    width: 549,
    height: 67,
    // Official mark: the logo Brand.dev records for momenta.ai, fetched from its file URL above and saved
    // unchanged. File SHA-256 9b7b0be7d2b3e86d0e1abdca2058766627df8669f9be41798972bd7f951f2158, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'mech-mind-logo',
    file: '/images/logos/mech-mind.png',
    alt: 'Mech Mind mark and wordmark',
    caption: 'Mech-Mind logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of mech-mind.com',
    sourceUrl: 'https://media.brand.dev/ad84400a-d4a1-4007-a3d9-5e66dc53e501.png',
    creator: 'Mech-Mind',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/ad84400a-d4a1-4007-a3d9-5e66dc53e501.png',
    retrieved: '2026-11-14',
    width: 1336,
    height: 512,
    // Official mark: the logo Brand.dev records for mech-mind.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 515515ab4ab84886e7ba3a6733919568c8a162a6b5351eb66148fe528e1f9a73, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'camsense-logo',
    file: '/images/logos/camsense.svg',
    alt: 'Camsense wordmark with its Chinese name',
    caption: 'Camsense logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of camsense.cn',
    sourceUrl: 'https://media.brand.dev/1a8c4c4e-502a-4e29-aab0-0e7300a22644.svg',
    creator: 'Camsense',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/1a8c4c4e-502a-4e29-aab0-0e7300a22644.svg',
    retrieved: '2026-11-14',
    width: 548,
    height: 176,
    // Official mark: the logo Brand.dev records for camsense.cn, fetched from its file URL above and saved
    // unchanged. File SHA-256 97187e53d5515fd929606a626450e951baaecf812ae5bafbec0da8a86366f4af, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'amicro-logo',
    file: '/images/logos/amicro.png',
    alt: 'Amicro wordmark with its Chinese name',
    caption: 'Amicro logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of amicro.com.cn',
    sourceUrl: 'https://media.brand.dev/a24e140c-99a8-46cb-bf58-d79330db0d95.png',
    creator: 'Amicro',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/a24e140c-99a8-46cb-bf58-d79330db0d95.png',
    retrieved: '2026-11-14',
    width: 1664,
    height: 471,
    // Official mark: the logo Brand.dev records for amicro.com.cn, fetched from its file URL above and saved
    // unchanged. File SHA-256 b764564b1b1d80d4b8d87ba927d3f85c6564a2ed5e3deca69364df62485e9dcf, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'cidi-logo',
    file: '/images/logos/cidi.png',
    alt: 'CiDi company wordmark',
    caption: 'CiDi logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of cidi.ai',
    sourceUrl: 'https://media.brand.dev/eadd3750-218a-477b-990a-c24f5be14e4f.png',
    creator: 'CiDi',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/eadd3750-218a-477b-990a-c24f5be14e4f.png',
    retrieved: '2026-11-14',
    width: 161,
    height: 55,
    // Official mark: the logo Brand.dev records for cidi.ai, fetched from its file URL above and saved
    // unchanged. File SHA-256 64a0c5c8061c21d872b93406f3c11ebd3933f910f7549aad00060bde5da13fc0, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'kardex-logo',
    file: '/images/logos/kardex.svg',
    alt: 'Kardex wordmark',
    caption: 'Kardex logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of kardex.com',
    sourceUrl: 'https://media.brand.dev/e9b2c604-ab5a-4eff-a0e3-382927c7f3c5.svg',
    creator: 'Kardex',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/e9b2c604-ab5a-4eff-a0e3-382927c7f3c5.svg',
    retrieved: '2026-11-14',
    width: 144,
    height: 33,
    // Official mark: the logo Brand.dev records for kardex.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 aa8ba4f7082615b3d4847eac82e63d0f9547c12297171076f9a8c9086600825d, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'kion-group-logo',
    file: '/images/logos/kion-group.png',
    alt: 'KION Group wordmark',
    caption: 'KION Group logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of kiongroup.com',
    sourceUrl: 'https://media.brand.dev/a62f468d-e2cc-4858-8041-3f6a44ae301f.png',
    creator: 'KION Group',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/a62f468d-e2cc-4858-8041-3f6a44ae301f.png',
    retrieved: '2026-11-14',
    width: 143,
    height: 51,
    // Official mark: the logo Brand.dev records for kiongroup.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 83daf68882a6e179dcaed631203784e0b8c135efe1f60ecbecc0fbc502a9dd98, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'jungheinrich-logo',
    file: '/images/logos/jungheinrich.svg',
    alt: 'Jungheinrich wordmark with its arrow',
    caption: 'Jungheinrich logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of jungheinrich.com',
    sourceUrl: 'https://media.brand.dev/73a39ead-3b3f-48d5-b1f1-b75f10257e19.svg',
    creator: 'Jungheinrich',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/73a39ead-3b3f-48d5-b1f1-b75f10257e19.svg',
    retrieved: '2026-11-14',
    width: 194,
    height: 29,
    // Official mark: the logo Brand.dev records for jungheinrich.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 2f58e94909e00aaedb37001d0c12ac74e6fc206871bf510d7a7d49250c7793df, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'ocado-group-logo',
    file: '/images/logos/ocado-group.svg',
    alt: 'Ocado Group hexagon mark and wordmark',
    caption: 'Ocado Group logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of ocadogroup.com',
    sourceUrl: 'https://media.brand.dev/836e50d2-74c4-4287-8868-e83b7309d5db.svg',
    creator: 'Ocado Group',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/836e50d2-74c4-4287-8868-e83b7309d5db.svg',
    retrieved: '2026-11-14',
    width: 120,
    height: 44,
    // Official mark: the logo Brand.dev records for ocadogroup.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 f894c01dc291e2d15a60c321b1e86d20945c6b4de1c592b6379a66954e7991ec, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'smith-and-nephew-logo',
    file: '/images/logos/smith-and-nephew.png',
    alt: 'Smith+Nephew wordmark',
    caption: 'Smith+Nephew logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of smith-nephew.com',
    sourceUrl: 'https://media.brand.dev/6e1e848b-1b16-49c7-b004-625aaeaf94e6.png',
    creator: 'Smith+Nephew',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/6e1e848b-1b16-49c7-b004-625aaeaf94e6.png',
    retrieved: '2026-11-14',
    width: 235,
    height: 32,
    // Official mark: the logo Brand.dev records for smith-nephew.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 5d4922735a84dd125868c9ad2be1ac73f59bc2c27a639cdb8de5500826def53d, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'exail-logo',
    file: '/images/logos/exail.svg',
    alt: 'Exail company wordmark',
    caption: 'Exail logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of exail.com',
    sourceUrl: 'https://media.brand.dev/6968f2e5-339e-4e3a-a44a-b2bef6072e6c.svg',
    creator: 'Exail',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/6968f2e5-339e-4e3a-a44a-b2bef6072e6c.svg',
    retrieved: '2026-11-14',
    width: 88,
    height: 31,
    // Official mark: the logo Brand.dev records for exail.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 e65456b6888b8e9897a0bc5719e2f6c15e94ae642f5b42b7c190feb6e10516a9, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'parrot-logo',
    file: '/images/logos/parrot.svg',
    alt: 'Parrot wordmark',
    caption: 'Parrot logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of parrot.com',
    sourceUrl: 'https://media.brand.dev/3ef05fce-27f8-4e29-adbd-c1c8ee5f2067.svg',
    creator: 'Parrot',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/3ef05fce-27f8-4e29-adbd-c1c8ee5f2067.svg',
    retrieved: '2026-11-14',
    width: 97,
    height: 25,
    // Official mark: the logo Brand.dev records for parrot.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 b6bfee9ba5601ec45e2b4eca5ba4edef70b4cbdea3886f06f634415f13bc0e9c, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'maytronics-logo',
    file: '/images/logos/maytronics.svg',
    alt: 'Maytronics wordmark',
    caption: 'Maytronics logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of maytronics.com',
    sourceUrl: 'https://media.brand.dev/45340560-1c21-43f9-b26f-f635a919969d.svg',
    creator: 'Maytronics',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/45340560-1c21-43f9-b26f-f635a919969d.svg',
    retrieved: '2026-11-14',
    width: 150,
    height: 36,
    // Official mark: the logo Brand.dev records for maytronics.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 2959a743e4121ce02657a744d918a5fb2218712607693aff427ae40e25db3a04, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'kraken-robotics-logo',
    file: '/images/logos/kraken-robotics.svg',
    alt: 'Kraken Robotics octopus mark and wordmark',
    caption: 'Kraken Robotics logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of krakenrobotics.com',
    sourceUrl: 'https://media.brand.dev/1af0fb8b-7ea9-4cea-a1da-77cd39ddae00.svg',
    creator: 'Kraken Robotics',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/1af0fb8b-7ea9-4cea-a1da-77cd39ddae00.svg',
    retrieved: '2026-11-14',
    width: 473,
    height: 131,
    // Official mark: the logo Brand.dev records for krakenrobotics.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 0d10a0e99f12e7861792a5866b29573f10e5b5e33f2e8a96c353fedb7884b779, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'scott-technology-logo',
    file: '/images/logos/scott-technology.svg',
    alt: 'Scott triangle mark and wordmark',
    caption: 'Scott Technology logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of scottautomation.com',
    sourceUrl: 'https://media.brand.dev/dc96c1b8-1d5c-4283-958d-256f2025f8d9.svg',
    creator: 'Scott Technology',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/dc96c1b8-1d5c-4283-958d-256f2025f8d9.svg',
    retrieved: '2026-11-14',
    width: 201,
    height: 40,
    // Official mark: the logo Brand.dev records for scottautomation.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 9628b229b2979f29f22fd00aada7d8e711000976954a08c606d22dd075e785aa, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'yushin-logo',
    file: '/images/logos/yushin.svg',
    alt: 'Yushin wordmark',
    caption: 'Yushin logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of yushin.com',
    sourceUrl: 'https://media.brand.dev/11f64e91-a65d-4887-b842-25af6614d45d.svg',
    creator: 'Yushin',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/11f64e91-a65d-4887-b842-25af6614d45d.svg',
    retrieved: '2026-11-14',
    width: 182,
    height: 43,
    // Official mark: the logo Brand.dev records for yushin.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 e83289bd29b155ccd997760fc8e576da4c7732e1c5f94416e3477aa0c4fa9ec4, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'swarmer-logo',
    file: '/images/logos/swarmer.svg',
    alt: 'Swarmer chevron mark and wordmark',
    caption: 'Swarmer logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of getswarmer.com',
    sourceUrl: 'https://media.brand.dev/bfaf1101-26f1-4d48-85be-d8f8cbc4f387.svg',
    creator: 'Swarmer',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/bfaf1101-26f1-4d48-85be-d8f8cbc4f387.svg',
    retrieved: '2026-11-14',
    width: 131,
    height: 20,
    // Official mark: the logo Brand.dev records for getswarmer.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 0b633e45fc7a903336c875b6127df4faeeb3d26a58ba26d5a92e3eac657ab984, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'amc-robotics-logo',
    file: '/images/logos/amc-robotics.png',
    alt: 'AMC Robotics wordmark',
    caption: 'AMC Robotics logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of amcx.ai',
    sourceUrl: 'https://media.brand.dev/373719b0-14fd-4cb9-99ef-0c5d14b77196.png',
    creator: 'AMC Robotics',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/373719b0-14fd-4cb9-99ef-0c5d14b77196.png',
    retrieved: '2026-11-14',
    width: 840,
    height: 210,
    // Official mark: the logo Brand.dev records for amcx.ai, fetched from its file URL above and saved
    // unchanged. File SHA-256 a350d9b7c43ca8140a79e504b3f9af0580e2d083fd57c022c72508a3246ae323, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'kaierda-logo',
    file: '/images/logos/kaierda.png',
    alt: 'Kaierda wordmark with its Chinese name',
    caption: 'Kaierda logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of kaierda.cn',
    sourceUrl: 'https://media.brand.dev/479f5aa6-cdf4-4d32-aa91-69c51dda3bb1.png',
    creator: 'Kaierda',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/479f5aa6-cdf4-4d32-aa91-69c51dda3bb1.png',
    retrieved: '2026-11-14',
    width: 142,
    height: 52,
    // Official mark: the logo Brand.dev records for kaierda.cn, fetched from its file URL above and saved
    // unchanged. File SHA-256 987e7205621fa740e72ca6e6b52d21c19446b8f4c4e0398beef5927932b1c02a, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'edge-medical-logo',
    file: '/images/logos/edge-medical.svg',
    alt: 'Edge Medical wordmark',
    caption: 'Edge Medical logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of edgemed.cn',
    sourceUrl: 'https://media.brand.dev/372ecca2-b498-49c0-b7f3-6ea3b61ba2e8.svg',
    creator: 'Edge Medical',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/372ecca2-b498-49c0-b7f3-6ea3b61ba2e8.svg',
    retrieved: '2026-11-14',
    width: 842,
    height: 317,
    // Official mark: the logo Brand.dev records for edgemed.cn, fetched from its file URL above and saved
    // unchanged. File SHA-256 716cfd0b7f56912a6ff4c04a5fd199b266365e171b91fdbf012ab63ecbfbbe26, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'eacon-logo',
    file: '/images/logos/eacon.png',
    alt: 'EACON wordmark with its Chinese name',
    caption: 'EACON logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of eacon.com',
    sourceUrl: 'https://media.brand.dev/b78b9a6d-4818-4c06-ad81-fd09e5c2ec1e.png',
    creator: 'EACON',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/b78b9a6d-4818-4c06-ad81-fd09e5c2ec1e.png',
    retrieved: '2026-11-14',
    width: 1949,
    height: 198,
    // Official mark: the logo Brand.dev records for eacon.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 3f9c3f63dd9e95da77e2ca597d9a228a3c6ecc286711286bb71232caa842266d, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'excelland-robotics-logo',
    file: '/images/logos/excelland-robotics.svg',
    alt: 'Excelland Robotics mark and wordmark with its Chinese name',
    caption: 'Excelland Robotics logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of uditech.com.cn',
    sourceUrl: 'https://media.brand.dev/eb5418f4-9976-4eff-ab08-2f9f93b0c6d7.svg',
    creator: 'Excelland Robotics',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/eb5418f4-9976-4eff-ab08-2f9f93b0c6d7.svg',
    retrieved: '2026-11-14',
    width: 131,
    height: 33,
    // Official mark: the logo Brand.dev records for uditech.com.cn, fetched from its file URL above and saved
    // unchanged. File SHA-256 14e71031d8c709eec25f062c8c32c0274fa793c9f0efc94a6aa39bbbd0bc4cf3, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'bigwave-robotics-logo',
    file: '/images/logos/bigwave-robotics.png',
    alt: 'Bigwave Robotics wave mark and wordmark',
    caption: 'Bigwave Robotics logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of bigwaverobotics.com',
    sourceUrl: 'https://media.brand.dev/5e89726a-4aba-476b-97b3-861a915f8d8c.png',
    creator: 'Bigwave Robotics',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/5e89726a-4aba-476b-97b3-861a915f8d8c.png',
    retrieved: '2026-11-14',
    width: 596,
    height: 78,
    // Official mark: the logo Brand.dev records for bigwaverobotics.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 500853dd80e9d447fa06ed5eae1fd12432f234fa7d9386ad8a75030e6652dbf9, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'onerobotics-logo',
    file: '/images/logos/onerobotics.svg',
    alt: 'OneRobotics wordmark',
    caption: 'OneRobotics logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of onerobot.com',
    sourceUrl: 'https://media.brand.dev/6d179368-a1b6-4c30-a574-ce1451573975.svg',
    creator: 'OneRobotics',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/6d179368-a1b6-4c30-a574-ce1451573975.svg',
    retrieved: '2026-11-14',
    width: 200,
    height: 26,
    // Official mark: the logo Brand.dev records for onerobot.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 367c7655d1d2547188a61ac71418a97ff5a7b45df1630d31cf498739c3adcd28, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'galaxis-logo',
    file: '/images/logos/galaxis.png',
    alt: 'Galaxis wordmark',
    caption: 'Galaxis logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of galaxis-tech.com',
    sourceUrl: 'https://media.brand.dev/3b9c55c8-3754-4079-b24e-9951bcf88a53.png',
    creator: 'Galaxis',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/3b9c55c8-3754-4079-b24e-9951bcf88a53.png',
    retrieved: '2026-11-14',
    width: 279,
    height: 50,
    // Official mark: the logo Brand.dev records for galaxis-tech.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 cb049474e25c812d886723c2055fd4f2d99781fe1c42ecfd74196adc456ee379, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
];

/**
 * Additional marks for named issuers. Those displayed in the IPO or funding
 * tables enter the published credits; the rest stay in the pending registry.
 */
const namedImages: SiteImage[] = [
  {
    id: 'uforce-logo',
    file: '/images/logos/uforce.svg',
    alt: 'UFORCE wordmark',
    caption: 'UFORCE logo from its official website.',
    sourceName: 'UFORCE official website',
    sourceUrl: 'https://cdn.prod.website-files.com/69844f2062f5867ca9e6b409/698f53e17f90be48592bf827_UFORCE.svg',
    creator: 'UFORCE',
    licence: 'unlicensed',
    licenceUrl: 'https://www.uforce.com/',
    retrieved: '2026-11-20',
    width: 293,
    height: 100,
  },
  {
    id: 'warp-sciences-logo',
    file: '/images/logos/warp-sciences.svg',
    alt: 'Warp Sciences wordmark',
    caption: 'Warp Sciences logo from its official website.',
    sourceName: 'Warp Sciences official website',
    sourceUrl: 'https://warp.xyz/',
    creator: 'Warp Sciences',
    licence: 'unlicensed',
    licenceUrl: 'https://warp.xyz/',
    retrieved: '2026-11-20',
    width: 2832,
    height: 912,
  },
  {
    id: 'gravis-robotics-logo',
    file: '/images/logos/gravis-robotics.png',
    alt: 'Gravis Robotics G symbol',
    caption: 'Gravis Robotics logo from its official website.',
    sourceName: 'Gravis Robotics official website',
    sourceUrl: 'https://cdn.prod.website-files.com/69016a2658231cb1d2ca58c5/691a4736270d41db65a20b9a_favicon_square.png',
    creator: 'Gravis Robotics',
    licence: 'unlicensed',
    licenceUrl: 'https://gravisrobotics.com/',
    retrieved: '2026-11-20',
    width: 32,
    height: 32,
  },
  {
    id: 'icon-construction-logo',
    file: '/images/logos/icon-construction.svg',
    alt: 'ICON wordmark with a dot above the O',
    caption: 'ICON logo from its official website.',
    sourceName: 'ICON official website',
    sourceUrl: 'https://cdn.prod.website-files.com/696aa403bbe74c1adbd1ed11/699f0ca2d77efb26e8acb8ad_ison%20logo%20white.svg',
    creator: 'ICON',
    licence: 'unlicensed',
    licenceUrl: 'https://www.iconbuild.com/',
    retrieved: '2026-11-20',
    width: 60,
    height: 32,
  },
  {
    id: 'reliable-robotics-logo',
    file: '/images/logos/reliable-robotics.svg',
    alt: 'Reliable Robotics symbol and wordmark',
    caption: 'Reliable Robotics logo from its official website.',
    sourceName: 'Reliable Robotics official website',
    sourceUrl: 'https://reliable.co/assets/images/reliable-logo-lockup.svg',
    creator: 'Reliable Robotics',
    licence: 'unlicensed',
    licenceUrl: 'https://reliable.co/',
    retrieved: '2026-11-20',
    width: 140,
    height: 40,
  },
  {
    id: 'dream-labs-logo',
    file: '/images/logos/dream-labs.svg',
    alt: 'Dream Labs cloud symbol',
    caption: 'Dream Labs logo from its official website.',
    sourceName: 'Dream Labs official website',
    sourceUrl: 'https://dreamlabs.ai/brand/favicon.svg',
    creator: 'Dream Labs',
    licence: 'unlicensed',
    licenceUrl: 'https://dreamlabs.ai/',
    retrieved: '2026-11-20',
    width: 334,
    height: 334,
  },
  {
    id: 'veeda-ai-logo',
    file: '/images/logos/veeda-ai.svg',
    alt: 'Veeda AI angular symbol',
    caption: 'Veeda AI logo from its official website.',
    sourceName: 'Veeda AI official website',
    sourceUrl: 'https://www.veeda.ai/favicon.svg',
    creator: 'Veeda AI',
    licence: 'unlicensed',
    licenceUrl: 'https://veeda.ai/',
    retrieved: '2026-11-20',
    width: 64,
    height: 64,
  },
  {
    id: 'enigma-robotics-logo',
    file: '/images/logos/enigma-robotics.svg',
    alt: 'Enigma wordmark',
    caption: 'Enigma logo from its official website.',
    sourceName: 'Enigma official website',
    sourceUrl: 'https://www.enigma.inc/',
    creator: 'Enigma',
    licence: 'unlicensed',
    licenceUrl: 'https://www.enigma.inc/',
    retrieved: '2026-11-20',
    width: 384,
    height: 80,
  },
  {
    id: 'poseidon-aerospace-logo',
    file: '/images/logos/poseidon-aerospace.svg',
    alt: 'Poseidon Aerospace geometric symbol',
    caption: 'Poseidon Aerospace logo from its official website.',
    sourceName: 'Poseidon Aerospace official website',
    sourceUrl: 'https://poseidonaero.com/',
    creator: 'Poseidon Aerospace',
    licence: 'unlicensed',
    licenceUrl: 'https://poseidonaero.com/',
    retrieved: '2026-11-20',
    width: 188,
    height: 83,
  },
  {
    id: 'standard-robots-logo',
    file: '/images/logos/standard-robots.png',
    alt: 'Standard Robots symbol and wordmark',
    caption: 'Standard Robots logo from its official website.',
    sourceName: 'Standard Robots official website',
    sourceUrl: 'https://en.standard-robots.com/',
    creator: 'Standard Robots',
    licence: 'unlicensed',
    licenceUrl: 'https://en.standard-robots.com/',
    retrieved: '2026-11-20',
    width: 173,
    height: 40,
  },
  {
    id: 'atomrobot-logo',
    file: '/images/logos/atomrobot.png',
    alt: 'Atomrobot English and Chinese wordmark',
    caption: 'Tianjin Chenxing Technology (Atomrobot) logo from its official website.',
    sourceName: 'Tianjin Chenxing Technology (Atomrobot) official website',
    sourceUrl: 'https://www.atomrobot.com/',
    creator: 'Tianjin Chenxing Technology (Atomrobot)',
    licence: 'unlicensed',
    licenceUrl: 'https://www.atomrobot.com/',
    retrieved: '2026-11-20',
    width: 595,
    height: 296,
  },
  {
    id: 'changzhou-microintelligence-logo',
    file: '/images/logos/changzhou-microintelligence.png',
    alt: 'Micro-Intelligence Chinese and English wordmark',
    caption: 'Changzhou Microintelligence logo from its official website.',
    sourceName: 'Changzhou Microintelligence official website',
    sourceUrl: 'https://www.microintelligence.com.cn/_nuxt/img/ee463d9.png',
    creator: 'Changzhou Microintelligence',
    licence: 'unlicensed',
    licenceUrl: 'https://www.microintelligence.com.cn/home',
    retrieved: '2026-11-20',
    width: 350,
    height: 80,
  },
  {
    id: 'al-robot-logo',
    file: '/images/logos/al-robot.png',
    alt: 'AL.Robot wordmark and symbol',
    caption: 'AL Robot logo from its official website.',
    sourceName: 'AL Robot official website',
    sourceUrl: 'https://al-robot.com/cdn/shop/files/AL-Robots_Logo_Horizontal.png?v=1718740411&width=255',
    creator: 'AL Robot',
    licence: 'unlicensed',
    licenceUrl: 'https://www.al-robot.com/',
    retrieved: '2026-11-20',
    width: 255,
    height: 96,
  },
  {
    id: 'firefly-robotics-logo',
    file: '/images/logos/firefly-robotics.png',
    alt: 'FireFly Robotics wordmark and firefly symbol',
    caption: 'FireFly Robotics logo from its official website.',
    sourceName: 'FireFly Robotics official website',
    sourceUrl: 'https://fireflyautomatix.com/wp-content/uploads/2026/06/FireFly-Robotics-Logo_Blue-Yellow_No-Bg-Square_675x675.png',
    creator: 'FireFly Robotics',
    licence: 'unlicensed',
    licenceUrl: 'https://fireflyautomatix.com/',
    retrieved: '2026-11-20',
    width: 675,
    height: 675,
  },
  {
    id: 'garuda-aerospace-logo',
    file: '/images/logos/garuda-aerospace.svg',
    alt: 'Garuda Aerospace symbol and wordmark',
    caption: 'Garuda Aerospace logo from its official website.',
    sourceName: 'Garuda Aerospace official website',
    sourceUrl: 'https://www.garudaaerospace.com/images/logo.svg',
    creator: 'Garuda Aerospace',
    licence: 'unlicensed',
    licenceUrl: 'https://www.garudaaerospace.com/',
    retrieved: '2026-11-20',
    width: 123,
    height: 47,
  },
  {
    id: 'aitmc-ventures-logo',
    file: '/images/logos/aitmc-ventures.png',
    alt: 'AVPL International wordmark and drone symbol',
    caption: 'AITMC Ventures (AVPL International) logo from its official website.',
    sourceName: 'AITMC Ventures (AVPL International) official website',
    sourceUrl: 'https://avplinternational.com/AVPL%20Logo%20White.png',
    creator: 'AITMC Ventures (AVPL International)',
    licence: 'unlicensed',
    licenceUrl: 'https://avplinternational.com/',
    retrieved: '2026-11-20',
    width: 3013,
    height: 704,
  },
  {
    id: 'wb-electronics-logo',
    file: '/images/logos/wb-electronics.png',
    alt: 'WB Electronics subsidiary wordmark and WB Group signature',
    caption: 'WB Electronics logo from its official website.',
    sourceName: 'WB Electronics official website',
    sourceUrl: 'https://www.wbgroup.pl/app/uploads/2017/06/wb_electronics_logorgb.png',
    creator: 'WB Electronics',
    licence: 'unlicensed',
    licenceUrl: 'https://www.wbgroup.pl/en/wb-electronics/',
    retrieved: '2026-11-20',
    width: 4023,
    height: 834,
  },
  {
    id: 'brightai-logo',
    file: '/images/logos/brightai.svg',
    alt: 'BrightAI star and wordmark',
    caption: 'BrightAI logo from its official website, used on the market pages.',
    sourceName: 'BrightAI official website',
    sourceUrl: 'https://www.bright.ai/',
    creator: 'BrightAI',
    licence: 'unlicensed',
    licenceUrl: 'https://www.bright.ai/',
    retrieved: '2026-11-20',
    width: 1223,
    height: 260,
  },
  {
    id: 'cornerstone-robotics-logo',
    file: '/images/logos/cornerstone-robotics.png',
    alt: 'Cornerstone Robotics symbol and English wordmark',
    caption: 'Cornerstone Robotics logo from its official website, used on the market pages.',
    sourceName: 'Cornerstone Robotics official website',
    sourceUrl: 'https://www.csrbtx.com/logo/csr-logo-en-brand.png',
    creator: 'Cornerstone Robotics',
    licence: 'unlicensed',
    licenceUrl: 'https://www.csrbtx.com/en/',
    retrieved: '2026-11-20',
    width: 682,
    height: 223,
  },
  {
    id: 'iplusmobot-logo',
    file: '/images/logos/iplusmobot.webp',
    alt: 'IPLUSMOBOT symbol and wordmark',
    caption: 'IPLUSMOBOT logo from its official website, used on the market pages.',
    sourceName: 'IPLUSMOBOT official website',
    sourceUrl: 'https://www.iplusmobot.com/themes/simple/img/logo.webp',
    creator: 'IPLUSMOBOT',
    licence: 'unlicensed',
    licenceUrl: 'https://www.iplusmobot.com/',
    retrieved: '2026-11-20',
    width: 204,
    height: 30,
  },
  {
    id: 'megarobo-logo',
    file: '/images/logos/megarobo.svg',
    alt: 'MegaRobo angular M symbol',
    caption: 'MegaRobo logo from its official website, used on the market pages.',
    sourceName: 'MegaRobo official website',
    sourceUrl: 'https://en.megarobo.com/assets/addons/cms/frontend/img/logo2.svg',
    creator: 'MegaRobo',
    licence: 'unlicensed',
    licenceUrl: 'https://en.megarobo.com/',
    retrieved: '2026-11-20',
    width: 30,
    height: 30,
  },
  {
    id: 'remedy-robotics-logo',
    file: '/images/logos/remedy-robotics.svg',
    alt: 'Remedy Robotics symbol and wordmark',
    caption: 'Remedy Robotics logo from its official website, used on the market pages.',
    sourceName: 'Remedy Robotics official website',
    sourceUrl: 'https://www.remedyrobotics.com/',
    creator: 'Remedy Robotics',
    licence: 'unlicensed',
    licenceUrl: 'https://www.remedyrobotics.com/',
    retrieved: '2026-11-20',
    width: 284,
    height: 42,
  },
  {
    id: 'sudo-technology-logo',
    file: '/images/logos/sudo-technology.svg',
    alt: 'Sudo hash symbol and wordmark',
    caption: 'Sudo Technology logo from its official website, used on the market pages.',
    sourceName: 'Sudo Technology official website',
    sourceUrl: 'https://assets.sudoai.cc/site/sudoai/logo.svg',
    creator: 'Sudo Technology',
    licence: 'unlicensed',
    licenceUrl: 'https://www.sudo.ai/',
    retrieved: '2026-11-20',
    width: 84,
    height: 24,
  },
  {
    // The issuer PNG was losslessly deinterlaced; all decoded RGBA pixels are identical.
    id: 'topstar-logo',
    file: '/images/logos/topstar.png',
    alt: 'Topstar wordmark',
    caption: 'Topstar Technology logo from its official website, used on the market pages.',
    sourceName: 'Topstar Technology official website',
    sourceUrl: 'https://www.topstarmachine.com/wp-content/uploads/2026/07/Topstar-logo.png',
    creator: 'Topstar Technology',
    licence: 'unlicensed',
    licenceUrl: 'https://www.topstarmachine.com/',
    retrieved: '2026-11-20',
    width: 4881,
    height: 991,
  },

  {
    id: 'keyence-logo',
    file: '/images/logos/keyence.svg',
    alt: 'Keyence wordmark',
    caption: 'Keyence logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of keyence.com',
    sourceUrl: 'https://media.brand.dev/2d754d2a-638a-4c75-ad2d-192f43e5d1a9.svg',
    creator: 'Keyence',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/2d754d2a-638a-4c75-ad2d-192f43e5d1a9.svg',
    retrieved: '2026-11-14',
    width: 91,
    height: 16,
    // Official mark: the logo Brand.dev records for keyence.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 0ccd044c487892468ea7423789da3e64afc7b82418b95f2c386fdc67a9343eec, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'foxconn-logo',
    file: '/images/logos/foxconn.svg',
    alt: 'Foxconn H mark and wordmark with its Chinese name',
    caption: 'Foxconn logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of foxconn.com',
    sourceUrl: 'https://media.brand.dev/762ad498-119b-481c-8b51-f06e246406bf.svg',
    creator: 'Foxconn',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/762ad498-119b-481c-8b51-f06e246406bf.svg',
    retrieved: '2026-11-14',
    width: 128,
    height: 26,
    // Official mark: the logo Brand.dev records for foxconn.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 d82b49e8f424c2604117307a1ae71dd99fa6089f3e85ec615e0956ca0ccfb3c2, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'sysmex-logo',
    file: '/images/logos/sysmex.png',
    alt: 'Sysmex mark and wordmark with its line',
    caption: 'Sysmex logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of sysmex.com',
    sourceUrl: 'https://media.brand.dev/e8941572-9a72-402a-b3e7-033d75547ff1.png',
    creator: 'Sysmex',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/e8941572-9a72-402a-b3e7-033d75547ff1.png',
    retrieved: '2026-11-14',
    width: 2437,
    height: 434,
    // Official mark: the logo Brand.dev records for sysmex.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 89078f84846348cd4492bf3bef401eb91aff2fa9e1d04ab3d7f00377b27ad268, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'tuopu-logo',
    file: '/images/logos/tuopu.png',
    alt: 'Tuopu mark and wordmark with its Chinese name',
    caption: 'Tuopu logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of tuopu.com',
    sourceUrl: 'https://media.brand.dev/ccbb4e1d-71e0-4efe-b429-70df499415d4.png',
    creator: 'Tuopu',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/ccbb4e1d-71e0-4efe-b429-70df499415d4.png',
    retrieved: '2026-11-14',
    width: 392,
    height: 72,
    // Official mark: the logo Brand.dev records for tuopu.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 cb9d293f0555fc6c8f818a65bd3a332d589bbf23648a61e3a13c3ffea5b4521a, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'leadshine-logo',
    file: '/images/logos/leadshine.png',
    alt: 'Leadshine round mark and wordmark',
    caption: 'Leadshine logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of leadshine.com',
    sourceUrl: 'https://media.brand.dev/122e8dfd-6a25-4bdf-92ee-97ae4a71450c.png',
    creator: 'Leadshine',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/122e8dfd-6a25-4bdf-92ee-97ae4a71450c.png',
    retrieved: '2026-11-14',
    width: 828,
    height: 200,
    // Official mark: the logo Brand.dev records for leadshine.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 58bc0adaaa5f2da8a82a410dbe9f5c161fb8df30525fca09aaf30f6ad6397590, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'cognex-logo',
    file: '/images/logos/cognex.png',
    alt: 'Cognex wordmark',
    caption: 'Cognex logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of cognex.com',
    sourceUrl: 'https://media.brand.dev/96035c1a-778e-46ba-87cb-daa1000e7ffc.png',
    creator: 'Cognex',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/96035c1a-778e-46ba-87cb-daa1000e7ffc.png',
    retrieved: '2026-11-14',
    width: 293,
    height: 36,
    // Official mark: the logo Brand.dev records for cognex.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 d95ba1d91e6593e489ce4cdaf704bbe9a34d73b0207d31f7fa9509db28a862e2, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'durr-logo',
    file: '/images/logos/durr.svg',
    alt: 'Dürr boxed wordmark',
    caption: 'Dürr logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of durr.com',
    sourceUrl: 'https://media.brand.dev/340646b9-c3cb-42d2-a496-25604a777f29.svg',
    creator: 'Dürr',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/340646b9-c3cb-42d2-a496-25604a777f29.svg',
    retrieved: '2026-11-14',
    width: 102,
    height: 48,
    // Official mark: the logo Brand.dev records for durr.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 edbf5f1af04973c59963712e3c9fb95d63f53fd15a72b045ddaccb9c5dd4d071, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'accuray-logo',
    file: '/images/logos/accuray.png',
    alt: 'Accuray wordmark',
    caption: 'Accuray logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of accuray.com',
    sourceUrl: 'https://media.brand.dev/46b85e46-cc1d-4af2-9b8c-2d060d79143c.png',
    creator: 'Accuray',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/46b85e46-cc1d-4af2-9b8c-2d060d79143c.png',
    retrieved: '2026-11-14',
    width: 454,
    height: 55,
    // Official mark: the logo Brand.dev records for accuray.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 e8c0f9dbea25d23e465c2aa60fd63f4976d552491bc09e190bd9f151a47a2898, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'hadrian-logo',
    file: '/images/logos/hadrian.svg',
    alt: 'Hadrian wordmark',
    caption: 'Hadrian logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of hadrian.co',
    sourceUrl: 'https://media.brand.dev/8fd96b7d-6dd3-453c-8066-c01f13637cf6.svg',
    creator: 'Hadrian',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/8fd96b7d-6dd3-453c-8066-c01f13637cf6.svg',
    retrieved: '2026-11-14',
    width: 174,
    height: 29,
    // Official mark: the logo Brand.dev records for hadrian.co, fetched from its file URL above and saved
    // unchanged. File SHA-256 a00e2533a07b3b9d7cbc6ed9616042aea86d9fce3b1826cb8142891222e38961, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'shield-ai-logo',
    file: '/images/logos/shield-ai.svg',
    alt: 'Shield AI mark and wordmark',
    caption: 'Shield AI logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of shield.ai',
    sourceUrl: 'https://media.brand.dev/f5d0609d-8b65-4b4f-bf1c-93e5523c7c8f.svg',
    creator: 'Shield AI',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/f5d0609d-8b65-4b4f-bf1c-93e5523c7c8f.svg',
    retrieved: '2026-11-14',
    width: 137,
    height: 30,
    // Official mark: the logo Brand.dev records for shield.ai, fetched from its file URL above and saved
    // unchanged. File SHA-256 bf97d017d4025b67c627bfa7e8ac87b2eb4c9347854fc0619568d97b0783427f, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'mach-industries-logo',
    file: '/images/logos/mach-industries.svg',
    alt: 'Mach Industries wordmark',
    caption: 'Mach Industries logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of machindustries.com',
    sourceUrl: 'https://media.brand.dev/422a77a4-f6a5-4266-908d-4df03104ba4b.svg',
    creator: 'Mach Industries',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/422a77a4-f6a5-4266-908d-4df03104ba4b.svg',
    retrieved: '2026-11-14',
    width: 84,
    height: 26,
    // Official mark: the logo Brand.dev records for machindustries.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 d62f451ddc19e80ae3b73f78b9ac98e7a93924ca9943d35b94b61f2f68db326f, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'tekever-logo',
    file: '/images/logos/tekever.png',
    alt: 'TEKEVER wordmark',
    caption: 'TEKEVER logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of tekever.com',
    sourceUrl: 'https://media.brand.dev/17f4a47e-3e54-4b5b-a784-e01bba6de25b.png',
    creator: 'TEKEVER',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/17f4a47e-3e54-4b5b-a784-e01bba6de25b.png',
    retrieved: '2026-11-14',
    width: 1149,
    height: 162,
    // Official mark: the logo Brand.dev records for tekever.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 fb7d0d6767104ab88341c1b948013e17d5a2da80694a392c02469c66f1e2bc5b, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'path-robotics-logo',
    file: '/images/logos/path-robotics.svg',
    alt: 'Path Robotics P mark and wordmark',
    caption: 'Path Robotics logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of path-robotics.com',
    sourceUrl: 'https://media.brand.dev/ad77fe37-21ad-4d7a-a932-50ccf06d5809.svg',
    creator: 'Path Robotics',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/ad77fe37-21ad-4d7a-a932-50ccf06d5809.svg',
    retrieved: '2026-11-14',
    width: 337,
    height: 59,
    // Official mark: the logo Brand.dev records for path-robotics.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 98cea5bbcfadae074110c0814e819bfb53a5541fb09c2a944a7be0efe017a660, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'moove-logo',
    file: '/images/logos/moove.svg',
    alt: 'Moove company wordmark',
    caption: 'Moove logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of moove.io',
    sourceUrl: 'https://media.brand.dev/5deb5e4a-6073-4963-9d3d-2fc3f5a21f8b.svg',
    creator: 'Moove',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/5deb5e4a-6073-4963-9d3d-2fc3f5a21f8b.svg',
    retrieved: '2026-11-14',
    width: 467,
    height: 77,
    // Official mark: the logo Brand.dev records for moove.io, fetched from its file URL above and saved
    // unchanged. File SHA-256 455a2c07b8911ac3095cc5c0dad49888d95dbd487fbaa3ebaa9a56ff447d250b, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'neros-logo',
    file: '/images/logos/neros.svg',
    alt: 'Neros N mark and wordmark',
    caption: 'Neros logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of neros.tech',
    sourceUrl: 'https://media.brand.dev/fcdd8720-8245-4be4-ab31-04ae570aac03.svg',
    creator: 'Neros',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/fcdd8720-8245-4be4-ab31-04ae570aac03.svg',
    retrieved: '2026-11-14',
    width: 110,
    height: 25,
    // Official mark: the logo Brand.dev records for neros.tech, fetched from its file URL above and saved
    // unchanged. File SHA-256 5bab4f01978af57e258af6b6b911c9ec7b3a1377ebf691c8b73e50471ee7768b, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'autonomous-solutions-logo',
    file: '/images/logos/autonomous-solutions.png',
    alt: 'ASI mark and wordmark',
    caption: 'Autonomous Solutions logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of asirobots.com',
    sourceUrl: 'https://media.brand.dev/a52ff70f-89d3-4d90-aa40-1e8a69d78399.png',
    creator: 'Autonomous Solutions',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/a52ff70f-89d3-4d90-aa40-1e8a69d78399.png',
    retrieved: '2026-11-14',
    width: 1070,
    height: 512,
    // Official mark: the logo Brand.dev records for asirobots.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 ab5618c413ca01abfd51d6dfde172f79af8d6271d3f395a499d9b733a253882c, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'gatik-logo',
    file: '/images/logos/gatik.svg',
    alt: 'Gatik mark and wordmark',
    caption: 'Gatik logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of gatik.ai',
    sourceUrl: 'https://media.brand.dev/1bda0d70-8fbe-4a62-9f28-f0daf3b9e879.svg',
    creator: 'Gatik',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/1bda0d70-8fbe-4a62-9f28-f0daf3b9e879.svg',
    retrieved: '2026-11-14',
    width: 170,
    height: 43,
    // Official mark: the logo Brand.dev records for gatik.ai, fetched from its file URL above and saved
    // unchanged. File SHA-256 54cd8457e6cd0db732b83a38c1dd16adbf4e82cbdf02257273ee34143ca6d6ce, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'lyte-logo',
    file: '/images/logos/lyte.png',
    alt: 'Lyte triangle mark and wordmark',
    caption: 'Lyte logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of lyte.ai',
    sourceUrl: 'https://media.brand.dev/5c413d1f-4f98-4e1f-ba5c-dec61baed3f5.png',
    creator: 'Lyte',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/5c413d1f-4f98-4e1f-ba5c-dec61baed3f5.png',
    retrieved: '2026-11-14',
    width: 915,
    height: 512,
    // Official mark: the logo Brand.dev records for lyte.ai, fetched from its file URL above and saved
    // unchanged. File SHA-256 250a0115a219387f6fc32343c8cf6369662c1458be35fc433571be418b951713, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'sima-ai-logo',
    file: '/images/logos/sima-ai.png',
    alt: 'SiMa.ai mark and wordmark',
    caption: 'SiMa.ai logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of sima.ai',
    sourceUrl: 'https://media.brand.dev/d2bbaf02-5bee-4502-aabd-1d059fb62432.png',
    creator: 'SiMa.ai',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/d2bbaf02-5bee-4502-aabd-1d059fb62432.png',
    retrieved: '2026-11-14',
    width: 1981,
    height: 465,
    // Official mark: the logo Brand.dev records for sima.ai, fetched from its file URL above and saved
    // unchanged. File SHA-256 c586de04e450e4e3c55537e4ff632a56317001b97a61bdb73a1296714d6bd56c, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'mmi-logo',
    file: '/images/logos/mmi.png',
    alt: 'MMI mark and wordmark with its line',
    caption: 'Medical Microinstruments logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of mmimicro.com',
    sourceUrl: 'https://media.brand.dev/bc7057fc-96ca-4fea-9651-fb8e6133d372.png',
    creator: 'Medical Microinstruments',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/bc7057fc-96ca-4fea-9651-fb8e6133d372.png',
    retrieved: '2026-11-14',
    width: 810,
    height: 349,
    // Official mark: the logo Brand.dev records for mmimicro.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 ac045ae287c73e2861898e768de28ce176167ff04c069afa64622c7235509d7a, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'parallel-systems-logo',
    file: '/images/logos/parallel-systems.svg',
    alt: 'Parallel wordmark',
    caption: 'Parallel Systems logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of moveparallel.com',
    sourceUrl: 'https://media.brand.dev/bf238748-be8c-49f0-8c52-0774fe91f742.svg',
    creator: 'Parallel Systems',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/bf238748-be8c-49f0-8c52-0774fe91f742.svg',
    retrieved: '2026-11-14',
    width: 223,
    height: 53,
    // Official mark: the logo Brand.dev records for moveparallel.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 deca5b10260f76e5cc09249f6f06d4bc2226f9edbcca77b07d1ea53bd02cea07, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'genrobot-logo',
    file: '/images/logos/genrobot.png',
    alt: 'GenRobot.AI wordmark',
    caption: 'GenRobot.AI logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of genrobot.ai',
    sourceUrl: 'https://media.brand.dev/d759028a-b259-4be6-8d69-bb9382ce5c14.png',
    creator: 'GenRobot.AI',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/d759028a-b259-4be6-8d69-bb9382ce5c14.png',
    retrieved: '2026-11-14',
    width: 640,
    height: 74,
    // Official mark: the logo Brand.dev records for genrobot.ai, fetched from its file URL above and saved
    // unchanged. File SHA-256 89f99ca2de5c461f9bd30f2f2321bb0234c3f845b5236b6c224b72ae159b4121, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'multiply-labs-logo',
    file: '/images/logos/multiply-labs.png',
    alt: 'Multiply Labs cube mark and wordmark',
    caption: 'Multiply Labs logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of multiplylabs.com',
    sourceUrl: 'https://media.brand.dev/96598351-770a-49e5-8736-568256ac62a0.png',
    creator: 'Multiply Labs',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/96598351-770a-49e5-8736-568256ac62a0.png',
    retrieved: '2026-11-14',
    width: 2056,
    height: 512,
    // Official mark: the logo Brand.dev records for multiplylabs.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 b5c3c465a350dd33cdb09eae67c9687743a505a2cef2e77d8656aeb03a77ea81, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'mecka-logo',
    file: '/images/logos/mecka.svg',
    alt: 'Mecka square mark and wordmark',
    caption: 'Mecka AI logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of mecka.ai',
    sourceUrl: 'https://media.brand.dev/4fc99a13-653f-4e67-b5bc-1080642ad621.svg',
    creator: 'Mecka AI',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/4fc99a13-653f-4e67-b5bc-1080642ad621.svg',
    retrieved: '2026-11-14',
    width: 568,
    height: 138,
    // Official mark: the logo Brand.dev records for mecka.ai, fetched from its file URL above and saved
    // unchanged. File SHA-256 c9aa08f163979356acbb91fc078b1665edd6dfbb1f01149e04ce2a9b33c66978, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'shuanghuan-logo',
    file: '/images/logos/shuanghuan.png',
    alt: 'Shuanghuan double ring mark and wordmark',
    caption: 'Shuanghuan logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of gearsnet.com',
    sourceUrl: 'https://media.brand.dev/50400879-4be1-4060-87ad-74ad89857b9a.png',
    creator: 'Shuanghuan',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/50400879-4be1-4060-87ad-74ad89857b9a.png',
    retrieved: '2026-11-14',
    width: 204,
    height: 37,
    // Official mark: the logo Brand.dev records for gearsnet.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 f61bcfbad2daf22bacbccf3b82e29e230106bb081a73fedd056425c8a75b78f7, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'zhaowei-logo',
    file: '/images/logos/zhaowei.png',
    alt: 'Zhaowei wordmark with its gear and Chinese name',
    caption: 'Zhaowei logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of szzhaowei.net',
    sourceUrl: 'https://media.brand.dev/1329637e-0860-476b-ba95-26827031673a.png',
    creator: 'Zhaowei',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/1329637e-0860-476b-ba95-26827031673a.png',
    retrieved: '2026-11-14',
    width: 1182,
    height: 153,
    // Official mark: the logo Brand.dev records for szzhaowei.net, fetched from its file URL above and saved
    // unchanged. File SHA-256 6afe85334152b53cdaf063c08108647483c82a11b0fffcf6d88c3ca0df017bad, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'applied-aerospace-defense-logo',
    file: '/images/logos/applied-aerospace-defense.webp',
    alt: 'Applied Aerospace & Defense star mark and wordmark',
    caption: 'Applied Aerospace & Defense logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of applied-ad.com',
    sourceUrl: 'https://media.brand.dev/77f37087-7a39-4467-8936-d932163eba2f.webp',
    creator: 'Applied Aerospace & Defense',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/77f37087-7a39-4467-8936-d932163eba2f.webp',
    retrieved: '2026-11-14',
    width: 1437,
    height: 512,
    // Official mark: the logo Brand.dev records for applied-ad.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 77dcf44a08c295cb267cca979a0413ecd7a20252eadda1b1c16328fe49d34c79, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'maven-robotics-logo',
    file: '/images/logos/maven-robotics.svg',
    alt: 'Maven company wordmark',
    caption: 'Maven Robotics logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of mavenrobotics.ai',
    sourceUrl: 'https://media.brand.dev/59c8cb2b-be89-4c08-97c0-3b76014fec55.svg',
    creator: 'Maven Robotics',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/59c8cb2b-be89-4c08-97c0-3b76014fec55.svg',
    retrieved: '2026-11-14',
    width: 1708,
    height: 781,
    // Official mark: the logo Brand.dev records for mavenrobotics.ai, fetched from its file URL above and saved
    // unchanged. File SHA-256 0983c01fc68440efd85e48ef171914844ab6c8896bc32d83aed993c6185ebba8, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'watney-logo',
    file: '/images/logos/watney.svg',
    alt: 'Watney wordmark',
    caption: 'Watney logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of watney.com',
    sourceUrl: 'https://media.brand.dev/8655e0d2-6c68-4ed5-9e7a-68b3acf8b4bd.svg',
    creator: 'Watney',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/8655e0d2-6c68-4ed5-9e7a-68b3acf8b4bd.svg',
    retrieved: '2026-11-14',
    width: 130,
    height: 16,
    // Official mark: the logo Brand.dev records for watney.com, fetched from its file URL above and saved
    // unchanged. File SHA-256 c8a6a0933edd57632b1b1811f3e0b25ea2176246f23f032147b72b2ed8f264df, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
  {
    id: 'atoms-logo',
    file: '/images/logos/atoms.svg',
    alt: 'Atoms company wordmark',
    caption: 'Atoms logo from its brand profile, used on the market pages.',
    sourceName: 'Brand.dev profile of atoms.co',
    sourceUrl: 'https://media.brand.dev/2be0a95b-1c9e-40c1-a946-72eec00dda4b.svg',
    creator: 'Atoms',
    licence: 'unlicensed',
    licenceUrl: 'https://media.brand.dev/2be0a95b-1c9e-40c1-a946-72eec00dda4b.svg',
    retrieved: '2026-11-14',
    width: 537,
    height: 74,
    // Official mark: the logo Brand.dev records for atoms.co, fetched from its file URL above and saved
    // unchanged. File SHA-256 583574ad607d96a52c8d532e735eef1e4cb38d80900938b08fc486e63b780b0a, retrieved 2026-11-14.
    // No reuse grant named; recorded as unlicensed rather than inventing a Commons licence.
  },
];

// A mark belongs on /credits as soon as a published table draws it.
const tableMarks = new Set(marketTableLogoIds());
export const LOGO_IMAGES = [...mapImages, ...namedImages.filter((image) => tableMarks.has(image.id))];
export const PENDING_LOGO_IMAGES = namedImages.filter((image) => !tableMarks.has(image.id));
