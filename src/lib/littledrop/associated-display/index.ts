// Pure logic — no DOM, no Node fs. Node-safe (string processing only).
// Ported from LittleDropSuite/Modules/Associated Display/{Main,Associated_Display_Control}.cs

export interface AssocEntry {
  graphic: string;
  tags: string[];
  shortGraphic: string;
  xxContent: string;       // content for shortGraphic.XX file
  elContent: string;       // content for shortGraphic.EL file (one tag per line)
  cmdLine: string;         // "AS V1>shortGraphic.EL V1>shortGraphic.XX"
  cleanupLines: string[];  // dl commands for this graphic (populated when generateCleanup=true)
}

export interface AssocReport {
  entries: AssocEntry[];
  cmdFileContent: string;     // full CMD.EC content
  cleanupFileContent: string; // full CLEANUP.EC content (empty string when generateCleanup=false)
  graphicCount: number;
  tagCount: number;
  parseErrors: string[];
}

export interface AssocOptions {
  nativeLocation: string;  // e.g. "NATIVE:\WINDOW\"
  generateCleanup: boolean;
}

/**
 * Derive the short graphic name from a full graphic name.
 * Mirrors C# logic: if len > 4, strip prefix up to first "_"; else take last 4 chars.
 * Returns "NULL" for short names (len <= 4).
 * Examples: "161_S012" -> "S012", "ABCDE" -> "BCDE", "ABC" -> "NULL"
 */
export function getShortGraphic(graphic: string): string {
  if (graphic.length <= 4) return 'NULL';
  const idx = graphic.indexOf('_');
  if (idx > 0) return graphic.slice(idx + 1);
  return graphic.slice(graphic.length - 4);
}

/**
 * Parse tab-delimited file content.
 * Each non-blank line: "tag\tgraphic" (graphic is optional — defaults to "NULL").
 * Lines with 3+ columns are logged as parse errors (mirrors C# else branch).
 */
export function parseAssocFile(content: string): {
  assocMap: Map<string, string[]>;
  parseErrors: string[];
} {
  const assocMap = new Map<string, string[]>();
  const parseErrors: string[] = [];

  content.split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return; // skip blank lines

    // Split by tab, drop empty segments (mirrors StringSplitOptions.RemoveEmptyEntries)
    const parts = line.split('\t').filter((p) => p.length > 0);

    if (parts.length > 0 && parts.length < 3) {
      const tag = parts[0];
      const graphic = parts[1] ?? 'NULL';
      if (!assocMap.has(graphic)) assocMap.set(graphic, []);
      assocMap.get(graphic)!.push(tag);
    } else {
      parseErrors.push(`Line ${i + 1}: unexpected column count (${parts.length})`);
    }
  });

  return { assocMap, parseErrors };
}

/** Build the full association report from a parsed map + options. */
export function buildAssocReport(
  assocMap: Map<string, string[]>,
  options: AssocOptions,
  parseErrors: string[] = []
): AssocReport {
  const { nativeLocation, generateCleanup } = options;

  const cmdLines: string[] = [`V1 = ${nativeLocation}`];
  const cleanupLines: string[] = [];
  const entries: AssocEntry[] = [];

  // Sort graphics alphabetically (mirrors C# graphics.Sort())
  for (const graphic of [...assocMap.keys()].sort()) {
    const tags = assocMap.get(graphic)!;
    const shortGraphic = getShortGraphic(graphic);

    const xxContent = shortGraphic !== 'NULL' ? `ASSOCDSP="${graphic}"` : 'ASSOCDSP=""';
    const elContent = tags.join('\n');

    const el = `${shortGraphic}.EL`;
    const xx = `${shortGraphic}.XX`;
    const cmdLine = `AS V1>${el} V1>${xx}`;
    cmdLines.push(cmdLine);

    const entryCleanupLines: string[] = [];
    if (generateCleanup) {
      for (const ext of ['XX', 'EL', 'UL', 'SL', 'EF', 'DY']) {
        const line = `dl ${nativeLocation}>${shortGraphic}.${ext}`;
        entryCleanupLines.push(line);
        cleanupLines.push(line);
      }
    }

    entries.push({ graphic, tags, shortGraphic, xxContent, elContent, cmdLine, cleanupLines: entryCleanupLines });
  }

  // Append CMD/CLEANUP self-cleanup lines (always present in the cleanup list)
  for (const name of ['CMD.EC', 'CMD.EF', 'CMD.DY', 'CLEANUP.EC', 'CLEANUP.EF', 'CLEANUP.DY']) {
    cleanupLines.push(`dl ${nativeLocation}>${name}`);
  }

  return {
    entries,
    cmdFileContent: cmdLines.join('\n'),
    cleanupFileContent: generateCleanup ? cleanupLines.join('\n') : '',
    graphicCount: entries.length,
    tagCount: entries.reduce((s, e) => s + e.tags.length, 0),
    parseErrors,
  };
}

/** Parse content + build report in one call. */
export function processAssocDisplay(content: string, options: AssocOptions): AssocReport {
  const { assocMap, parseErrors } = parseAssocFile(content);
  return buildAssocReport(assocMap, options, parseErrors);
}
