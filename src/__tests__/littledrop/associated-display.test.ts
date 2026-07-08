import { describe, it, expect } from 'vitest';
import {
  getShortGraphic,
  parseAssocFile,
  buildAssocReport,
  processAssocDisplay,
} from '@/lib/littledrop/associated-display';

// ── getShortGraphic ───────────────────────────────────────────────────────────

describe('getShortGraphic', () => {
  it('extracts suffix after underscore', () => {
    expect(getShortGraphic('161_S012')).toBe('S012');
  });

  it('takes last 4 chars when no underscore and len > 4', () => {
    expect(getShortGraphic('ABCDE')).toBe('BCDE');
  });

  it('returns NULL for 4-char names', () => {
    expect(getShortGraphic('ABCD')).toBe('NULL');
  });

  it('returns NULL for short names', () => {
    expect(getShortGraphic('AB')).toBe('NULL');
  });

  it('handles multiple underscores (uses first)', () => {
    // "161_S01_X" -> after first underscore: "S01_X"
    expect(getShortGraphic('161_S01_X')).toBe('S01_X');
  });

  it('underscore at position 0 is not treated as a separator (idx must be > 0)', () => {
    // "_ABCD" -> idx=0, not > 0, falls to slice last 4 chars -> "ABCD"
    expect(getShortGraphic('_ABCD')).toBe('ABCD');
  });
});

// ── parseAssocFile ────────────────────────────────────────────────────────────

describe('parseAssocFile', () => {
  it('parses basic tag\tgraphic lines', () => {
    const { assocMap, parseErrors } = parseAssocFile('TAG1\t161_S012\nTAG2\t161_S012\nTAG3\t162_S013');
    expect(parseErrors).toHaveLength(0);
    expect(assocMap.size).toBe(2);
    expect(assocMap.get('161_S012')).toEqual(['TAG1', 'TAG2']);
    expect(assocMap.get('162_S013')).toEqual(['TAG3']);
  });

  it('skips blank lines', () => {
    const { assocMap } = parseAssocFile('\nTAG1\t161_S012\n\n');
    expect(assocMap.size).toBe(1);
  });

  it('defaults graphic to NULL when only one column', () => {
    const { assocMap } = parseAssocFile('LONE_TAG');
    expect(assocMap.get('NULL')).toEqual(['LONE_TAG']);
  });

  it('records parse errors for 3+ column lines', () => {
    const { parseErrors } = parseAssocFile('A\tB\tC\nGOOD\tGRAPHIC');
    expect(parseErrors).toHaveLength(1);
    expect(parseErrors[0]).toMatch(/Line 1/);
  });

  it('handles CRLF line endings', () => {
    const { assocMap } = parseAssocFile('TAG1\tG1\r\nTAG2\tG2');
    expect(assocMap.size).toBe(2);
  });
});

// ── buildAssocReport ──────────────────────────────────────────────────────────

describe('buildAssocReport', () => {
  const assocMap = new Map([
    ['161_S012', ['TAG1', 'TAG2']],
    ['162_S013', ['TAG3']],
  ]);

  const opts = { nativeLocation: 'NATIVE:\\WINDOW\\', generateCleanup: false };

  it('produces one entry per graphic', () => {
    const report = buildAssocReport(assocMap, opts);
    expect(report.graphicCount).toBe(2);
  });

  it('sorts graphics alphabetically', () => {
    const report = buildAssocReport(assocMap, opts);
    expect(report.entries[0].graphic).toBe('161_S012');
    expect(report.entries[1].graphic).toBe('162_S013');
  });

  it('counts total tags', () => {
    const report = buildAssocReport(assocMap, opts);
    expect(report.tagCount).toBe(3);
  });

  it('sets correct xxContent', () => {
    const report = buildAssocReport(assocMap, opts);
    expect(report.entries[0].xxContent).toBe('ASSOCDSP="161_S012"');
  });

  it('sets elContent as newline-joined tags', () => {
    const report = buildAssocReport(assocMap, opts);
    expect(report.entries[0].elContent).toBe('TAG1\nTAG2');
  });

  it('cmdLine references EL and XX', () => {
    const report = buildAssocReport(assocMap, opts);
    expect(report.entries[0].cmdLine).toBe('AS V1>S012.EL V1>S012.XX');
  });

  it('CMD.EC starts with V1 = nativeLocation', () => {
    const report = buildAssocReport(assocMap, opts);
    expect(report.cmdFileContent.split('\n')[0]).toBe('V1 = NATIVE:\\WINDOW\\');
  });

  it('cleanupFileContent is empty when generateCleanup=false', () => {
    const report = buildAssocReport(assocMap, opts);
    expect(report.cleanupFileContent).toBe('');
  });

  it('produces cleanup lines when generateCleanup=true', () => {
    const report = buildAssocReport(assocMap, { ...opts, generateCleanup: true });
    expect(report.cleanupFileContent).toContain('dl NATIVE:\\WINDOW\\>S012.XX');
    expect(report.cleanupFileContent).toContain('dl NATIVE:\\WINDOW\\>CMD.EC');
    expect(report.cleanupFileContent).toContain('dl NATIVE:\\WINDOW\\>CLEANUP.EC');
  });

  it('sets xxContent to ASSOCDSP="" for NULL shortGraphic', () => {
    const map = new Map([['ABC', ['T1']]]);
    const report = buildAssocReport(map, opts);
    expect(report.entries[0].shortGraphic).toBe('NULL');
    expect(report.entries[0].xxContent).toBe('ASSOCDSP=""');
  });
});

// ── processAssocDisplay (integration) ─────────────────────────────────────────

describe('processAssocDisplay', () => {
  it('parses and builds from raw content', () => {
    const content = 'TAG1\t161_S012\nTAG2\t161_S012\nTAG3\t162_S013';
    const report = processAssocDisplay(content, { nativeLocation: 'NATIVE:\\WINDOW\\', generateCleanup: false });
    expect(report.graphicCount).toBe(2);
    expect(report.tagCount).toBe(3);
    expect(report.parseErrors).toHaveLength(0);
    expect(report.cmdFileContent).toContain('AS V1>S012.EL V1>S012.XX');
    expect(report.cmdFileContent).toContain('AS V1>S013.EL V1>S013.XX');
  });
});
