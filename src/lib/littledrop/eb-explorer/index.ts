// Honeywell Experion Engineering Binder (EB) parser — pure Node-safe logic.
// Ported from LittleDropSuite C# Modules/EB Explorer (Main.cs + Structures/Tag.cs).
// Skipped: WinForms UI, licensing, PI/Raddical integration.

export interface EbTag {
  entityName: string;
  pointType: string;
  name: string;
  parameters: Record<string, string>;
  /** Original parameter insertion order — preserved for round-trip EB export */
  parameterOrder: string[];
}

export interface EbParseResult {
  fileName: string;
  tags: EbTag[];
  /** Tags grouped by pointType for tabular display */
  byPointType: Record<string, EbTag[]>;
  /** All unique column names across all tags (for "All Types" view) */
  allColumns: string[];
}

// Parameter names whose values are quoted in the EB format (e.g. PTDESC ="Desc")
// Matches Tag.QuotedParameters in C#.
export const QUOTED_PARAMS = new Set([
  'PTDESC',
  'EUDESC',
  'KEYWORD',
  'ASSOCDSP',
  '$CDETAIL',
  'USERID',
]);

// Special padding widths for EB export. Matches Tag.SpecialLengthMap in C#.
export const SPECIAL_LENGTHS: Record<string, number> = {
  PTDESC: 24,
  EUDESC: 8,
  KEYWORD: 8,
  ASSOCDSP: 8,
  $CDETAIL: 8,
  USERID: 16,
  'CISRC(1)': 32,
  'CISRC(2)': 32,
  'CISRC(3)': 32,
  'STATETXT(0)': 8,
  'STATETXT(1)': 8,
  'STATETXT(2)': 8,
  'STATETXT(3)': 8,
  'STATETXT(4)': 8,
  'STATETXT(5)': 8,
  'STATETXT(6)': 8,
  'STATETXT(7)': 8,
};

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/** Clean a key or value extracted from a split parameter line (mirrors C# cleanup). */
function cleanParam(s: string): string {
  let r = s.replace(/"/g, '').replace(/  /g, '').replace(/\r/g, '');
  if (r.endsWith(' ')) r = r.slice(0, r.length - 1);
  return r;
}

/**
 * Parse a single tag block (the text from `{SYSTEM ENTITY …` up to the next
 * `{SYSTEM ENTITY` or end of file) into an EbTag.
 * Returns null if the block is invalid or represents a GROUP entry.
 */
export function parseTagBlock(block: string): EbTag | null {
  // Skip GROUP entities (mirroring the C# `!value.Contains("GROUP")` guard)
  if (/GROUP/i.test(block)) return null;

  const entityMatch = block.match(/SYSTEM\s+ENTITY\s+([A-Za-z0-9_ ]+?)\s*\(/i);
  if (!entityMatch) return null;

  const tag: EbTag = {
    entityName: entityMatch[1].trim(),
    pointType: '',
    name: '',
    parameters: {},
    parameterOrder: [],
  };

  // &T <PointType>
  const ptMatch = block.match(/^&T\s+([A-Za-z0-9_]+)\s*$/m);
  if (ptMatch) tag.pointType = ptMatch[1].trim();

  // &N <Name>
  const nameMatch = block.match(/^&N\s+([A-Za-z0-9_]+)\s*$/m);
  if (nameMatch) tag.name = nameMatch[1].trim();

  // Parameter lines — mirrors Tag.ParseTag logic in C#
  for (const rawLine of block.split('\n')) {
    const line = rawLine.replace(/\r/g, '');
    if (!line.includes(' = ') && !line.includes(' ="')) continue;

    // Try unquoted split first, fall back to quoted
    let parts = line.split(' = ');
    if (parts.length < 2) parts = line.split(' ="');
    if (parts.length < 2) continue;

    const key = cleanParam(parts[0]);
    const val = cleanParam(parts.slice(1).join(parts.length > 2 ? ' = ' : ''));

    if (key && !(key in tag.parameters)) {
      tag.parameters[key] = val;
      tag.parameterOrder.push(key);
    }
  }

  return tag;
}

/**
 * Parse one EB file's text content into a structured result.
 * Faithfully ports the ParseEBs() logic in Main.cs.
 */
export function parseEbFile(content: string, fileName: string): EbParseResult {
  // Split into per-tag blocks at each {SYSTEM ENTITY occurrence
  const positions: number[] = [];
  const blockStartRe = /\{SYSTEM\s+ENTITY/gi;
  let m: RegExpExecArray | null;
  while ((m = blockStartRe.exec(content)) !== null) {
    positions.push(m.index);
  }

  const tags: EbTag[] = [];
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i];
    const end = i + 1 < positions.length ? positions[i + 1] : content.length;
    const block = content.slice(start, end);
    const tag = parseTagBlock(block);
    if (tag) tags.push(tag);
  }

  // Group by PointType
  const byPointType: Record<string, EbTag[]> = {};
  for (const tag of tags) {
    if (!tag.pointType) continue;
    (byPointType[tag.pointType] ??= []).push(tag);
  }

  // Collect all unique column names in insertion order (for "All Types" view)
  const seenCols = new Set<string>();
  const allColumns: string[] = [];
  for (const tag of tags) {
    for (const p of tag.parameterOrder) {
      if (!seenCols.has(p)) {
        seenCols.add(p);
        allColumns.push(p);
      }
    }
  }

  // Strip extension from fileName for display (mirrors C# `fileName.Substring(0, index)`)
  const baseName = fileName.replace(/\.[^.]+$/, '');

  return { fileName: baseName, tags, byPointType, allColumns };
}

/**
 * Merge results from multiple EB files into a single result set.
 * Returns the combined grouping plus all unique columns.
 */
export function mergeEbResults(results: EbParseResult[]): Omit<EbParseResult, 'fileName'> {
  const tags: EbTag[] = results.flatMap((r) => r.tags);
  const byPointType: Record<string, EbTag[]> = {};
  for (const tag of tags) {
    if (!tag.pointType) continue;
    (byPointType[tag.pointType] ??= []).push(tag);
  }
  const seenCols = new Set<string>();
  const allColumns: string[] = [];
  for (const tag of tags) {
    for (const p of tag.parameterOrder) {
      if (!seenCols.has(p)) {
        seenCols.add(p);
        allColumns.push(p);
      }
    }
  }
  return { tags, byPointType, allColumns };
}

// ---------------------------------------------------------------------------
// EB export (round-trip: tags → EB text)
// Mirrors ExecuteExcelToEB in Main.cs
// ---------------------------------------------------------------------------

function pad(s: string, width: number): string {
  return s + ' '.repeat(Math.max(0, width - s.length));
}

export function buildEbContent(tags: EbTag[]): string {
  const lines: string[] = [];
  for (const tag of tags) {
    if (!tag.entityName) continue;

    // {SYSTEM ENTITY <name>( )                                                    }
    const header = `{SYSTEM ENTITY ${tag.entityName}( )`;
    lines.push(pad(header, 79) + '}');

    // &T / &N lines — padded to col 79, then space
    lines.push(pad(`&T ${tag.pointType}`, 79) + ' ');
    lines.push(pad(`&N ${tag.name}`, 79) + ' ');

    for (const paramName of tag.parameterOrder) {
      const valueLen = SPECIAL_LENGTHS[paramName] ?? 8;
      const quoted = QUOTED_PARAMS.has(paramName);
      const q = quoted ? '"' : ' ';
      const val = tag.parameters[paramName] ?? '';
      const nameCol = pad(paramName, 8);
      const valPadded = val + ' '.repeat(Math.max(0, valueLen - val.length));
      lines.push(`${nameCol} =${q}${valPadded}${quoted ? q : ''}`);
    }
  }
  return lines.length === 0 ? '' : lines.join('\n') + '\n';
}
