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
 * Coverage: every company in the November 2026 public-markets pack (listed,
 * left out, debuts, IPO watch, AI labs) and the companies behind the 40
 * largest rounds in the funding pack. Smaller rounds are listed only where
 * the company already has a market-map mark; the rest return undefined and
 * are set as text.
 *
 * Names are matched after `normalizeCompanyName`: case, accents,
 * punctuation, a trailing legal form (Inc., Co., Ltd. and the like) and a
 * trailing Hong Kong "- W" marker do not matter, and `&` and `+` read as
 * words. Each entry lists the name as the research and filings spell it and
 * its common variants.
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
    .replace(/\s+-\s*W$/, '')
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
  { names: ['UFORCE'], logo: 'uforce-logo' },
  { names: ['Warp Sciences'], logo: 'warp-sciences-logo' },
  { names: ['Gravis Robotics'], logo: 'gravis-robotics-logo' },
  { names: ['ICON'], logo: 'icon-construction-logo' },
  { names: ['Reliable Robotics'], logo: 'reliable-robotics-logo' },
  { names: ['Dream Labs'], logo: 'dream-labs-logo' },
  { names: ['Veeda AI', 'Veeda'], logo: 'veeda-ai-logo' },
  { names: ['Enigma'], logo: 'enigma-robotics-logo' },
  { names: ['Poseidon Aerospace'], logo: 'poseidon-aerospace-logo' },
  { names: ['Standard Robots', 'Standard Robots (Wuxi)'], logo: 'standard-robots-logo' },
  { names: ['Tianjin Chenxing Technology', 'Tianjin Chenxing Technology Co., Ltd. (formerly known as Tianjin Atomrobot Co., Ltd.)', 'Atomrobot'], logo: 'atomrobot-logo' },
  { names: ['Changzhou Microintelligence'], logo: 'changzhou-microintelligence-logo' },
  { names: ['AL Robot'], logo: 'al-robot-logo' },
  { names: ['FireFly Robotics'], logo: 'firefly-robotics-logo' },
  { names: ['Garuda Aerospace'], logo: 'garuda-aerospace-logo' },
  { names: ['AITMC Ventures'], logo: 'aitmc-ventures-logo' },
  { names: ['WB Electronics'], logo: 'wb-electronics-logo' },
  { names: ['BrightAI'], logo: 'brightai-logo' },
  { names: ['Cornerstone Robotics'], logo: 'cornerstone-robotics-logo' },
  { names: ['Genesis AI'], logo: 'genesis-ai-logo' },
  { names: ['IPLUSMOBOT', 'Zhejiang IPLUSMOBOT', 'Zhejiang IPLUSMOBOT Technology'], logo: 'iplusmobot-logo' },
  { names: ['MegaRobo'], logo: 'megarobo-logo' },
  { names: ['Remedy Robotics'], logo: 'remedy-robotics-logo' },
  { names: ['Sudu Technology', 'Sudo Technology (Suduo)', 'Sudo Technology', 'Suduo'], logo: 'sudo-technology-logo' },
  { names: ['Topstar Technology', 'Topstar Technology (H shares)', 'Topstar', 'Guangdong Topstar Technology'], logo: 'topstar-logo' },
  // Marks already registered for the market map. ABB Robotics, the division
  // SoftBank Group is buying, carries the ABB mark on its own pages.
  { names: ['ABB', 'ABB Robotics', 'ABB Robotics (to SoftBank Group)', 'ABB Robotics (SoftBank purchase, China part blocked)'], logo: 'abb-logo' },
  { names: ['AgiBot', 'AgiBot (Zhiyuan Robotics)', 'Zhiyuan Robotics'], logo: 'agibot-logo' },
  { names: ['Agile Robots'], logo: 'agile-robots-logo' },
  { names: ['Agility Robotics', 'Agility'], logo: 'agility-robotics-logo' },
  { names: ['Applied Intuition'], logo: 'applied-intuition-logo' },
  { names: ['Automata'], logo: 'automata-logo' },
  { names: ['Bedrock Robotics', 'Bedrock'], logo: 'bedrock-robotics-logo' },
  { names: ['CMR Surgical'], logo: 'cmr-surgical-logo' },
  { names: ['D-Robotics'], logo: 'd-robotics-logo' },
  { names: ['Deep Robotics', 'Deep Robotics (Hangzhou Yunshenchu)', 'Hangzhou Yunshenchu'], logo: 'deep-robotics-logo' },
  { names: ['Eka Robotics', 'Eka'], logo: 'eka-robotics-logo' },
  { names: ['EngineAI'], logo: 'engineai-logo' },
  { names: ['Field AI', 'FieldAI'], logo: 'field-ai-logo' },
  { names: ['Formic'], logo: 'formic-logo' },
  { names: ['Foundry Robotics'], logo: 'foundry-robotics-logo' },
  { names: ['Galbot'], logo: 'galbot-logo' },
  { names: ['Geek+', 'Geekplus'], logo: 'geek-plus-logo' },
  { names: ['Generalist AI'], logo: 'generalist-ai-logo' },
  { names: ['Harmonic Drive Systems', 'Harmonic Drive'], logo: 'harmonic-drive-logo' },
  { names: ['Humanoid (SKL Robotics)', 'Humanoid', 'SKL Robotics'], logo: 'humanoid-uk-logo' },
  { names: ['Intuitive Surgical', 'Intuitive'], logo: 'intuitive-surgical-logo' },
  { names: ['Knightscope'], logo: 'knightscope-logo' },
  { names: ['Leaderdrive', 'Leader Harmonious Drive Systems'], logo: 'leaderdrive-logo' },
  { names: ['Leju Robotics', 'Leju Robotics (Leju Intelligent, Shenzhen)', 'Leju Intelligent'], logo: 'leju-robotics-logo' },
  { names: ['LimX Dynamics'], logo: 'limx-dynamics-logo' },
  { names: ['Nabtesco'], logo: 'nabtesco-logo' },
  { names: ['Noetix Robotics', 'Noetix Robotics (Songyan Power Beijing Technology)', 'Songyan Power'], logo: 'noetix-robotics-logo' },
  { names: ['NVIDIA'], logo: 'nvidia-logo' },
  { names: ['OpenAI'], logo: 'openai-logo' },
  { names: ['Physical Intelligence'], logo: 'physical-intelligence-logo' },
  { names: ['Rainbow Robotics'], logo: 'rainbow-robotics-logo' },
  { names: ['RobCo'], logo: 'robco-logo' },
  { names: ['Robotphoenix'], logo: 'robotphoenix-logo' },
  { names: ['Serve Robotics', 'Serve'], logo: 'serve-robotics-logo' },
  { names: ['Symbotic'], logo: 'symbotic-logo' },
  { names: ['Tesla'], logo: 'tesla-logo' },
  { names: ['Tutor Intelligence'], logo: 'tutor-intelligence-logo' },
  { names: ['UBTech Robotics', 'UBTECH'], logo: 'ubtech-logo' },
  { names: ['Unitree Robotics', 'Unitree', 'Unitree Robotics (Yushu Technology)', 'Yushu Technology'], logo: 'unitree-logo' },
  { names: ['Wandercraft'], logo: 'wandercraft-logo' },
  { names: ['X Square Robot'], logo: 'x-square-robot-logo' },
  { names: ['XDOF'], logo: 'xdof-logo' },
  { names: ['1X Technologies', '1X'], logo: '1x-technologies-logo' },
  { names: ['Zhejiang Sanhua', 'Sanhua', 'Sanhua Intelligent Controls'], logo: 'sanhua-logo' },
  { names: ['Zipline'], logo: 'zipline-logo' },

  // Listed companies and the parents shown off the scale.
  { names: ['Accuray'], logo: 'accuray-logo' },
  { names: ['Alphabet'], logo: 'alphabet-logo' },
  { names: ['AMC Robotics'], logo: 'amc-robotics-logo' },
  { names: ['Amicro Technology', 'Amicro', 'Amicro Technology (Eeasy Tech)', 'Eeasy Tech'], logo: 'amicro-logo' },
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
  { names: ['Galaxis Technology', 'Galaxis', 'Zhejiang Galaxis Technology'], logo: 'galaxis-logo' },
  { names: ['Globus Medical'], logo: 'globus-medical-logo' },
  { names: ['Guardforce AI'], logo: 'guardforce-ai-logo' },
  { names: ['Hesai Group', 'Hesai'], logo: 'hesai-logo' },
  { names: ['Hiwin Technologies', 'HIWIN'], logo: 'hiwin-logo' },
  { names: ['Hon Hai Precision (Foxconn)', 'Hon Hai Precision Industry', 'Hon Hai Precision', 'Hon Hai', 'Foxconn'], logo: 'foxconn-logo' },
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
  { names: ['Orbbec', 'Orbbec (H shares)'], logo: 'orbbec-logo' },
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

