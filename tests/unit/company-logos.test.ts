import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  COMPANY_LOGO_IDS,
  NO_LOGO,
  companyLogo,
  logoIdFor,
  normalizeCompanyName,
} from '@/data/company-logos';
import { IMAGES } from '@/data/images';
import { LOGO_IMAGES, PENDING_LOGO_IMAGES } from '@/data/logo-images';
import { getCompanyLogo } from '@/data/logos';
import { imageSchema } from '@/data/schemas/image';
import { withheldMark } from '@/lib/market-map-marks';

const repoRoot = join(import.meta.dirname, '../..');

/**
 * Every company the public-companies and funding pages name, spelled as the
 * November 2026 research lists them: the listed companies, the parents left
 * off the scaled map, the debuts, the IPO watch, the AI labs, and the
 * companies behind the 40 largest rounds. Smaller rounds are covered only
 * where the company already has a market-map mark (FUNDING_WITH_MAP_MARKS).
 */
const PAGE_COMPANIES = [
  'Intuitive Surgical',
  'PROCEPT BioRobotics',
  'Stereotaxis',
  'Microbot Medical',
  'SS Innovations International',
  'Stryker',
  'Medtronic',
  'Johnson & Johnson',
  'Zimmer Biomet',
  'Globus Medical',
  'Lifeward',
  'Myomo',
  'Tesla',
  'NVIDIA',
  'Alphabet',
  'Amazon',
  'Teradyne',
  'Rockwell Automation',
  'Symbotic',
  'Serve Robotics',
  'Richtech Robotics',
  'Knightscope',
  'Palladyne AI',
  'Agility Robotics',
  'Ouster',
  'Hesai Group',
  'Aurora Innovation',
  'Pony AI',
  'WeRide',
  'Kodiak AI',
  'Mobileye',
  'EHang',
  'AeroVironment',
  'Kratos Defense',
  'Red Cat Holdings',
  'Ondas Holdings',
  'Unusual Machines',
  'Draganfly',
  'XTEND AI Robotics',
  'Swarmer',
  'Exyn Technologies',
  'AMC Robotics',
  'Nauticus Robotics',
  'Guardforce AI',
  'XPeng',
  'Fanuc',
  'Yaskawa Electric',
  'Kawasaki Heavy Industries',
  'Harmonic Drive Systems',
  'Nabtesco',
  'Daifuku',
  'Omron',
  'Seiko Epson',
  'Yamaha Motor',
  'Nachi-Fujikoshi',
  'Daihen',
  'Mitsubishi Electric',
  'SoftBank Group',
  'Cyberdyne',
  'Doosan Robotics',
  'Rainbow Robotics',
  'Robotis',
  'Hyundai Motor',
  'Samsung Electronics',
  'LG Electronics',
  'Yujin Robot',
  'Robostar',
  'Neuromeka',
  'Curexo',
  'Clobot',
  'Yuil Robotics',
  'T-Robotics',
  'Cosmo Robotics',
  'SPG',
  'Hiwin Technologies',
  'Techman Robot',
  'Unitree Robotics',
  'Leaderdrive',
  'Estun Automation',
  'Efort Intelligent Equipment',
  'Siasun Robot & Automation',
  'Shenzhen Inovance',
  'Midea Group',
  'Roborock',
  'Ecovacs',
  'Tinavi Medical',
  'Orbbec',
  'Yijiahe Technology',
  'Kaierda Welding Robot',
  'Topstar Technology',
  'UBTech Robotics',
  'Dobot',
  'Horizon Robotics',
  'RoboSense',
  'Geek+',
  'Yunji Technology',
  'MicroPort MedBot',
  'OneRobotics',
  'Edge Medical',
  'Huayan Robotics',
  'LDROBOT',
  'Robotphoenix',
  'UISEE Technologies',
  'Seer Robotics',
  'Laifual Drive',
  'Momenta',
  'EACON Group',
  'Rokae Robotics',
  'Mech-Mind Robotics',
  'Excelland Robotics',
  'Direct Drive Tech',
  'Camsense Technologies',
  'Amicro Technology',
  'Galaxis Technology',
  'CiDi',
  'Xiaomi',
  'ABB',
  'Kardex',
  'KION Group',
  'Jungheinrich',
  'AutoStore',
  'Ocado Group',
  'Smith & Nephew',
  'Hexagon',
  'Husqvarna',
  'Exail Technologies',
  'Parrot',
  'ideaForge Technology',
  'Maytronics',
  'Kraken Robotics',
  'FBR',
  'Scott Technology',
  'BRILS',
  'Bigwave Robotics',
  'Yushin',
  'Keyence',
  'SMC',
  'Siemens',
  'Hon Hai Precision (Foxconn)',
  'Sysmex',
  'Renishaw',
  'Schaeffler',
  'Seyond',
  'Minth Group',
  'Zhejiang Sanhua',
  'Ningbo Tuopu',
  'Zhejiang Shuanghuan Driveline',
  'Zhaowei Machinery & Electronics',
  'Leadshine Technology',
  'Keli Sensing',
  'RoboTechnik',
  'Swancor Advanced Materials',
  'Cognex',
  'Dürr',
  'Accuray',
  'Ningbo ZhongDa Leader',
  'Applied Aerospace & Defense',
  'Atoms',
  'Zipline',
  'Hadrian',
  'Shield AI',
  'XPENG robotics business',
  'UFORCE',
  'Mach Industries',
  'Bedrock Robotics',
  'TEKEVER',
  'Agile Robots',
  'D-Robotics',
  'CMR Surgical',
  'Cambridge Aerospace',
  'Path Robotics',
  'Moove',
  'Neros Technologies',
  'Autonomous Solutions (ASI)',
  'Warp Sciences',
  'Gravis Robotics',
  'Gatik',
  'ICON',
  'Lyte',
  'Humanoid (SKL Robotics)',
  'SiMa.ai',
  'Eka Robotics',
  'Sudo Technology (Suduo)',
  'MMI (Medical Microinstruments)',
  'Reliable Robotics',
  'Maven Robotics',
  'Parallel Systems',
  'Foundry Robotics',
  'GenRobot.AI',
  'Veeda AI',
  'Dream Labs',
  'Watney',
  'Multiply Labs',
  'Tutor Intelligence',
  'Enigma',
  'Poseidon Aerospace',
  'Mecka AI',
  // Debuts, as that table spells them.
  'Estun Automation (H shares)',
  'Zhejiang Galaxis Technology',
  'Amicro Technology (Eeasy Tech)',
  'Unitree Robotics (Yushu Technology)',
  // IPO watch.
  'Hai Robotics Innovation Group Co., Ltd. - W',
  'Standard Robots (Wuxi) Co., Ltd.',
  'Zhejiang IPLUSMOBOT Technology Co., Ltd.',
  'Orbbec Inc. - W',
  'Guangdong Topstar Technology Co., Ltd.',
  'Tianjin Chenxing Technology Co., Ltd. (formerly known as Tianjin Atomrobot Co., Ltd.)',
  'Changzhou Microintelligence',
  'AL Robot',
  'Deep Robotics (Hangzhou Yunshenchu)',
  'Leju Robotics (Leju Intelligent, Shenzhen)',
  'AgiBot',
  'Galbot',
  'X Square Robot',
  'LimX Dynamics',
  'Noetix Robotics (Songyan Power Beijing Technology)',
  'EngineAI',
  'FireFly Robotics',
  'Duke Robotics',
  'Garuda Aerospace',
  'AITMC Ventures',
  'WB Electronics',
  'ABB Robotics (to SoftBank Group)',
  // AI labs beside the listed table.
  'Anthropic, PBC',
  'OpenAI',
];

