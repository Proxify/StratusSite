import { describe, it, expect } from 'vitest';
import {
  parseTagBlock,
  parseEbFile,
  mergeEbResults,
  buildEbContent,
  QUOTED_PARAMS,
  SPECIAL_LENGTHS,
} from '@/lib/littledrop/eb-explorer';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

/** Minimal single-tag EB block as produced by Honeywell Experion. */
function makeBlock(
  entity: string,
  pointType: string,
  name: string,
  params: Record<string, string> = {}
): string {
  const header = `{SYSTEM ENTITY ${entity}( )`.padEnd(79) + '}';
  const pt = `&T ${pointType}`.padEnd(79) + ' ';
  const nm = `&N ${name}`.padEnd(79) + ' ';
  const paramLines = Object.entries(params)
    .map(([k, v]) => `${k.padEnd(8)} = ${v}`)
    .join('\n');
  return [header, pt, nm, paramLines].filter(Boolean).join('\n') + '\n';
}

/** Two-tag EB file fixture. */
const TWO_TAG_EB = [
  makeBlock('FIC100', 'ANALOGINPUT', 'FIC100', { PNTFORMAT: '5', EGUL: '0.0' }),
  makeBlock('DI200', 'DIGITALINPUT', 'DI200', { PNTFORMAT: '1' }),
].join('');

/** EB file with a quoted PTDESC parameter (space-equals-doublequote format). */
const QUOTED_PARAM_EB =
  `{SYSTEM ENTITY AI_FLOW( )`.padEnd(79) +
  '}\n' +
  `&T ANALOGINPUT`.padEnd(79) +
  ' \n' +
  `&N AI_FLOW`.padEnd(79) +
  ' \n' +
  `PTDESC   ="Flow Indicator          "\n` +
  `PNTFORMAT = 5       \n`;

/** GROUP entry — should be skipped. */
const GROUP_EB =
  `{SYSTEM ENTITY MYGROUP( )`.padEnd(79) +
  '}\n' +
  `&T GROUP`.padEnd(79) +
  ' \n' +
  `&N MYGROUP`.padEnd(79) +
  ' \n';

// ---------------------------------------------------------------------------
// parseTagBlock
// ---------------------------------------------------------------------------

describe('parseTagBlock', () => {
  it('extracts entityName, pointType, name from a valid block', () => {
    const block = makeBlock('TAG1', 'ANALOGINPUT', 'TAG1');
    const tag = parseTagBlock(block);
    expect(tag).not.toBeNull();
    expect(tag!.entityName).toBe('TAG1');
    expect(tag!.pointType).toBe('ANALOGINPUT');
    expect(tag!.name).toBe('TAG1');
  });

  it('parses unquoted numeric parameters', () => {
    const block = makeBlock('FIC', 'ANALOGINPUT', 'FIC', { PNTFORMAT: '5', EGUL: '0.0' });
    const tag = parseTagBlock(block)!;
    expect(tag.parameters['PNTFORMAT']).toBe('5');
    expect(tag.parameters['EGUL']).toBe('0.0');
    expect(tag.parameterOrder).toEqual(['PNTFORMAT', 'EGUL']);
  });

  it('parses quoted parameters (space-equals-doublequote format)', () => {
    const tag = parseTagBlock(QUOTED_PARAM_EB)!;
    expect(tag).not.toBeNull();
    expect(tag.parameters['PTDESC']).toBe('Flow Indicator');
    expect(tag.parameters['PNTFORMAT']).toBe('5');
  });

  it('returns null for GROUP entities', () => {
    expect(parseTagBlock(GROUP_EB)).toBeNull();
  });

  it('returns null if no SYSTEM ENTITY header found', () => {
    expect(parseTagBlock('random text\n&T ANALOGINPUT\n')).toBeNull();
  });

  it('preserves parameter insertion order', () => {
    const block = makeBlock('T', 'AI', 'T', { ZZZ: '1', AAA: '2', MMM: '3' });
    const tag = parseTagBlock(block)!;
    expect(tag.parameterOrder).toEqual(['ZZZ', 'AAA', 'MMM']);
  });
});

// ---------------------------------------------------------------------------
// parseEbFile
// ---------------------------------------------------------------------------

