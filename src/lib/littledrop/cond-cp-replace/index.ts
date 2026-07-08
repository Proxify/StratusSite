/**
 * Conditional CP Replace — core logic ported from LittleDrop Suite (C# Main.cs).
 * Pure, Node-safe, no DOM/WinForms dependencies.
 *
 * Processes HMI .htm graphic files: for each DIV / INPUT / TEXTAREA element,
 * evaluates up to two conditional rules against its `parameters="..."` attribute,
 * and if the full condition is met replaces a target control-point value in place.
 */

export type ConditionType =
  | 'Contains'
  | 'Does Not Contain'
  | 'Equals'
  | 'Does Not Equal'
  | 'Exists';

export type AndOrType = 'And' | 'Or';

export interface CondRule {
  cpName: string;
  condition: ConditionType;
  /** Ignored when condition is 'Exists'. */
  cpParam: string;
}

export interface ReplaceConfig {
  cond1: CondRule;
  /** When set, cond2 must also be provided. */
  andOr?: AndOrType;
  cond2?: CondRule;
  /** The CP key whose value should be replaced. */
  changeCPName: string;
  /** The new value to write. */
  changeCPParam: string;
}

export interface FileReplaceResult {
  fileName: string;
  changed: boolean;
  /** Number of element blocks that were modified. */
  replacements: number;
  modifiedContent: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Parse parameters="..." from a DIV/INPUT/TEXTAREA attribute block.
 * Replicates the C# key-stripping logic: everything up to and including
 * a '?' in the key is removed (e.g. "ATTR?CPNAME" → "CPNAME").
 */
function extractParameters(blockContent: string): Map<string, string> {
  const params = new Map<string, string>();
  const paramRe = /parameters\s*=\s*"([\s\S]*?)"/gi;

  for (const paramMatch of blockContent.matchAll(paramRe)) {
    const subValue = paramMatch[1];
    if (!subValue) continue;

    const pairs = subValue.split(';').filter(Boolean);

    for (const pair of pairs) {
      if (pair === ':') continue;

      // C# splits by ':' with RemoveEmptyEntries
      const parts = pair.split(':').filter((s) => s !== '');

      if (parts.length < 2) {
        // No value — C#: split[0].Remove(0, split[0].IndexOf(" ? ") + 1)
        const qIdx = pair.indexOf(' ? ');
        const key = qIdx >= 0 ? pair.slice(qIdx + 1) : pair;
        params.set(key, '');
      } else {
        // C#: split[0].Remove(0, split[0].IndexOf("?") + 1), split[1]
        const rawKey = parts[0];
        const qIdx = rawKey.indexOf('?');
        const key = qIdx >= 0 ? rawKey.slice(qIdx + 1) : rawKey;
        params.set(key, parts[1]);
      }
    }
  }

  return params;
}

function evalCond(params: Map<string, string>, rule: CondRule): boolean {
  const { cpName, condition, cpParam } = rule;
  switch (condition) {
    case 'Contains':
      // C# uses IndexOf with OrdinalIgnoreCase > -1
      return (
        params.has(cpName) &&
        params.get(cpName)!.toLowerCase().includes(cpParam.toLowerCase())
      );
    case 'Does Not Contain':
      return (
        params.has(cpName) &&
        !params.get(cpName)!.toLowerCase().includes(cpParam.toLowerCase())
      );
    case 'Equals':
      // C# uses .Equals() — case-sensitive
      return params.has(cpName) && params.get(cpName) === cpParam;
    case 'Does Not Equal':
      return params.has(cpName) && params.get(cpName) !== cpParam;
    case 'Exists':
      return params.has(cpName);
    default:
      return false;
  }
}

function evaluateFullCondition(
  params: Map<string, string>,
  config: ReplaceConfig
): boolean {
  const first = evalCond(params, config.cond1);
  if (!config.andOr || !config.cond2) return first;
  const second = evalCond(params, config.cond2);
  return config.andOr === 'And' ? first && second : first || second;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Process a single .htm file's text content.
 * Returns the (possibly modified) content and a replacement count.
 */
export function processHtmContent(
  content: string,
  config: ReplaceConfig
): { changed: boolean; content: string; replacements: number } {
  // Match each DIV, INPUT, or TEXTAREA opening tag (Groups mirror C# Groups[1..3])
  const blockRe = /<DIV([\s\S]*?)>|<INPUT([\s\S]*?)>|<TEXTAREA([\s\S]*?)>/gi;

  let replacements = 0;
  let result = content;

  for (const match of content.matchAll(blockRe)) {
    const value = match[1] ?? match[2] ?? match[3] ?? '';
    if (!value) continue;

    const params = extractParameters(value);
    if (params.size === 0) continue;

    if (!evaluateFullCondition(params, config)) continue;

    const { changeCPName, changeCPParam } = config;

    // C#: value.Contains(changeCPName) — plain string check
    if (!value.includes(changeCPName)) continue;

    // Find the current value for the target CP: `cpName:(.*?);`  (IgnoreCase)
    const specRe = new RegExp(`${escapeRegex(changeCPName)}:([\\s\\S]*?);`, 'gi');
    let specValue = '';
    for (const specMatch of value.matchAll(specRe)) {
      if (specMatch[1]) specValue = specMatch[1];
    }

    // Plain-string replace (C# String.Replace, replaces all occurrences)
    const newValue = value.replaceAll(
      `${changeCPName}:${specValue}`,
      `${changeCPName}:${changeCPParam}`
    );

    // Apply to the full file content
    result = result.replaceAll(value, newValue);
    replacements++;
  }

  return { changed: replacements > 0, content: result, replacements };
}

/** Convenience wrapper for multiple files (used by tests and API route). */
export function processFiles(
  files: Array<{ fileName: string; content: string }>,
  config: ReplaceConfig
): FileReplaceResult[] {
  return files.map(({ fileName, content }) => {
    const { changed, content: modifiedContent, replacements } = processHtmContent(
      content,
      config
    );
    return { fileName, changed, replacements, modifiedContent };
  });
}