/** Smaller funding rounds whose company already has a market-map mark. */
const FUNDING_WITH_MAP_MARKS = [
  'ABB Robotics (SoftBank purchase, China part blocked)',
  'Generalist AI',
  '1X Technologies',
  'Wandercraft',
  'XDOF',
  'AgiBot (Zhiyuan Robotics)',
  'FieldAI',
  'Physical Intelligence',
  'Applied Intuition',
  'RobCo',
  'Formic',
  'Automata',
];

describe('normalizeCompanyName', () => {
  it('ignores case, accents, punctuation and a trailing legal form', () => {
    expect(normalizeCompanyName('Dürr')).toBe('durr');
    expect(normalizeCompanyName('  NVIDIA Corporation ')).toBe('nvidia');
    expect(normalizeCompanyName('Agile Robots SE')).toBe('agile robots');
    expect(normalizeCompanyName('Zhejiang Sanhua Co., Ltd.')).toBe('zhejiang sanhua');
    expect(normalizeCompanyName('Mech-Mind Robotics')).toBe('mech mind robotics');
    expect(normalizeCompanyName('SiMa.ai')).toBe('sima ai');
  });

  it('reads & and + as words, so Geek+ is not Geek', () => {
    expect(normalizeCompanyName('Johnson & Johnson')).toBe('johnson and johnson');
    expect(normalizeCompanyName('Geek+')).toBe('geek plus');
    expect(normalizeCompanyName('Geek+')).not.toBe(normalizeCompanyName('Geek'));
  });
});