describe('parseEbFile', () => {
  it('parses all tags from a multi-tag EB file', () => {
    const result = parseEbFile(TWO_TAG_EB, 'test.EB');
    expect(result.tags).toHaveLength(2);
    expect(result.fileName).toBe('test');
  });

  it('groups tags by point type', () => {
    const result = parseEbFile(TWO_TAG_EB, 'x.EB');
    expect(Object.keys(result.byPointType)).toContain('ANALOGINPUT');
    expect(Object.keys(result.byPointType)).toContain('DIGITALINPUT');
    expect(result.byPointType['ANALOGINPUT']).toHaveLength(1);
    expect(result.byPointType['DIGITALINPUT']).toHaveLength(1);
  });

  it('collects allColumns in insertion order without duplicates', () => {
    const result = parseEbFile(TWO_TAG_EB, 'x.EB');
    // PNTFORMAT appears in both tags — should appear once in allColumns
    const fmt = result.allColumns.filter((c) => c === 'PNTFORMAT');
    expect(fmt).toHaveLength(1);
  });

  it('strips file extension from fileName', () => {
    expect(parseEbFile('', 'MyExport.EB').fileName).toBe('MyExport');
    expect(parseEbFile('', 'deep.name.eb').fileName).toBe('deep.name');
  });

  it('returns empty result for an empty file', () => {
    const result = parseEbFile('', 'empty.EB');
    expect(result.tags).toHaveLength(0);
    expect(result.byPointType).toEqual({});
    expect(result.allColumns).toHaveLength(0);
  });

  it('skips GROUP entries in the file', () => {
    const content = GROUP_EB + TWO_TAG_EB;
    const result = parseEbFile(content, 'mixed.EB');
    // Only 2 real tags, not the GROUP
    expect(result.tags).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// mergeEbResults
// ---------------------------------------------------------------------------

describe('mergeEbResults', () => {
  it('merges tags from multiple files', () => {
    const r1 = parseEbFile(makeBlock('A', 'AI', 'A'), 'file1.EB');
    const r2 = parseEbFile(makeBlock('B', 'DI', 'B'), 'file2.EB');
    const merged = mergeEbResults([r1, r2]);
    expect(merged.tags).toHaveLength(2);
    expect(Object.keys(merged.byPointType)).toHaveLength(2);
  });

  it('returns empty merge for empty array', () => {
    const merged = mergeEbResults([]);
    expect(merged.tags).toHaveLength(0);
    expect(merged.allColumns).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// buildEbContent (round-trip)
// ---------------------------------------------------------------------------

describe('buildEbContent', () => {
  it('emits SYSTEM ENTITY header for each tag', () => {
    const tags = parseEbFile(TWO_TAG_EB, 'x.EB').tags;
    const out = buildEbContent(tags);
    expect(out).toContain('SYSTEM ENTITY FIC100');
    expect(out).toContain('SYSTEM ENTITY DI200');
  });

  it('emits &T and &N lines', () => {
    const tags = parseEbFile(makeBlock('TAG1', 'ANALOGINPUT', 'TAG1'), 'x.EB').tags;
    const out = buildEbContent(tags);
    expect(out).toMatch(/&T\s+ANALOGINPUT/);
    expect(out).toMatch(/&N\s+TAG1/);
  });

  it('skips tags with empty entityName', () => {
    const out = buildEbContent([
      { entityName: '', pointType: 'AI', name: 'X', parameters: {}, parameterOrder: [] },
    ]);
    expect(out).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Static config sanity checks
// ---------------------------------------------------------------------------

describe('QUOTED_PARAMS', () => {
  it('contains expected quoted parameter names', () => {
    expect(QUOTED_PARAMS.has('PTDESC')).toBe(true);
    expect(QUOTED_PARAMS.has('EUDESC')).toBe(true);
    expect(QUOTED_PARAMS.has('USERID')).toBe(true);
  });
});

describe('SPECIAL_LENGTHS', () => {
  it('has correct length for PTDESC', () => {
    expect(SPECIAL_LENGTHS['PTDESC']).toBe(24);
  });
  it('has correct length for CISRC(1)', () => {
    expect(SPECIAL_LENGTHS['CISRC(1)']).toBe(32);
  });
});
