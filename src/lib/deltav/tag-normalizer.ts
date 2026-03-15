// DCS Tag Normalizer — port of SCILiveConverter GetAllDataAndDisplayLinks() logic
//
// DeltaV Live stores tag paths in several non-standard forms that must be
// normalized to standard instrument-loop format before export to Raddical/ProcessBook.
//
// Examples (raw → normalized):
//   UNIT1/FIC101/AI1/OUT        → UNIT1/FIC101.PV
//   UNIT1/FIC101/PID1/PV.CV    → UNIT1/FIC101.PV
//   UNIT1/FIC101/PID1/SP.CV    → UNIT1/FIC101.SP
//   UNIT1/FIC101/PID1/OUT.CV   → UNIT1/FIC101.OP
//   UNIT1/FIC101/MODE.ACTUAL   → UNIT1/FIC101.MODE
//   UNIT1/DI101/DI1/OUT_D      → UNIT1/DI101.PV
//   DLSYS["UNIT1/FIC101/PV.CV"] → UNIT1/FIC101.PV  (formula unwrapping)

/** Ordered list of tag suffix substitution rules (applied in sequence). */
const TAG_SUFFIX_RULES: Array<[RegExp, string]> = [
  // Remove DLSYS wrapper
  [/^DLSYS\s*\[\s*["']([^"']+)["']\s*\]/i, '$1'],

  // AI module output → .PV
  [/\/AI\d*\/OUT(_D)?$/i, '.PV'],
  [/\/AO\d*\/OUT(_D)?$/i, '.OP'],

  // PID module paths
  [/\/PID\d*\/PV\.CV$/i, '.PV'],
  [/\/PID\d*\/SP\.CV$/i, '.SP'],
  [/\/PID\d*\/OUT\.CV$/i, '.OP'],
  [/\/PID\d*\/MODE\.ACTUAL$/i, '.MODE'],
  [/\/PID\d*\/BKCAL_IN\.CV$/i, '.BKCAL'],
  [/\/PID\d*\/CAS_IN\.CV$/i, '.CAS'],

  // Generic .CV suffix on PID sub-modules
  [/\/PID\d*\//i, '/'],

  // DI / DO (discrete) module paths
  [/\/DI\d*\/OUT_D$/i, '.PV'],
  [/\/DO\d*\/OUT_D$/i, '.OP'],

  // Generic module output fallbacks
  [/\/PV\.CV$/i, '.PV'],
  [/\/SP\.CV$/i, '.SP'],
  [/\/OUT\.CV$/i, '.OP'],
  [/\/OUT_D$/i, '.PV'],
  [/\/MODE\.ACTUAL$/i, '.MODE'],
  [/\/OUT$/i, '.PV'],

  // Clean trailing slash
  [/\/$/, ''],
];

/**
 * Normalize a raw DeltaV tag path to standard instrument-loop format.
 *
 * @param raw - Raw tag path as stored in the .di.ahc file
 * @returns Normalized tag string, or the original if no rule matched
 */
export function normalizeTag(raw: string): string {
  if (!raw || raw.trim() === '') return raw;

  let tag = raw.trim();

  // Unwrap DLSYS["..."] formula
  const dlsysMatch = tag.match(/^DLSYS\s*\[\s*["']([^"']+)["']\s*\]/i);
  if (dlsysMatch) {
    tag = dlsysMatch[1].trim();
  }

  // Apply ordered substitution rules
  for (const [pattern, replacement] of TAG_SUFFIX_RULES) {
    if (pattern.source.startsWith('^DLSYS')) continue; // already handled above
    const next = tag.replace(pattern, replacement);
    if (next !== tag) {
      return next;
    }
  }

  return tag;
}

/**
 * Extract all tag paths from a DLSYS formula expression.
 * Formula may contain multiple tags: DLSYS["tag1"] + DLSYS["tag2"]
 */
export function extractTagsFromFormula(formula: string): string[] {
  const tags: string[] = [];
  const re = /DLSYS\s*\[\s*["']([^"']+)["']\s*\]/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(formula)) !== null) {
    tags.push(m[1]);
  }
  return tags;
}

/**
 * Normalize multiple tags at once.
 */
export function normalizeTags(raws: string[]): string[] {
  return raws.map(normalizeTag);
}

/**
 * Check whether a string looks like a DCS tag path (contains a slash or dot).
 */
export function isDcsTag(value: string): boolean {
  return value.includes('/') || (value.includes('.') && !value.includes(' '));
}
