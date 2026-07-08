// @vitest-environment node
// Port of C# AlphaTagSubsectionTests + NumericTagSubsectionTests
import { describe, it, expect } from 'vitest';
import {
  AlphaTagSubsection,
  NumericTagSubsection,
  TagSubsectionType,
  InvalidTagException,
} from '@/lib/littledrop/available-tags/subsections';

// ---------------------------------------------------------------------------
// AlphaTagSubsectionTests
// ---------------------------------------------------------------------------
describe('AlphaTagSubsection', () => {
  it('is always converted to upper case', () => {
    const lower = new AlphaTagSubsection(['a', 'b', 'c'], TagSubsectionType.Instrument);
    expect(lower.toString()).toBe('ABC');

    const upper = new AlphaTagSubsection(['A', 'B', 'C'], TagSubsectionType.Instrument);
    expect(upper.toString()).toBe('ABC');
  });

  it('toMaximumSection works', () => {
    const s = new AlphaTagSubsection(['a', 'b', 'c'], TagSubsectionType.Instrument);
    s.toMaximumSection();
    expect(s.toString()).toBe('ZZZ');
  });

  it('toMinimumSection works', () => {
    const s = new AlphaTagSubsection(['a', 'b', 'c'], TagSubsectionType.Instrument);
    s.toMinimumSection();
    expect(s.toString()).toBe('AAA');
  });

  describe('increment', () => {
    it('works normally', () => {
      const s = new AlphaTagSubsection(['A', 'A'], TagSubsectionType.Instrument);
      s.increment();
      expect(s.toString()).toBe('AB');
    });

    it('works with overflow carry', () => {
      const s1 = new AlphaTagSubsection(['A', 'Z'], TagSubsectionType.Instrument);
      s1.increment();
      expect(s1.toString()).toBe('BA');

      const s2 = new AlphaTagSubsection(['Z', 'Z'], TagSubsectionType.Instrument);
      s2.increment();
      expect(s2.toString()).toBe('AA');
    });

    it('returns true on max overflow', () => {
      const s = new AlphaTagSubsection(['Z', 'Z'], TagSubsectionType.Instrument);
      expect(s.increment()).toBe(true);
    });

    it('returns false normally', () => {
      const s = new AlphaTagSubsection(['A', 'Z'], TagSubsectionType.Instrument);
      expect(s.increment()).toBe(false);
    });
  });

  describe('decrement', () => {
    it('works normally', () => {
      const s = new AlphaTagSubsection(['Z', 'Z'], TagSubsectionType.Instrument);
      s.decrement();
      expect(s.toString()).toBe('ZY');
    });

    it('works with underflow carry', () => {
      const s1 = new AlphaTagSubsection(['Z', 'A'], TagSubsectionType.Instrument);
      s1.decrement();
      expect(s1.toString()).toBe('YZ');

      const s2 = new AlphaTagSubsection(['A', 'A'], TagSubsectionType.Instrument);
      s2.decrement();
      expect(s2.toString()).toBe('ZZ');
    });

    it('returns true on max underflow', () => {
      const s = new AlphaTagSubsection(['A', 'A'], TagSubsectionType.Instrument);
      expect(s.decrement()).toBe(true);
    });

    it('returns false normally', () => {
      const s = new AlphaTagSubsection(['Z', 'Z'], TagSubsectionType.Instrument);
      expect(s.decrement()).toBe(false);
    });
  });

  it('throws InvalidTagException on illegal character', () => {
    expect(() => new AlphaTagSubsection(['A', 'B', '1'], TagSubsectionType.Instrument))
      .toThrow(InvalidTagException);
  });
});

// ---------------------------------------------------------------------------
// NumericTagSubsectionTests
// ---------------------------------------------------------------------------
describe('NumericTagSubsection', () => {
  it('toMaximumSection works', () => {
    const s = new NumericTagSubsection(['1', '2', '3'], TagSubsectionType.Loop);
    s.toMaximumSection();
    expect(s.toString()).toBe('999');
  });

  it('toMinimumSection works', () => {
    const s = new NumericTagSubsection(['1', '2', '3'], TagSubsectionType.Loop);
    s.toMinimumSection();
    expect(s.toString()).toBe('000');
  });

  describe('increment', () => {
    it('works normally', () => {
      const s = new NumericTagSubsection(['0', '0'], TagSubsectionType.Loop);
      s.increment();
      expect(s.toString()).toBe('01');
    });

    it('works with overflow carry', () => {
      const s1 = new NumericTagSubsection(['0', '9'], TagSubsectionType.Loop);
      s1.increment();
      expect(s1.toString()).toBe('10');

      const s2 = new NumericTagSubsection(['9', '9'], TagSubsectionType.Loop);
      s2.increment();
      expect(s2.toString()).toBe('00');
    });

    it('returns true on max overflow', () => {
      const s = new NumericTagSubsection(['9', '9'], TagSubsectionType.Loop);
      expect(s.increment()).toBe(true);
    });

    it('returns false normally', () => {
      const s = new NumericTagSubsection(['0', '9'], TagSubsectionType.Loop);
      expect(s.increment()).toBe(false);
    });
  });

  describe('decrement', () => {
    it('works normally', () => {
      const s = new NumericTagSubsection(['9', '9'], TagSubsectionType.Loop);
      s.decrement();
      expect(s.toString()).toBe('98');
    });

    it('works with underflow carry', () => {
      const s1 = new NumericTagSubsection(['9', '0'], TagSubsectionType.Loop);
      s1.decrement();
      expect(s1.toString()).toBe('89');

      const s2 = new NumericTagSubsection(['0', '0'], TagSubsectionType.Loop);
      s2.decrement();
      expect(s2.toString()).toBe('99');
    });

    it('returns true on max underflow', () => {
      const s = new NumericTagSubsection(['0', '0'], TagSubsectionType.Loop);
      expect(s.decrement()).toBe(true);
    });

    it('returns false normally', () => {
      const s = new NumericTagSubsection(['9', '9'], TagSubsectionType.Loop);
      expect(s.decrement()).toBe(false);
    });
  });

  it('throws InvalidTagException on illegal character', () => {
    expect(() => new NumericTagSubsection(['1', '2', 'A'], TagSubsectionType.Loop))
      .toThrow(InvalidTagException);
  });
});
