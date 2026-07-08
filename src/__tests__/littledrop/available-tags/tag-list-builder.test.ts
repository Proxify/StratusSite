// @vitest-environment node
// Port of C# TagListBuilderTests
import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildTagListForAvailableTagTable,
  buildTagListForInstrumentAvailableTagTable,
  buildTagListForUniqueAvailableTagTable,
  buildAvailableTagList,
  extractTagsFromText,
  buildTagRegex,
} from '@/lib/littledrop/available-tags/tag-list-builder';

describe('TagListBuilder', () => {
  let rawTags: string[];
  let tagFormat: string;

  beforeEach(() => {
    tagFormat = 'UUUCC###';
    rawTags = ['123BB321', '123BC321', '123AA123', '123AB123'];
  });

  // -----------------------------------------------------------------------
  // buildTagListForAvailableTagTable
  // -----------------------------------------------------------------------
  describe('buildTagListForAvailableTagTable', () => {
    it('builds and returns sorted tag list', () => {
      const tags = buildTagListForAvailableTagTable(rawTags, tagFormat);
      expect(tags).toHaveLength(4);
      expect(tags[0].toString()).toBe('123AA123');
      expect(tags[1].toString()).toBe('123AB123');
      expect(tags[2].toString()).toBe('123BB321');
      expect(tags[3].toString()).toBe('123BC321');
    });

    it('sorts by unit → instrument → loop', () => {
      const tags = buildTagListForAvailableTagTable(['AA200', 'BB100', 'AA201'], 'CCU##');
      expect(tags[0].toString()).toBe('BB100');
      expect(tags[1].toString()).toBe('AA200');
      expect(tags[2].toString()).toBe('AA201');
    });
  });

  // -----------------------------------------------------------------------
  // buildTagListForInstrumentAvailableTagTable
  // -----------------------------------------------------------------------
  describe('buildTagListForInstrumentAvailableTagTable', () => {
    it('collapses multi-char instrument to single char and deduplicates', () => {
      const tags = buildTagListForInstrumentAvailableTagTable(rawTags, tagFormat);
      expect(tags).toHaveLength(2);
      expect(tags[0].toString()).toBe('123A123');
      expect(tags[1].toString()).toBe('123B321');
    });

    it('sorts properly', () => {
      const tags = buildTagListForInstrumentAvailableTagTable(['AA200', 'BB100', 'AA201'], 'CCU##');
      expect(tags[0].toString()).toBe('B100');
      expect(tags[1].toString()).toBe('A200');
      expect(tags[2].toString()).toBe('A201');
    });
  });

  // -----------------------------------------------------------------------
  // buildTagListForUniqueAvailableTagTable
  // -----------------------------------------------------------------------
  describe('buildTagListForUniqueAvailableTagTable', () => {
    it('strips all alpha chars and deduplicates', () => {
      const tags = buildTagListForUniqueAvailableTagTable(rawTags, tagFormat);
      expect(tags).toHaveLength(2);
      expect(tags[0].toString()).toBe('123123');
      expect(tags[1].toString()).toBe('123321');
    });

    it('sorts properly', () => {
      const tags = buildTagListForUniqueAvailableTagTable(['AA002', 'BB001', 'AA012'], 'CC##U');
      expect(tags[0].toString()).toBe('001');
      expect(tags[1].toString()).toBe('002');
      expect(tags[2].toString()).toBe('012');
    });
  });

  // -----------------------------------------------------------------------
  // buildAvailableTagList
  // -----------------------------------------------------------------------
  describe('buildAvailableTagList', () => {
    it('finds available ranges — UCC### format', () => {
      const format = 'UCC###';
      const raw = ['1AB000', '1AB002', '1AB100'];
      const tags = buildTagListForAvailableTagTable(raw, format);
      const info = buildAvailableTagList(tags);

      expect(info[0].availableTagRange).toBe('0AA000-1AA999');
      expect(info[1].availableTagRange).toBe('1AB001');
      expect(info[2].availableTagRange).toBe('1AB003-1AB099');
      expect(info[3].availableTagRange).toBe('1AB101-1AB999');
      expect(info[4].availableTagRange).toBe('1AC000-9ZZ999');
    });

    it('finds available ranges — UUCC### format', () => {
      const format = 'UUCC###';
      const raw = ['82TI174', '82TI176', '00AI001'];
      const tags = buildTagListForAvailableTagTable(raw, format);
      const info = buildAvailableTagList(tags);

      expect(info[0].availableTagRange).toBe('00AA000-00AI000');
      expect(info[1].availableTagRange).toBe('00AI002-00AI999');
      expect(info[2].availableTagRange).toBe('00AJ000-82TH999');
      expect(info[3].availableTagRange).toBe('82TI000-82TI173');
      expect(info[4].availableTagRange).toBe('82TI175');
      expect(info[5].availableTagRange).toBe('82TI177-82TI999');
      expect(info[6].availableTagRange).toBe('82TJ000-99ZZ999');
    });

    it('finds available ranges — odd format CCU###', () => {
      const format = 'CCU###';
      const raw = ['AB1000', 'AB1002', 'AB1100'];
      const tags = buildTagListForAvailableTagTable(raw, format);
      const info = buildAvailableTagList(tags);

      expect(info[0].availableTagRange).toBe('AA0000-AA1999');
      expect(info[1].availableTagRange).toBe('AB1001');
      expect(info[2].availableTagRange).toBe('AB1003-AB1099');
      expect(info[3].availableTagRange).toBe('AB1101-AB1999');
      expect(info[4].availableTagRange).toBe('AC1000-ZZ9999');
    });

    it('finds available ranges — CCUU### format', () => {
      const format = 'CCUU###';
      const raw = ['TI82174', 'TI82176', 'AI00001'];
      const tags = buildTagListForAvailableTagTable(raw, format);
      const info = buildAvailableTagList(tags);

      expect(info[0].availableTagRange).toBe('AA00000-AI00000');
      expect(info[1].availableTagRange).toBe('AI00002-AI00999');
      expect(info[2].availableTagRange).toBe('AJ00000-TH82999');
      expect(info[3].availableTagRange).toBe('TI82000-TI82173');
      expect(info[4].availableTagRange).toBe('TI82175');
      expect(info[5].availableTagRange).toBe('TI82177-TI82999');
      expect(info[6].availableTagRange).toBe('TJ82000-ZZ99999');
    });

    it('finds available ranges — CC### (no unit section)', () => {
      let format = 'CC###';
      let raw = ['AB000', 'AB002', 'AB100'];
      let tags = buildTagListForAvailableTagTable(raw, format);
      let info = buildAvailableTagList(tags);

      expect(info[0].availableTagRange).toBe('AA000-AA999');
      expect(info[1].availableTagRange).toBe('AB001');
      expect(info[2].availableTagRange).toBe('AB003-AB099');
      expect(info[3].availableTagRange).toBe('AB101-AB999');
      expect(info[4].availableTagRange).toBe('AC000-ZZ999');

      format = 'CC###';
      raw = ['TI174', 'TI176', 'AI001'];
      tags = buildTagListForAvailableTagTable(raw, format);
      info = buildAvailableTagList(tags);

      expect(info[0].availableTagRange).toBe('AA000-AI000');
      expect(info[1].availableTagRange).toBe('AI002-AI999');
      expect(info[2].availableTagRange).toBe('AJ000-TH999');
      expect(info[3].availableTagRange).toBe('TI000-TI173');
      expect(info[4].availableTagRange).toBe('TI175');
      expect(info[5].availableTagRange).toBe('TI177-TI999');
      expect(info[6].availableTagRange).toBe('TJ000-ZZ999');
    });

    it('finds available ranges — U### (no instrument section)', () => {
      let format = 'U###';
      let raw = ['1000', '1002', '1100'];
      let tags = buildTagListForAvailableTagTable(raw, format);
      let info = buildAvailableTagList(tags);

      expect(info[0].availableTagRange).toBe('0000-0999');
      expect(info[1].availableTagRange).toBe('1001');
      expect(info[2].availableTagRange).toBe('1003-1099');
      expect(info[3].availableTagRange).toBe('1101-1999');
      expect(info[4].availableTagRange).toBe('2000-9999');

      format = 'UU###';
      raw = ['82174', '82176', '00001'];
      tags = buildTagListForAvailableTagTable(raw, format);
      info = buildAvailableTagList(tags);

      expect(info[0].availableTagRange).toBe('00000');
      expect(info[1].availableTagRange).toBe('00002-00999');
      expect(info[2].availableTagRange).toBe('01000-81999');
      expect(info[3].availableTagRange).toBe('82000-82173');
      expect(info[4].availableTagRange).toBe('82175');
      expect(info[5].availableTagRange).toBe('82177-82999');
      expect(info[6].availableTagRange).toBe('83000-99999');

      format = 'UU###';
      raw = ['00000', '00001', '00004', '01420'];
      tags = buildTagListForAvailableTagTable(raw, format);
      info = buildAvailableTagList(tags);

      expect(info[0].availableTagRange).toBe('00002-00003');
      expect(info[1].availableTagRange).toBe('00005-00999');
      expect(info[2].availableTagRange).toBe('01000-01419');
    });

    it('finds available ranges — ### (no unit or instrument)', () => {
      let format = '###';
      let raw = ['000', '002', '100'];
      let tags = buildTagListForAvailableTagTable(raw, format);
      let info = buildAvailableTagList(tags);

      expect(info[0].availableTagRange).toBe('001');
      expect(info[1].availableTagRange).toBe('003-099');
      expect(info[2].availableTagRange).toBe('101-999');

      format = '###';
      raw = ['174', '176', '001'];
      tags = buildTagListForAvailableTagTable(raw, format);
      info = buildAvailableTagList(tags);

      expect(info[0].availableTagRange).toBe('000');
      expect(info[1].availableTagRange).toBe('002-173');
      expect(info[2].availableTagRange).toBe('175');
      expect(info[3].availableTagRange).toBe('177-999');
    });
  });
});

