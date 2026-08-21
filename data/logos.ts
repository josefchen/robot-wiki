/**
 * Slim market-map logo lookup.
 *
 * CompanyLogo is a client component on /market-map. Importing data/images.ts
 * would ship the whole image registry (article photographs included) into
 * that chunk. This module carries only the fields the mark needs: file path
 * and intrinsic size. Provenance stays in data/logo-images.ts and is
 * concatenated into IMAGES for /credits and the validator.
 */
export type CompanyLogoAsset = {
  file: string;
  width: number;
  height: number;
};

const COMPANY_LOGOS: Record<string, CompanyLogoAsset> = {
  'physical-intelligence-logo': { file: '/images/logos/physical-intelligence.png', width: 200, height: 200 },
  'covariant-logo': { file: '/images/logos/covariant.png', width: 2000, height: 832 },
  'nvidia-logo': { file: '/images/logos/nvidia.svg', width: 630, height: 118 },
  'hugging-face-logo': { file: '/images/logos/hugging-face.svg', width: 963, height: 256 },
  'figure-ai-logo': { file: '/images/logos/figure-ai.svg', width: 512, height: 512 },
  'agility-robotics-logo': { file: '/images/logos/agility-robotics.svg', width: 724, height: 164 },
  'tesla-logo': { file: '/images/logos/tesla.svg', width: 279, height: 360 },
  'unitree-logo': { file: '/images/logos/unitree.svg', width: 512, height: 115 },
  'ubtech-logo': { file: '/images/logos/ubtech.svg', width: 512, height: 127 },
  'neura-robotics-logo': { file: '/images/logos/neura-robotics.svg', width: 184, height: 22 },
  'wandercraft-logo': { file: '/images/logos/wandercraft.svg', width: 512, height: 93 },
  'rainbow-robotics-logo': { file: '/images/logos/rainbow-robotics.png', width: 1772, height: 540 },
  'berkshire-grey-logo': { file: '/images/logos/berkshire-grey.svg', width: 135, height: 32 },
  'amazon-robotics-logo': { file: '/images/logos/amazon-robotics.svg', width: 585, height: 182 },
  'bedrock-robotics-logo': { file: '/images/logos/bedrock-robotics.svg', width: 3274, height: 437 },
  'intuitive-surgical-logo': { file: '/images/logos/intuitive-surgical.svg', width: 173, height: 69 },
  'cmr-surgical-logo': { file: '/images/logos/cmr-surgical.png', width: 225, height: 225 },
  'nuro-logo': { file: '/images/logos/nuro.svg', width: 751, height: 214 },
  'irobot-logo': { file: '/images/logos/irobot.svg', width: 1024, height: 203 },
  'harmonic-drive-logo': { file: '/images/logos/harmonic-drive.svg', width: 1024, height: 323 },
  'nabtesco-logo': { file: '/images/logos/nabtesco.svg', width: 310, height: 58 },
  'wonik-logo': { file: '/images/logos/wonik.png', width: 2330, height: 1800 },
  'openai-logo': { file: '/images/logos/openai.svg', width: 512, height: 138 },
  'meta-logo': { file: '/images/logos/meta.svg', width: 948, height: 191 },
  'switchbot-logo': { file: '/images/logos/switchbot.png', width: 120, height: 26 },
  'hanson-robotics-logo': { file: '/images/logos/hanson-robotics.png', width: 1800, height: 431 },
  'starship-logo': { file: '/images/logos/starship.svg', width: 112, height: 17 },
  'pollen-robotics-logo': { file: '/images/logos/pollen-robotics.svg', width: 512, height: 91 },
  'anduril-logo': { file: '/images/logos/anduril.svg', width: 546, height: 100 },
  'abb-logo': { file: '/images/logos/abb.svg', width: 512, height: 203 },
  'mitsubishi-logo': { file: '/images/logos/mitsubishi.svg', width: 850, height: 733 },
  'monarch-tractor-logo': { file: '/images/logos/monarch-tractor.png', width: 450, height: 336 },
};

/** Look up the plotted mark; undefined for an unregistered logo id. */
export function getCompanyLogo(id: string): CompanyLogoAsset | undefined {
  return COMPANY_LOGOS[id];
}

export function companyLogoIds(): string[] {
  return Object.keys(COMPANY_LOGOS);
}
