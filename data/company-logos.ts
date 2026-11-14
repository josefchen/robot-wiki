/**
 * Company name to logo lookup for the market pages.
 *
 * The public-companies and funding pages name companies that are not rows
 * of the market map, so they find a mark by name. `companyLogo(name)`
 * returns the registered logo id (data/logos.ts, with its provenance in
 * data/logo-images.ts) or an explicit no-logo entry with the reason, and
 * the page then sets the name as text. A name in neither list returns
 * undefined.
 *
 * Names are matched after `normalizeCompanyName`: case, accents,
 * punctuation and a trailing legal form (Inc., Co., Ltd. and the like) do
 * not matter, and `&` and `+` read as words. Each entry lists the name as
 * the research and filings spell it and its common variants.
 *
 * A parent is shown under its own mark. A subsidiary's mark (Amazon
 * Robotics, Google DeepMind, Boston Dynamics) never stands in for its
 * parent, and a product brand never stands in for its maker.
 *
 * Type-free of the registries, so this file loads under plain node, Vitest
 * and Next.js alike.
 */

type LogoEntry = { names: readonly string[]; logo: string };
type NoLogoEntry = { names: readonly string[]; reason: string };

/** What the lookup knows about a company name. */
export type CompanyLogoMatch =
  | { logo: string; reason?: undefined }
  | { logo: null; reason: string };

const LEGAL_FORM =
  /\s+(?:inc|incorporated|corp|corporation|co|company|ltd|limited|plc|ag|se|sa|nv|llc|gmbh|kk|pbc)$/;

/** Lowercase, accents and punctuation stripped, a trailing legal form dropped. */
export function normalizeCompanyName(name: string): string {
  let key = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\+/g, ' plus ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
  while (LEGAL_FORM.test(key)) key = key.replace(LEGAL_FORM, '');
  return key;
}