// ---------------------------------------------------------------------------
// extractTagsFromText + buildTagRegex
// ---------------------------------------------------------------------------
describe('extractTagsFromText', () => {
  it('extracts tags matching format from text', () => {
    const text = '82TI174\n82TI175\n00AI001\nnot-a-tag\n82TI176';
    const tags = extractTagsFromText(text, 'UUCC###');
    expect(tags.sort()).toEqual(['00AI001', '82TI174', '82TI175', '82TI176'].sort());
  });

  it('deduplicates tags', () => {
    const text = '82TI174\n82TI174\n82TI175';
    const tags = extractTagsFromText(text, 'UUCC###');
    expect(tags.filter(t => t === '82TI174')).toHaveLength(1);
  });

  it('normalizes to uppercase', () => {
    const text = '82ti174\n82TI175';
    const tags = extractTagsFromText(text, 'UUCC###');
    expect(tags).toContain('82TI174');
    expect(tags).toContain('82TI175');
  });

  it('only matches at start of line', () => {
    const text = ' 82TI174\nX82TI175\n82TI176';
    const tags = extractTagsFromText(text, 'UUCC###');
    // Leading space and prefix X prevent matching
    expect(tags).toEqual(['82TI176']);
  });
});

describe('buildTagRegex', () => {
  it('throws on unknown format char', () => {
    expect(() => buildTagRegex('X##')).toThrow();
  });
});