const EMBLEM = 'No official wordmark was found; its emblem alone does not name the company.';
const OPAQUE = 'No official logo on a transparent ground was found.';
const NONE = 'No official logo file was found.';
const STOCK_CODE = 'Much of its official logo is its stock code, which leaves the name too small to read at map size.';
const UNCOLLECTED = 'No official logo has been collected yet.';

const WITHOUT_LOGO: readonly NoLogoEntry[] = [
  { names: ['AeroVironment'], reason: 'Its official logo sets the name in small type under the AV emblem and beside a tagline, too small to read at map size.' },
  { names: ['Amazon'], reason: 'No official Amazon wordmark on a transparent ground was found; the Amazon Robotics mark is a subsidiary’s and does not stand in.' },
  { names: ['Anthropic'], reason: UNCOLLECTED },
  { names: ['AutoStore'], reason: EMBLEM },
  { names: ['BRILS'], reason: NONE },
  { names: ['Cambridge Aerospace'], reason: 'The official company mark is a diagonal cluster of stars. The emblem has no lettering to identify Cambridge Aerospace in a compact table.' },
  { names: ['Cosmo Robotics'], reason: 'The only official mark found is ExoAtlet, a product brand, not the company’s name.' },
  { names: ['Daihen'], reason: 'Its official wordmark sits in a filled box that would draw as a solid block.' },
  { names: ['Direct Drive Tech'], reason: 'The only official logo file found draws as a single character, not a legible mark.' },
  { names: ['Duke Robotics'], reason: UNCOLLECTED },
  { names: ['Efort Intelligent Equipment', 'Efort'], reason: OPAQUE },
  { names: ['Estun Automation', 'Estun', 'Estun Automation (H shares)'], reason: NONE },
  { names: ['FBR'], reason: OPAQUE },
  { names: ['Fanuc'], reason: OPAQUE },
  { names: ['Hai Robotics', 'Hai Robotics Innovation Group'], reason: 'The official horizontal HAI Robotics wordmark is fewer than seven pixels high at table size. Its compact alternate sets the name on a filled blue tile.' },
  { names: ['Hexagon'], reason: EMBLEM },
  { names: ['Horizon Robotics'], reason: EMBLEM },
  { names: ['Huayan Robotics'], reason: EMBLEM },
  { names: ['Husqvarna'], reason: EMBLEM },
  { names: ['Hyundai Motor', 'Hyundai'], reason: EMBLEM },
  { names: ['ideaForge Technology', 'ideaForge'], reason: EMBLEM },
  { names: ['Keli Sensing'], reason: STOCK_CODE },
  { names: ['Kawasaki Heavy Industries', 'Kawasaki'], reason: 'Its official wordmark sits on a filled badge that would draw as a solid block.' },
  { names: ['LG Electronics', 'LG'], reason: 'The only official mark found is the round face emblem, which would draw as a filled disc.' },
  { names: ['Medtronic'], reason: 'The only official marks found are round badges, which would draw as filled discs.' },
  { names: ['Midea Group', 'Midea'], reason: OPAQUE },
  { names: ['Minth Group', 'Minth'], reason: 'Its official wordmark is too small beside its badge to read at map size.' },
  { names: ['Nauticus Robotics'], reason: EMBLEM },
  { names: ['Ningbo ZhongDa Leader', 'ZhongDa Leader'], reason: OPAQUE },
  { names: ['Palladyne AI'], reason: EMBLEM },
  { names: ['Pony AI'], reason: EMBLEM },
  { names: ['Renishaw'], reason: OPAQUE },
  { names: ['RoboSense'], reason: 'The only official marks found are emblems, which would draw as filled shapes.' },
  { names: ['RoboTechnik'], reason: EMBLEM },
  { names: ['Robostar'], reason: NONE },
  { names: ['Robotis'], reason: OPAQUE },
  { names: ['Rokae Robotics', 'Rokae'], reason: OPAQUE },
  { names: ['Schaeffler'], reason: 'The only official marks found are emblems, which would draw as filled shapes.' },
  { names: ['Seyond'], reason: 'Its official logo sets the name in small vertical type that cannot be read at map size.' },
  { names: ['Shenzhen Inovance', 'Inovance'], reason: OPAQUE },
  { names: ['Siasun Robot & Automation', 'Siasun'], reason: NONE },
  { names: ['Siemens'], reason: OPAQUE },
  { names: ['SMC'], reason: 'The only official mark found is an emblem whose small wordmark cannot be read at map size.' },
  { names: ['Stereotaxis'], reason: EMBLEM },
  { names: ['Stryker'], reason: OPAQUE },
  { names: ['Swancor Advanced Materials', 'Swancor'], reason: 'Half of its official wordmark sits in a filled box that would draw as a solid block.' },
  { names: ['T-Robotics'], reason: NONE },
  { names: ['Techman Robot', 'Techman'], reason: EMBLEM },
  { names: ['WeRide'], reason: EMBLEM },
  { names: ['Xiaomi'], reason: 'The only official marks found are app icons on solid tiles.' },
  { names: ['Yuil Robotics'], reason: NONE },
  { names: ['Yunji Technology', 'Yunji'], reason: STOCK_CODE },
  { names: ['Zimmer Biomet'], reason: 'Its official wordmark sits on a filled banner that would draw as a solid block.' },
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