const WITH_LOGO: readonly LogoEntry[] = [
  // Marks already registered for the market map.
  { names: ['ABB'], logo: 'abb-logo' },
  { names: ['Agile Robots'], logo: 'agile-robots-logo' },
  { names: ['Agility Robotics', 'Agility'], logo: 'agility-robotics-logo' },
  { names: ['Bedrock Robotics', 'Bedrock'], logo: 'bedrock-robotics-logo' },
  { names: ['CMR Surgical'], logo: 'cmr-surgical-logo' },
  { names: ['D-Robotics'], logo: 'd-robotics-logo' },
  { names: ['Eka Robotics', 'Eka'], logo: 'eka-robotics-logo' },
  { names: ['Foundry Robotics'], logo: 'foundry-robotics-logo' },
  { names: ['Geek+', 'Geekplus'], logo: 'geek-plus-logo' },
  { names: ['Harmonic Drive Systems', 'Harmonic Drive'], logo: 'harmonic-drive-logo' },
  { names: ['Humanoid (SKL Robotics)', 'Humanoid', 'SKL Robotics'], logo: 'humanoid-uk-logo' },
  { names: ['Intuitive Surgical', 'Intuitive'], logo: 'intuitive-surgical-logo' },
  { names: ['Knightscope'], logo: 'knightscope-logo' },
  { names: ['Leaderdrive', 'Leader Harmonious Drive Systems'], logo: 'leaderdrive-logo' },
  { names: ['Nabtesco'], logo: 'nabtesco-logo' },
  { names: ['NVIDIA'], logo: 'nvidia-logo' },
  { names: ['Rainbow Robotics'], logo: 'rainbow-robotics-logo' },
  { names: ['Robotphoenix'], logo: 'robotphoenix-logo' },
  { names: ['Serve Robotics', 'Serve'], logo: 'serve-robotics-logo' },
  { names: ['Symbotic'], logo: 'symbotic-logo' },
  { names: ['Tesla'], logo: 'tesla-logo' },
  { names: ['Tutor Intelligence'], logo: 'tutor-intelligence-logo' },
  { names: ['UBTech Robotics', 'UBTECH'], logo: 'ubtech-logo' },
  { names: ['Unitree Robotics', 'Unitree'], logo: 'unitree-logo' },
  { names: ['Zhejiang Sanhua', 'Sanhua', 'Sanhua Intelligent Controls'], logo: 'sanhua-logo' },
  { names: ['Zipline'], logo: 'zipline-logo' },

  // Listed companies and the parents shown off the scale.
  { names: ['Accuray'], logo: 'accuray-logo' },
  { names: ['AeroVironment'], logo: 'aerovironment-logo' },
  { names: ['Alphabet'], logo: 'alphabet-logo' },
  { names: ['AMC Robotics'], logo: 'amc-robotics-logo' },
  { names: ['Amicro Technology', 'Amicro'], logo: 'amicro-logo' },
  { names: ['Applied Aerospace & Defense'], logo: 'applied-aerospace-defense-logo' },
  { names: ['Aurora Innovation', 'Aurora'], logo: 'aurora-innovation-logo' },
  { names: ['Bigwave Robotics'], logo: 'bigwave-robotics-logo' },
  { names: ['Camsense Technologies', 'Camsense'], logo: 'camsense-logo' },
  { names: ['CiDi'], logo: 'cidi-logo' },
  { names: ['Clobot'], logo: 'clobot-logo' },
  { names: ['Cognex'], logo: 'cognex-logo' },
  { names: ['Curexo'], logo: 'curexo-logo' },
  { names: ['Cyberdyne'], logo: 'cyberdyne-logo' },
  { names: ['Daifuku'], logo: 'daifuku-logo' },
  { names: ['Dobot'], logo: 'dobot-logo' },
  { names: ['Doosan Robotics'], logo: 'doosan-robotics-logo' },
  { names: ['Draganfly'], logo: 'draganfly-logo' },
  { names: ['Dürr'], logo: 'durr-logo' },
  { names: ['EACON Group', 'EACON'], logo: 'eacon-logo' },
  { names: ['Ecovacs'], logo: 'ecovacs-logo' },
  { names: ['Edge Medical'], logo: 'edge-medical-logo' },
  { names: ['EHang'], logo: 'ehang-logo' },
  { names: ['Excelland Robotics', 'Excelland', 'Uditech'], logo: 'excelland-robotics-logo' },
  { names: ['Exail Technologies', 'Exail'], logo: 'exail-logo' },
  { names: ['Exyn Technologies', 'Exyn'], logo: 'exyn-logo' },
  { names: ['Galaxis Technology', 'Galaxis'], logo: 'galaxis-logo' },
  { names: ['Globus Medical'], logo: 'globus-medical-logo' },
  { names: ['Guardforce AI'], logo: 'guardforce-ai-logo' },
  { names: ['Hesai Group', 'Hesai'], logo: 'hesai-logo' },
  { names: ['Hiwin Technologies', 'HIWIN'], logo: 'hiwin-logo' },
  { names: ['Hon Hai Precision (Foxconn)', 'Hon Hai Precision Industry', 'Hon Hai Precision', 'Hon Hai', 'Foxconn'], logo: 'foxconn-logo' },
  { names: ['Hyundai Motor', 'Hyundai'], logo: 'hyundai-logo' },
  { names: ['Johnson & Johnson'], logo: 'johnson-and-johnson-logo' },
  { names: ['Jungheinrich'], logo: 'jungheinrich-logo' },
  { names: ['Kaierda Welding Robot', 'Kaierda'], logo: 'kaierda-logo' },
  { names: ['Kardex'], logo: 'kardex-logo' },
  { names: ['Keyence'], logo: 'keyence-logo' },
  { names: ['KION Group', 'KION'], logo: 'kion-group-logo' },
  { names: ['Kodiak AI', 'Kodiak'], logo: 'kodiak-logo' },
  { names: ['Kraken Robotics'], logo: 'kraken-robotics-logo' },
  { names: ['Kratos Defense', 'Kratos'], logo: 'kratos-logo' },
  { names: ['Laifual Drive', 'Laifual'], logo: 'laifual-logo' },
  { names: ['LDROBOT'], logo: 'ldrobot-logo' },
  { names: ['Leadshine Technology', 'Leadshine'], logo: 'leadshine-logo' },
  { names: ['Lifeward'], logo: 'lifeward-logo' },
  { names: ['Maytronics'], logo: 'maytronics-logo' },
  { names: ['Mech-Mind Robotics', 'Mech-Mind'], logo: 'mech-mind-logo' },
  { names: ['MicroPort MedBot', 'MedBot'], logo: 'microport-medbot-logo' },
  { names: ['Microbot Medical'], logo: 'microbot-medical-logo' },
  { names: ['Mitsubishi Electric'], logo: 'mitsubishi-electric-logo' },
  { names: ['Mobileye'], logo: 'mobileye-logo' },
  { names: ['Momenta'], logo: 'momenta-logo' },
  { names: ['Myomo'], logo: 'myomo-logo' },
  { names: ['Nachi-Fujikoshi', 'Nachi'], logo: 'nachi-fujikoshi-logo' },
  { names: ['Neuromeka'], logo: 'neuromeka-logo' },
  { names: ['Ningbo Tuopu', 'Tuopu'], logo: 'tuopu-logo' },
  { names: ['Ocado Group', 'Ocado'], logo: 'ocado-group-logo' },
  { names: ['Omron'], logo: 'omron-logo' },
  { names: ['Ondas Holdings', 'Ondas'], logo: 'ondas-logo' },
  { names: ['OneRobotics'], logo: 'onerobotics-logo' },
  { names: ['Orbbec'], logo: 'orbbec-logo' },
  { names: ['Ouster'], logo: 'ouster-logo' },
  { names: ['Parrot'], logo: 'parrot-logo' },
  { names: ['PROCEPT BioRobotics', 'PROCEPT'], logo: 'procept-biorobotics-logo' },
  { names: ['Red Cat Holdings', 'Red Cat'], logo: 'red-cat-logo' },
  { names: ['Richtech Robotics', 'Richtech'], logo: 'richtech-robotics-logo' },
  { names: ['Roborock'], logo: 'roborock-logo' },
  { names: ['Rockwell Automation'], logo: 'rockwell-automation-logo' },
  { names: ['Samsung Electronics', 'Samsung'], logo: 'samsung-logo' },
  { names: ['Scott Technology'], logo: 'scott-technology-logo' },
  { names: ['Seer Robotics', 'Seer'], logo: 'seer-robotics-logo' },
  { names: ['Seiko Epson', 'Epson'], logo: 'epson-logo' },
  { names: ['Smith & Nephew', 'Smith+Nephew'], logo: 'smith-and-nephew-logo' },
  { names: ['SoftBank Group', 'SoftBank'], logo: 'softbank-group-logo' },
  { names: ['SPG'], logo: 'spg-logo' },
  { names: ['SS Innovations International', 'SS Innovations', 'SSII'], logo: 'ss-innovations-logo' },
  { names: ['Swarmer'], logo: 'swarmer-logo' },
  { names: ['Sysmex'], logo: 'sysmex-logo' },
  { names: ['Techman Robot', 'Techman'], logo: 'techman-robot-logo' },
  { names: ['Teradyne'], logo: 'teradyne-logo' },
  { names: ['Tinavi Medical', 'Tinavi'], logo: 'tinavi-logo' },
  { names: ['UISEE Technologies', 'UISEE'], logo: 'uisee-logo' },
  { names: ['Unusual Machines'], logo: 'unusual-machines-logo' },
  { names: ['XPeng', 'XPENG robotics business', 'XPENG Robotics'], logo: 'xpeng-logo' },
  { names: ['XTEND AI Robotics', 'XTEND'], logo: 'xtend-logo' },
  { names: ['Yamaha Motor'], logo: 'yamaha-motor-logo' },
  { names: ['Yaskawa Electric', 'Yaskawa'], logo: 'yaskawa-logo' },
  { names: ['Yijiahe Technology', 'Yijiahe'], logo: 'yijiahe-logo' },
  { names: ['Yujin Robot'], logo: 'yujin-robot-logo' },
  { names: ['Yunji Technology', 'Yunji'], logo: 'yunji-logo' },
  { names: ['Yushin'], logo: 'yushin-logo' },
  { names: ['Zhaowei Machinery & Electronics', 'Zhaowei'], logo: 'zhaowei-logo' },
  { names: ['Zhejiang Shuanghuan Driveline', 'Shuanghuan'], logo: 'shuanghuan-logo' },

  // Companies behind the largest funding rounds.
  { names: ['Atoms'], logo: 'atoms-logo' },
  { names: ['Autonomous Solutions (ASI)', 'Autonomous Solutions', 'ASI'], logo: 'autonomous-solutions-logo' },
  { names: ['Gatik'], logo: 'gatik-logo' },
  { names: ['GenRobot.AI', 'GenRobot'], logo: 'genrobot-logo' },
  { names: ['Hadrian'], logo: 'hadrian-logo' },
  { names: ['Lyte'], logo: 'lyte-logo' },
  { names: ['Mach Industries'], logo: 'mach-industries-logo' },
  { names: ['Maven Robotics'], logo: 'maven-robotics-logo' },
  { names: ['Mecka AI', 'Mecka'], logo: 'mecka-logo' },
  { names: ['MMI (Medical Microinstruments)', 'Medical Microinstruments', 'MMI'], logo: 'mmi-logo' },
  { names: ['Moove'], logo: 'moove-logo' },
  { names: ['Multiply Labs'], logo: 'multiply-labs-logo' },
  { names: ['Neros Technologies', 'Neros'], logo: 'neros-logo' },
  { names: ['Parallel Systems'], logo: 'parallel-systems-logo' },
  { names: ['Path Robotics'], logo: 'path-robotics-logo' },
  { names: ['Shield AI'], logo: 'shield-ai-logo' },
  { names: ['SiMa.ai'], logo: 'sima-ai-logo' },
  { names: ['TEKEVER'], logo: 'tekever-logo' },
  { names: ['Watney'], logo: 'watney-logo' },
];

