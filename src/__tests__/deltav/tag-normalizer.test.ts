import { describe, it, expect } from 'vitest';
import {
  normalizeTag,
  extractTagsFromFormula,
  normalizeTags,
  isDcsTag,
} from '@/lib/deltav/tag-normalizer';

describe('normalizeTag — AI module', () => {
  it('normalizes /AI1/OUT to .PV', () => {
    expect(normalizeTag('UNIT1/FIC101/AI1/OUT')).toBe('UNIT1/FIC101.PV');
  });

  it('normalizes /AI2/OUT to .PV', () => {
    expect(normalizeTag('AREA/TAG/AI2/OUT')).toBe('AREA/TAG.PV');
  });

  it('normalizes /AI1/OUT_D to .PV (discrete variant)', () => {
    expect(normalizeTag('UNIT1/DI101/AI1/OUT_D')).toBe('UNIT1/DI101.PV');
  });

  it('normalizes /AO1/OUT to .OP', () => {
    expect(normalizeTag('UNIT1/FIC101/AO1/OUT')).toBe('UNIT1/FIC101.OP');
  });
});

describe('normalizeTag — PID module', () => {
  it('normalizes /PID1/PV.CV to .PV', () => {
    expect(normalizeTag('UNIT1/FIC101/PID1/PV.CV')).toBe('UNIT1/FIC101.PV');
  });

  it('normalizes /PID1/SP.CV to .SP', () => {
    expect(normalizeTag('UNIT1/FIC101/PID1/SP.CV')).toBe('UNIT1/FIC101.SP');
  });

  it('normalizes /PID1/OUT.CV to .OP', () => {
    expect(normalizeTag('UNIT1/FIC101/PID1/OUT.CV')).toBe('UNIT1/FIC101.OP');
  });

  it('normalizes /PID1/MODE.ACTUAL to .MODE', () => {
    expect(normalizeTag('UNIT1/FIC101/PID1/MODE.ACTUAL')).toBe('UNIT1/FIC101.MODE');
  });
});

describe('normalizeTag — generic suffixes', () => {
  it('normalizes /PV.CV to .PV', () => {
    expect(normalizeTag('UNIT1/TAG/PV.CV')).toBe('UNIT1/TAG.PV');
  });

  it('normalizes /SP.CV to .SP', () => {
    expect(normalizeTag('UNIT1/TAG/SP.CV')).toBe('UNIT1/TAG.SP');
  });

  it('normalizes /OUT.CV to .OP', () => {
    expect(normalizeTag('UNIT1/TAG/OUT.CV')).toBe('UNIT1/TAG.OP');
  });

  it('normalizes /MODE.ACTUAL to .MODE', () => {
    expect(normalizeTag('UNIT1/TAG/MODE.ACTUAL')).toBe('UNIT1/TAG.MODE');
  });

  it('normalizes /OUT to .PV', () => {
    expect(normalizeTag('UNIT1/TAG/OUT')).toBe('UNIT1/TAG.PV');
  });

  it('normalizes /DI1/OUT_D to .PV (discrete)', () => {
    expect(normalizeTag('UNIT1/DI101/DI1/OUT_D')).toBe('UNIT1/DI101.PV');
  });

  it('normalizes /DO1/OUT_D to .OP', () => {
    expect(normalizeTag('UNIT1/DO101/DO1/OUT_D')).toBe('UNIT1/DO101.OP');
  });
});

describe('normalizeTag — DLSYS formula unwrapping', () => {
  it('unwraps DLSYS["..."] and normalizes inner tag', () => {
    const result = normalizeTag('DLSYS["UNIT1/FIC101/PV.CV"]');
    expect(result).toBe('UNIT1/FIC101.PV');
  });

  it('unwraps DLSYS with single quotes', () => {
    const result = normalizeTag("DLSYS['UNIT1/FIC101/SP.CV']");
    expect(result).toBe('UNIT1/FIC101.SP');
  });

  it('handles DLSYS with spaces', () => {
    const result = normalizeTag('DLSYS[ "UNIT1/FIC101/OUT.CV" ]');
    expect(result).toBe('UNIT1/FIC101.OP');
  });
});

describe('normalizeTag — passthrough cases', () => {
  it('passes through already-normalized tags', () => {
    expect(normalizeTag('UNIT1/FIC101.PV')).toBe('UNIT1/FIC101.PV');
  });

  it('returns empty string for empty input', () => {
    expect(normalizeTag('')).toBe('');
  });

  it('trims whitespace', () => {
    expect(normalizeTag('  UNIT1/TAG.PV  ')).toBe('UNIT1/TAG.PV');
  });

  it('returns tag unchanged when no rule matches', () => {
    expect(normalizeTag('PLAIN_TAG')).toBe('PLAIN_TAG');
  });
});

describe('extractTagsFromFormula', () => {
  it('extracts a single tag', () => {
    const tags = extractTagsFromFormula('DLSYS["UNIT1/FIC101/PV.CV"]');
    expect(tags).toEqual(['UNIT1/FIC101/PV.CV']);
  });

  it('extracts multiple tags', () => {
    const tags = extractTagsFromFormula('DLSYS["TAG1/PV.CV"] + DLSYS["TAG2/SP.CV"]');
    expect(tags).toHaveLength(2);
    expect(tags[0]).toBe('TAG1/PV.CV');
    expect(tags[1]).toBe('TAG2/SP.CV');
  });

  it('returns empty array for no tags', () => {
    expect(extractTagsFromFormula('42 + 100')).toEqual([]);
  });

  it('handles single-quoted tags', () => {
    const tags = extractTagsFromFormula("DLSYS['UNIT1/TAG/OUT']");
    expect(tags).toEqual(['UNIT1/TAG/OUT']);
  });
});

describe('normalizeTags', () => {
  it('normalizes an array of tags', () => {
    const result = normalizeTags(['UNIT1/FIC101/PID1/PV.CV', 'UNIT1/FIC101/PID1/SP.CV']);
    expect(result).toEqual(['UNIT1/FIC101.PV', 'UNIT1/FIC101.SP']);
  });

  it('handles empty array', () => {
    expect(normalizeTags([])).toEqual([]);
  });
});

describe('isDcsTag', () => {
  it('identifies slash-separated paths as DCS tags', () => {
    expect(isDcsTag('UNIT1/FIC101/PV.CV')).toBe(true);
  });

  it('identifies dot-notation tags', () => {
    expect(isDcsTag('FIC101.PV')).toBe(true);
  });

  it('rejects plain strings without separator', () => {
    expect(isDcsTag('Hello World')).toBe(false);
  });

  it('rejects plain numbers', () => {
    expect(isDcsTag('42')).toBe(false);
  });
});