describe('company logo lookup', () => {
  it('points every name at a registered, drawable mark whose file is on disk', () => {
    const registered = new Set([...LOGO_IMAGES, ...PENDING_LOGO_IMAGES].map((image) => image.id));
    for (const [name, id] of Object.entries(COMPANY_LOGO_IDS)) {
      expect(registered.has(id), `${name}: ${id}`).toBe(true);
      const asset = getCompanyLogo(id);
      expect(asset, `${name}: ${id}`).toBeDefined();
      expect(existsSync(join(repoRoot, 'public', asset!.file)), asset!.file).toBe(true);
      expect(withheldMark(id), id).toBeNull();
    }
  });

  it('keeps its keys normalized and never gives a name both a mark and a reason', () => {
    for (const key of [...Object.keys(COMPANY_LOGO_IDS), ...Object.keys(NO_LOGO)]) {
      expect(normalizeCompanyName(key)).toBe(key);
    }
    for (const key of Object.keys(NO_LOGO)) expect(key in COMPANY_LOGO_IDS, key).toBe(false);
  });

  it('gives every no-logo entry a reason a reader can be shown, in terms of the mark', () => {
    for (const [name, reason] of Object.entries(NO_LOGO)) {
      expect(reason, name).toMatch(/^[A-Z].{20,}\.$/);
      expect(reason, name).not.toMatch(/[—–]/);
      expect(reason, name).not.toMatch(/brand record|brand\.dev|fetch/i);
      expect(reason, name).toMatch(/official/);
    }
  });

  it('applies one legibility rule to every company', () => {
    // An emblem with no wordmark never stands in for the name.
    for (const name of ['Hyundai Motor', 'Techman Robot', 'AutoStore', 'WeRide']) {
      expect(companyLogo(name), name).toEqual({ logo: null, reason: companyLogo('AutoStore')!.reason });
    }
    // Nor does a logo given over to its stock code.
    expect(companyLogo('Yunji Technology')).toEqual(companyLogo('Keli Sensing'));
    expect(companyLogo('Yunji Technology')!.logo).toBeNull();
    expect(companyLogo('AeroVironment')!.logo).toBeNull();
  });

  it('covers every company the market pages name, with a mark or a reason', () => {
    expect(PAGE_COMPANIES).toHaveLength(225);
    expect(new Set(PAGE_COMPANIES).size).toBe(PAGE_COMPANIES.length);
    const missing = [...PAGE_COMPANIES, ...FUNDING_WITH_MAP_MARKS].filter((name) => companyLogo(name) === undefined);
    expect(missing).toEqual([]);
    for (const name of FUNDING_WITH_MAP_MARKS) expect(logoIdFor(name), name).not.toBeNull();
    const marked = PAGE_COMPANIES.filter((name) => logoIdFor(name) !== null);
    expect(marked.length).toBeGreaterThan(140);
  });

  it('keeps marks no published page draws off /credits, each still a valid registry entry', () => {
    const lookedUp = new Set(Object.values(COMPANY_LOGO_IDS));
    const imageIds = new Set(IMAGES.map((image) => image.id));
    expect(PENDING_LOGO_IMAGES.length).toBeGreaterThan(0);
    for (const image of PENDING_LOGO_IMAGES) {
      expect(imageSchema.safeParse(image).success, image.id).toBe(true);
      expect(imageIds.has(image.id), `${image.id} is not in IMAGES`).toBe(false);
      expect(lookedUp.has(image.id), `${image.id} is looked up by a name`).toBe(true);
      expect(existsSync(join(repoRoot, 'public', image.file)), image.file).toBe(true);
      // Credited to the brand profile the file came from, not the company site.
      expect(image.sourceName, image.id).toMatch(/^Brand\.dev profile of [a-z0-9.-]+\.[a-z]+$/);
      expect(image.sourceUrl, image.id).toMatch(/^https:\/\/media\.brand\.dev\/[\w-]+\.(?:png|svg|webp|jpe?g)$/);
      expect(image.caption, image.id).toMatch(/ logo from its brand profile, used on the market pages\.$/);
      expect(image.alt, image.id).not.toMatch(/website/);
    }
  });

  it('resolves a company under its common variants', () => {
    expect(logoIdFor('Hon Hai Precision (Foxconn)')).toBe('foxconn-logo');
    expect(logoIdFor('Foxconn')).toBe('foxconn-logo');
    expect(logoIdFor('Hon Hai Precision Industry Co., Ltd.')).toBe('foxconn-logo');
    expect(logoIdFor('XPENG robotics business')).toBe('xpeng-logo');
    expect(logoIdFor('XPeng Inc.')).toBe('xpeng-logo');
    expect(logoIdFor('Smith+Nephew')).toBe(logoIdFor('Smith & Nephew'));
    expect(logoIdFor('DURR')).toBe('durr-logo');
    expect(logoIdFor('Seiko Epson Corporation')).toBe('epson-logo');
    // A Hong Kong "- W" marker is not part of the name.
    expect(logoIdFor('Orbbec Inc. - W')).toBe('orbbec-logo');
    expect(normalizeCompanyName('Hai Robotics Innovation Group Co., Ltd. - W')).toBe('hai robotics innovation group');
  });

  it('shows a parent under its own mark, never a subsidiary or product brand', () => {
    expect(logoIdFor('Alphabet')).toBe('alphabet-logo');
    expect(logoIdFor('Samsung Electronics')).toBe('samsung-logo');
    expect(logoIdFor('Mobileye')).toBe('mobileye-logo');
    expect(logoIdFor('OneRobotics')).toBe('onerobotics-logo');
    expect(logoIdFor('Mitsubishi Electric')).toBe('mitsubishi-electric-logo');
    expect(companyLogo('Amazon')).toEqual({ logo: null, reason: expect.stringMatching(/subsidiary/) });
    const subsidiaryMarks = ['amazon-robotics-logo', 'google-deepmind-robotics-logo', 'boston-dynamics-logo', 'mentee-robotics-logo', 'switchbot-logo', 'mitsubishi-logo'];
    for (const id of subsidiaryMarks) expect(Object.values(COMPANY_LOGO_IDS), id).not.toContain(id);
  });

  it('returns a reason for a company with no usable mark and nothing for an unknown name', () => {
    expect(companyLogo('Fanuc')).toEqual({ logo: null, reason: expect.any(String) });
    expect(logoIdFor('Fanuc')).toBeNull();
    expect(companyLogo('Not A Robot Company')).toBeUndefined();
    expect(logoIdFor('Not A Robot Company')).toBeNull();
  });
});