const ICON_ONLY = 'Its brand record holds only an icon, with no wordmark that names the company at map size.';
const OPAQUE_ONLY = 'Its brand record holds only artwork on an opaque background, which draws as a solid block.';
const NO_RECORD = 'No brand record was found for the company.';

const WITHOUT_LOGO: readonly NoLogoEntry[] = [
  { names: ['Amazon'], reason: 'Its brand record holds only app icons on solid tiles; Amazon Robotics’ mark is a subsidiary’s and does not stand in.' },
  { names: ['AutoStore'], reason: ICON_ONLY },
  { names: ['BRILS'], reason: NO_RECORD },
  { names: ['Cambridge Aerospace'], reason: ICON_ONLY },
  { names: ['Cosmo Robotics'], reason: 'Its brand record shows ExoAtlet, a product brand, not the company’s own name.' },
  { names: ['Daihen'], reason: 'Its wordmark sits in a filled box that draws as a solid block.' },
  { names: ['Direct Drive Tech'], reason: 'The file in its brand record draws as a single character, not a legible mark.' },
  { names: ['Dream Labs'], reason: NO_RECORD },
  { names: ['Efort Intelligent Equipment', 'Efort'], reason: OPAQUE_ONLY },
  { names: ['Enigma'], reason: NO_RECORD },
  { names: ['Estun Automation', 'Estun'], reason: 'Its brand record holds no logo file.' },
  { names: ['FBR'], reason: OPAQUE_ONLY },
  { names: ['Fanuc'], reason: OPAQUE_ONLY },
  { names: ['Gravis Robotics'], reason: OPAQUE_ONLY },
  { names: ['Hexagon'], reason: ICON_ONLY },
  { names: ['Horizon Robotics'], reason: ICON_ONLY },
  { names: ['Huayan Robotics'], reason: ICON_ONLY },
  { names: ['Husqvarna'], reason: ICON_ONLY },
  { names: ['ICON'], reason: OPAQUE_ONLY },
  { names: ['ideaForge Technology', 'ideaForge'], reason: ICON_ONLY },
  { names: ['Keli Sensing'], reason: 'Its logo file is mostly its stock code; the name is too small to read at map size.' },
  { names: ['Kawasaki Heavy Industries', 'Kawasaki'], reason: 'Its wordmark sits on a filled badge that draws as a solid block; otherwise only an icon.' },
  { names: ['LG Electronics', 'LG'], reason: 'Its brand record holds only the round face icon, which draws as a filled disc.' },
  { names: ['Medtronic'], reason: 'Its brand record holds only round badge icons, which draw as filled discs.' },
  { names: ['Midea Group', 'Midea'], reason: 'Its wordmark is on an opaque background; otherwise only an icon.' },
  { names: ['Minth Group', 'Minth'], reason: 'Its wordmark is too small beside its badge to read at map size.' },
  { names: ['Nauticus Robotics'], reason: ICON_ONLY },
  { names: ['Ningbo ZhongDa Leader', 'ZhongDa Leader'], reason: OPAQUE_ONLY },
  { names: ['Palladyne AI'], reason: ICON_ONLY },
  { names: ['Pony AI'], reason: ICON_ONLY },
  { names: ['Poseidon Aerospace'], reason: ICON_ONLY },
  { names: ['Reliable Robotics'], reason: ICON_ONLY },
  { names: ['Renishaw'], reason: OPAQUE_ONLY },
  { names: ['RoboSense'], reason: 'Its brand record holds only icons, which draw as filled shapes.' },
  { names: ['RoboTechnik'], reason: ICON_ONLY },
  { names: ['Robostar'], reason: NO_RECORD },
  { names: ['Robotis'], reason: OPAQUE_ONLY },
  { names: ['Rokae Robotics', 'Rokae'], reason: OPAQUE_ONLY },
  { names: ['Schaeffler'], reason: 'Its brand record holds only icons, which draw as filled shapes.' },
  { names: ['Seyond'], reason: 'Its logo sets the name in small vertical type that cannot be read at map size.' },
  { names: ['Shenzhen Inovance', 'Inovance'], reason: OPAQUE_ONLY },
  { names: ['Siasun Robot & Automation', 'Siasun'], reason: 'Its brand record holds no logo file.' },
  { names: ['Siemens'], reason: OPAQUE_ONLY },
  { names: ['SMC'], reason: 'Its brand record holds only an icon whose small wordmark cannot be read at map size.' },
  { names: ['Stereotaxis'], reason: ICON_ONLY },
  { names: ['Stryker'], reason: 'Its brand record holds only a wordmark on an opaque background and app icons.' },
  { names: ['Sudo Technology (Suduo)', 'Sudo Technology', 'Suduo'], reason: 'The only brand record under the name belongs to an unrelated software company.' },
  { names: ['Swancor Advanced Materials', 'Swancor'], reason: 'Half of its wordmark sits in a filled box that draws as a solid block.' },
  { names: ['T-Robotics'], reason: NO_RECORD },
  { names: ['Topstar Technology', 'Topstar'], reason: OPAQUE_ONLY },
  { names: ['UFORCE'], reason: NO_RECORD },
  { names: ['Veeda AI', 'Veeda'], reason: OPAQUE_ONLY },
  { names: ['Warp Sciences'], reason: NO_RECORD },
  { names: ['WeRide'], reason: ICON_ONLY },
  { names: ['Xiaomi'], reason: 'Its brand record holds only app icons on solid tiles.' },
  { names: ['Yuil Robotics'], reason: NO_RECORD },
  { names: ['Zimmer Biomet'], reason: 'Its wordmark sits on a filled banner that draws as a solid block.' },
];

