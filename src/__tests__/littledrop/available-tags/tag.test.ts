// @vitest-environment node
// Port of C# TagTests
import { describe, it, expect } from 'vitest';
import { Tag } from '@/lib/littledrop/available-tags/tag';
import { InvalidTagException, InvalidTagFormatException } from '@/lib/littledrop/available-tags/subsections';

describe('Tag', () => {
  it('loads tag with format', () => {
    expect(new Tag('ABC123', 'CCC###').toString()).toBe('ABC123');
    expect(new Tag('ABC', 'CCC').toString()).toBe('ABC');
    expect(new Tag('123ABC1', '###CCC#').toString()).toBe('123ABC1');
  });

  it('getNextTag works', () => {
    expect(new Tag('ABC123', 'CCC###').getNextTag().toString()).toBe('ABC124');
  });

  it('getMaxLoopTag works', () => {
    expect(new Tag('ABC123', 'CCC###').getMaxLoopTag().toString()).toBe('ABC999');
  });

  it('getMinLoopTag works', () => {
    expect(new Tag('ABC123', 'CCC###').getMinLoopTag().toString()).toBe('ABC000');
  });

  it('getNextTag does not modify original', () => {
    const tag = new Tag('ABC123', 'CCC###');
    tag.getNextTag();
    expect(tag.toString()).toBe('ABC123');
  });

  it('getPreviousTag works', () => {
    expect(new Tag('ABC123', 'CCC###').getPreviousTag().toString()).toBe('ABC122');
  });

  it('getPreviousTag does not modify original', () => {
    const tag = new Tag('ABC123', 'CCC###');
    tag.getPreviousTag();
    expect(tag.toString()).toBe('ABC123');
  });

  it('throws InvalidTagFormatException on invalid format char', () => {
    expect(() => new Tag('ABC123', 'CCD###')).toThrow(InvalidTagFormatException);
  });

  it('throws InvalidTagException on tag/format char mismatch', () => {
    expect(() => new Tag('ABC123', 'CCC##C')).toThrow(InvalidTagException);
  });

  it('throws InvalidTagException on length mismatch', () => {
    expect(() => new Tag('ABC1234', 'CCC###')).toThrow(InvalidTagException);
  });

  it('next/prev follows unit → instrument → loop carry order', () => {
    // Loop overflow carries to instrument
    expect(new Tag('ABC1999', 'CCCU###').getNextTag().toString()).toBe('ABD1000');
    expect(new Tag('ABC1000', 'CCCU###').getPreviousTag().toString()).toBe('ABB1999');
    // Instrument overflow carries to unit
    expect(new Tag('ZZZ1999', 'CCCU###').getNextTag().toString()).toBe('AAA2000');
  });

  describe('compareTo', () => {
    it('works on loop section', () => {
      const t1 = new Tag('1ABC999', 'UCCC###');
      const t2 = new Tag('1ABC998', 'UCCC###');
      const t3 = new Tag('1ABC997', 'UCCC###');
      expect(t1.compareTo(t1)).toBe(0);
      expect(t1.compareTo(t2)).toBe(1);
      expect(t3.compareTo(t2)).toBe(-1);
    });

    it('works on instrument section', () => {
      const t1 = new Tag('1ABE000', 'UCCC###');
      const t2 = new Tag('1ABD000', 'UCCC###');
      const t3 = new Tag('1ABC000', 'UCCC###');
      expect(t1.compareTo(t1)).toBe(0);
      expect(t1.compareTo(t2)).toBe(1);
      expect(t3.compareTo(t2)).toBe(-1);
    });

    it('works on unit section', () => {
      const t1 = new Tag('3ABC000', 'UCCC###');
      const t2 = new Tag('2ABC000', 'UCCC###');
      const t3 = new Tag('1ABC000', 'UCCC###');
      expect(t1.compareTo(t1)).toBe(0);
      expect(t1.compareTo(t2)).toBe(1);
      expect(t3.compareTo(t2)).toBe(-1);
    });

    it('works with non-standard format order (CCCU###)', () => {
      const t1 = new Tag('ABC1999', 'CCCU###');
      const t2 = new Tag('ABC1998', 'CCCU###');
      const t3 = new Tag('ABC1997', 'CCCU###');
      expect(t1.compareTo(t1)).toBe(0);
      expect(t1.compareTo(t2)).toBe(1);
      expect(t3.compareTo(t2)).toBe(-1);
    });
  });

  it('getMinTag works', () => {
    expect(new Tag('3ABC999', 'UCCC###').getMinTag().toString()).toBe('0AAA000');
    expect(new Tag('ABC3999', 'CCCU###').getMinTag().toString()).toBe('AAA0000');
  });

  it('getMaxTag works', () => {
    expect(new Tag('3ABC999', 'UCCC###').getMaxTag().toString()).toBe('9ZZZ999');
    expect(new Tag('ABC3999', 'CCCU###').getMaxTag().toString()).toBe('ZZZ9999');
  });

  describe('getLoopCount', () => {
    it('works with only loop difference', () => {
      const t1 = new Tag('AA000', 'CC###');
      const t2 = new Tag('AA005', 'CC###');
      expect(t1.getLoopCount(t2)).toBe('6');
      expect(t2.getLoopCount(t1)).toBe('6');
    });

    it('works with only instrument difference', () => {
      let t1 = new Tag('AA000', 'CC###');
      let t2 = new Tag('AB000', 'CC###');
      expect(t1.getLoopCount(t2)).toBe('1001');
      expect(t2.getLoopCount(t1)).toBe('1001');

      t1 = new Tag('AA000', 'CC###');
      t2 = new Tag('BA000', 'CC###');
      expect(t1.getLoopCount(t2)).toBe('26001');
      expect(t2.getLoopCount(t1)).toBe('26001');
    });

    it('works with only unit difference', () => {
      let t1 = new Tag('00AA000', 'UUCC###');
      let t2 = new Tag('01AA000', 'UUCC###');
      expect(t1.getLoopCount(t2)).toBe('676001');
      expect(t2.getLoopCount(t1)).toBe('676001');

      t1 = new Tag('00AA000', 'UUCC###');
      t2 = new Tag('10AA000', 'UUCC###');
      expect(t1.getLoopCount(t2)).toBe('6760001');
      expect(t2.getLoopCount(t1)).toBe('6760001');
    });

    it('works with multi-section difference', () => {
      const t1 = new Tag('0AA000', 'UCC###');
      const t2 = new Tag('2AC499', 'UCC###');
      expect(t1.getLoopCount(t2)).toBe('1354500');
      expect(t2.getLoopCount(t1)).toBe('1354500');
    });

    it('works with odd format order', () => {
      const t1 = new Tag('AA0000', 'CCU###');
      const t2 = new Tag('AC2499', 'CCU###');
      expect(t1.getLoopCount(t2)).toBe('1354500');
      expect(t2.getLoopCount(t1)).toBe('1354500');
    });

    it('returns 1 for equal tags', () => {
      const t = new Tag('AA000', 'CC###');
      expect(t.getLoopCount(t)).toBe('1');
    });
  });
});
