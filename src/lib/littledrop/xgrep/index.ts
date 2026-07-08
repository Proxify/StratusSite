// Pure xGrep logic — no DOM, no subprocess, runs in Node.
// The C# original shelled out to grep.exe (-r -l -i). We inline the same
// case-insensitive line scan here over caller-supplied file contents.

export interface XGrepOptions {
  keyword: string;
  /** Default false — mirrors C# grep -i flag */
  caseSensitive?: boolean;
  /** Default false */
  wholeWord?: boolean;
  /** Default false — treat keyword as literal string; set true for raw regex */
  useRegex?: boolean;
}

export interface XGrepMatch {
  lineNumber: number;
  lineContent: string;
}

export interface XGrepFileResult {
  fileName: string;
  matchCount: number;
  matches: XGrepMatch[];
}

export interface XGrepResult {
  files: XGrepFileResult[];
  totalMatches: number;
}

/** Build the search regex from options. Throws if useRegex and pattern is invalid. */
export function buildPattern(options: XGrepOptions): RegExp {
  const { keyword, caseSensitive = false, wholeWord = false, useRegex = false } = options;
  const flags = caseSensitive ? 'g' : 'gi';
  const source = useRegex
    ? keyword
    : keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const wrapped = wholeWord ? `\\b${source}\\b` : source;
  return new RegExp(wrapped, flags);
}

/**
 * Search an array of in-memory files for the keyword.
 * Returns only files that have at least one match.
 */
export function xGrep(
  files: { name: string; content: string }[],
  options: XGrepOptions
): XGrepResult {
  if (!options.keyword) return { files: [], totalMatches: 0 };

  const pattern = buildPattern(options);
  const fileResults: XGrepFileResult[] = [];

  for (const file of files) {
    const lines = file.content.split('\n');
    const matches: XGrepMatch[] = [];

    for (let i = 0; i < lines.length; i++) {
      pattern.lastIndex = 0; // reset global flag position each line
      if (pattern.test(lines[i])) {
        matches.push({ lineNumber: i + 1, lineContent: lines[i].trimEnd() });
      }
    }

    if (matches.length > 0) {
      fileResults.push({ fileName: file.name, matchCount: matches.length, matches });
    }
  }

  return {
    files: fileResults,
    totalMatches: fileResults.reduce((s, f) => s + f.matchCount, 0),
  };
}