function index<E extends { names: readonly string[] }, T>(entries: readonly E[], value: (entry: E) => T): Record<string, T> {
  const map: Record<string, T> = {};
  for (const entry of entries) {
    for (const name of entry.names) {
      const key = normalizeCompanyName(name);
      if (!key) throw new Error(`company-logos: "${name}" normalizes to nothing`);
      const next = value(entry);
      if (key in map && map[key] !== next) throw new Error(`company-logos: "${name}" is listed twice`);
      map[key] = next;
    }
  }
  return map;
}

/** Normalized company name to registered logo id. */
export const COMPANY_LOGO_IDS: Readonly<Record<string, string>> = index(WITH_LOGO, (entry) => entry.logo);

/** Normalized company name to the reason it has no mark. */
export const NO_LOGO: Readonly<Record<string, string>> = index(WITHOUT_LOGO, (entry) => entry.reason);

for (const key of Object.keys(NO_LOGO)) {
  if (key in COMPANY_LOGO_IDS) throw new Error(`company-logos: "${key}" has both a logo and a no-logo entry`);
}

/** The registered logo id or the no-logo reason for a name; undefined for a name in neither list. */
export function companyLogo(name: string): CompanyLogoMatch | undefined {
  const key = normalizeCompanyName(name);
  if (key in COMPANY_LOGO_IDS) return { logo: COMPANY_LOGO_IDS[key] };
  if (key in NO_LOGO) return { logo: null, reason: NO_LOGO[key] };
  return undefined;
}

/** The registered logo id for a name, or null. */
export function logoIdFor(name: string): string | null {
  return companyLogo(name)?.logo ?? null;
}
