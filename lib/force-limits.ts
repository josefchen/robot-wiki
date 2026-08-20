/**
 * Shared contact-force limit constants for compliant-contact
 * interactives. The impedance lab on /classical/control and the
 * safety-coverage instrument on the frontier side both render the same
 * power-and-force-limiting reference quantity; VAL-FRONT-029 requires the
 * two rendered strings to be identical character for character with the
 * same stated basis, so the constants and the rendered strings live HERE,
 * once, and both components import them instead of recomputing.
 *
 * Honesty ceiling (binding): ISO/TS 15066 itself is paywalled and this
 * project does not purchase standards, so no clause, table or numeric
 * limit from the technical specification is quoted or paraphrased here.
 * The numeric limit below comes from the published biomechanical research
 * literature: Han et al. (2024), Frontiers in Robotics and AI,
 * 10.3389/frobt.2024.1374999, measured force pain thresholds by impact
 * (transient contact) on 37 subjects and reported 75th-percentile
 * biomechanical limits per body region and contact geometry; their
 * W-R5-on-thigh (blunt end-effector contact with the upper leg) value is
 * 255 N. The visible label names this research basis explicitly rather
 * than attributing the number to the standard's own table.
 */

/** 75th-percentile transient-contact force pain threshold, W-R5 impactor
 * on the thigh, from Han et al. (2024). Newtons. */
export const TRANSIENT_CONTACT_LIMIT_N = 255;

/** Body region the transient limit above is stated for. */
export const TRANSIENT_CONTACT_REGION = 'thigh';

/**
 * The rendered reference-line label for the transient contact-force limit,
 * naming the research basis (not the paywalled standard's table). Both the
 * impedance lab and any frontier safety instrument render THIS string.
 */
export const TRANSIENT_CONTACT_LIMIT_LABEL = `contact-force limit 255 N (thigh, transient contact; research basis: 75th-percentile force pain threshold, Han 2024)`;

/**
 * The citation registry id backing the transient limit. Imported by the
 * components' captions so the rendered chip id and the label stay paired.
 */
export const TRANSIENT_CONTACT_LIMIT_CITATION = 'han-force-pain-2024';
