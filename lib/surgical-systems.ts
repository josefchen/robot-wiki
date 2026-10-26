/**
 * Data for the adjacent/surgical module's comparison table, next to the
 * prose that cites the same sources. Row content mirrors the primary
 * sources: Intuitive's da Vinci 5 clearance release, its cardiac clearance
 * and its second-quarter 2026 report, CMR's Versius De Novo authorization
 * and the FDA's Versius Plus 510(k) summary (K252111), Medtronic's Hugo
 * clearance, J&J's OTTAVA De Novo authorization, Moon Surgical's Maestro
 * clearances, and the Yang et al. six-level autonomy framework.
 */

export interface SurgicalSystemRow {
  /** Registry key for the comparison table rows. */
  key: string;
  /** System name as the prose uses it. */
  system: string;
  /** What the system is designed to do. */
  focus: string;
  /** The claimed technical differentiator, with its source's own figures. */
  edge: string;
  /** How it entered (or has not yet entered) the US market. */
  regulatory: string;
  /** Position on the Yang et al. autonomy scale, 0 (teleoperation) to 5. */
  autonomyLevel: 0 | 1 | 2 | 3 | 4 | 5;
  /** One line stating what that level means for this system. */
  autonomyNote: string;
}

export const SURGICAL_SYSTEM_ROWS: readonly SurgicalSystemRow[] = [
  {
    key: 'intuitive-da-vinci',
    system: 'Intuitive da Vinci',
    focus:
      'Multiport and single-port teleoperated soft-tissue surgery; the incumbent platform',
    edge: 'da Vinci 5 ships 150+ enhancements over Xi, including Force Feedback instruments and 10,000x the computing power',
    regulatory:
      'da Vinci 5 via 510(k) in March 2024, cleared for selected cardiac procedures in January 2026; 11,710 systems installed by June 30, 2026',
    autonomyLevel: 0,
    autonomyNote:
      'Level 0: every motion is the surgeon\u2019s command, scaled and tremor-filtered',
  },
  {
    key: 'cmr-versius',
    system: 'CMR Versius',
    focus:
      'Compact, modular multiport system that moves between operating rooms and care settings',
    edge: 'Biomimetic arm design with small fully wristed instruments and an open console; Versius Plus adds near-infrared imaging, new instruments and updated software',
    regulatory:
      'US entry via FDA De Novo (October 2024) for adult cholecystectomy; Versius Plus 510(k) December 2025',
    autonomyLevel: 0,
    autonomyNote:
      'Level 0: teleoperated, with the surgeon at an open console rather than enclosed',
  },
  {
    key: 'medtronic-hugo',
    system: 'Medtronic Hugo',
    focus:
      'Modular multiport robotic-assisted surgery system, cleared in the US for urology',
    edge: 'Already used in more than 30 countries before its US clearance',
    regulatory:
      'US 510(k) clearance on December 3, 2025 for urologic procedures including prostatectomy, nephrectomy and cystectomy',
    autonomyLevel: 0,
    autonomyNote:
      'Level 0: teleoperated from a surgeon console',
  },
  {
    key: 'jnj-ottava',
    system: 'J&J OTTAVA',
    focus:
      'Table-integrated soft-tissue robot for general surgery',
    edge: 'J&J says it occupies 30 to 50 percent less space than boom- and cart-mounted systems',
    regulatory:
      'FDA De Novo authorization in July 2026 for general-surgery procedures including gastric bypass, cholecystectomy and hiatal hernia repair',
    autonomyLevel: 0,
    autonomyNote:
      'Level 0: teleoperated from a surgeon console',
  },
  {
    key: 'moon-surgical-maestro',
    system: 'Moon Surgical Maestro',
    focus:
      'Two-armed hold-and-position assistant for standard laparoscopic surgery',
    edge: 'Works with standard laparoscopic cameras and instruments; ScoPilot adds AI camera-following of the instrument tip (March 2025)',
    regulatory:
      'First 510(k) December 2022; commercial system cleared June 2024',
    autonomyLevel: 1,
    autonomyNote:
      'Level 1: robot assistance; ScoPilot automates camera positioning on demand while the surgeon keeps continuous control',
  },
];

/**
 * The six levels of autonomy for medical robotics proposed by Yang et al.
 * (Science Robotics 2017), mapped onto robotic surgery.
 */
export interface AutonomyLevel {
  level: 0 | 1 | 2 | 3 | 4 | 5;
  name: string;
  meaning: string;
}

export const AUTONOMY_LEVELS: readonly AutonomyLevel[] = [
  {
    level: 0,
    name: 'No autonomy',
    meaning: 'Teleoperated: the robot follows the surgeon\u2019s commands; motion scaling and tremor filtering still count as Level 0',
  },
  {
    level: 1,
    name: 'Robot assistance',
    meaning: 'The robot provides mechanical guidance during a task while the human keeps continuous control, e.g. virtual fixtures',
  },
  {
    level: 2,
    name: 'Task autonomy',
    meaning: 'The robot performs a specific task, such as suturing, that a human initiates and supervises',
  },
  {
    level: 3,
    name: 'Conditional autonomy',
    meaning: 'The robot generates task strategies; a human selects or approves among them',
  },
  {
    level: 4,
    name: 'High autonomy',
    meaning: 'A robotic resident performs surgery under a qualified doctor\u2019s supervision',
  },
  {
    level: 5,
    name: 'Full autonomy',
    meaning: 'A robotic surgeon performs entire procedures; the editorial places this in the realm of science fiction',
  },
];

/** Systems occupying a given Yang-framework autonomy level. */
export function systemAtLevel(level: number): string[] {
  return SURGICAL_SYSTEM_ROWS.filter((r) => r.autonomyLevel === level).map(
    (r) => r.system,
  );
}
