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
import { LOGO_IMAGES } from '@/data/logo-images';
import { getCompanyLogo } from '@/data/logos';
import { withheldMark } from '@/lib/market-map-marks';

const repoRoot = join(import.meta.dirname, '../..');

/**
 * Every company the public-companies and funding pages name, spelled as the
 * November 2026 research lists them: the listed companies, the parents left
 * off the scaled map, and the companies behind the 40 largest rounds.
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
    const registered = new Set(LOGO_IMAGES.map((image) => image.id));
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

  it('gives every no-logo entry a reason a reader can be shown', () => {
    for (const [name, reason] of Object.entries(NO_LOGO)) {
      expect(reason, name).toMatch(/^[A-Z].{20,}\.$/);
      expect(reason, name).not.toMatch(/[—–]/);
    }
  });

  it('covers every company the market pages name, with a mark or a reason', () => {
    expect(PAGE_COMPANIES).toHaveLength(197);
    const missing = PAGE_COMPANIES.filter((name) => companyLogo(name) === undefined);
    expect(missing).toEqual([]);
    const marked = PAGE_COMPANIES.filter((name) => logoIdFor(name) !== null);
    expect(marked.length).toBeGreaterThan(130);
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
  });

  it('shows a parent under its own mark, never a subsidiary or product brand', () => {
    expect(logoIdFor('Alphabet')).toBe('alphabet-logo');
    expect(logoIdFor('Hyundai Motor')).toBe('hyundai-logo');
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
