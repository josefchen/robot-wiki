/**
 * Text whose case carries meaning, so a label set in capitals must keep it
 * as written (VAL-B2-GRID-010): a word holding a lowercase Greek letter
 * (the model name π0.7 would read Π0.7, another symbol) and a unit of
 * measure written after a number (2000 mm/s would read MM/S, megametres
 * per second). Only units whose capital form means something else are
 * listed; an abbreviation such as fps reads the same in capitals.
 *
 * The prose heading wraps every match in a normal-case span, and the global
 * convergence sweep reads the same pattern against every rendered label's
 * computed casing, so the two cannot drift apart.
 */
export const CASE_SENSITIVE_PATTERN_SOURCE = String.raw`\S*[\u03B1-\u03C9\u03D1\u03D5\u03D6]\S*|(?<=\d[\s\u00A0\u202F]?)(?:mm|cm|km|nm|µm|m|ms|µs|ns|s|min|h|kg|mg|g|Hz|kHz|MHz|GHz|kN|Nm|N|rad|kW|mW|W|kWh|Wh|mAh|mV|V|mA|A|dB)(?:\/(?:s²|s2|s|h|min|m))?(?![\p{L}\p{N}])`;

/** One capture group around the pattern, for `String.prototype.split`. */
export const CASE_SENSITIVE = new RegExp(`(${CASE_SENSITIVE_PATTERN_SOURCE})`, 'u');
