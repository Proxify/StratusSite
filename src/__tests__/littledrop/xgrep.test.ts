// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { xGrep, buildPattern } from '@/lib/littledrop/xgrep';

const files = [
  {
    name: 'reactor.htm',
    content: 'REACTOR_TEMP = 250\nREACTOR_PRESS = 10\nCOOLER_TEMP = 100',
  },
  {
    name: 'cooler.htm',
    content: 'COOLER_TEMP = 80\nCOOLER_FLOW = 5',
  },
  {
    name: 'empty.htm',
    content: '',
  },
];

describe('buildPattern', () => {
  it('escapes special regex chars in literal mode', () => {
    const p = buildPattern({ keyword: 'a.b', useRegex: false });
    expect(p.test('axb')).toBe(false);
    expect(p.test('a.b')).toBe(true);
  });

  it('respects caseSensitive flag', () => {
    const ci = buildPattern({ keyword: 'temp' });
    expect(ci.test('TEMP')).toBe(true);
    const cs = buildPattern({ keyword: 'temp', caseSensitive: true });
    expect(cs.test('TEMP')).toBe(false);
  });

  it('whole-word boundary works', () => {
    const p = buildPattern({ keyword: 'TEMP', wholeWord: true });
    expect(p.test('REACTOR_TEMP')).toBe(false); // part of identifier, no word boundary
    expect(p.test('TEMP = 10')).toBe(true);
  });

  it('passes raw regex in useRegex mode', () => {
    const p = buildPattern({ keyword: 'RE.*R', useRegex: true, caseSensitive: true });
    expect(p.test('REACTOR')).toBe(true);
    expect(p.test('reactor')).toBe(false);
  });
});

describe('xGrep', () => {
  it('returns empty result for blank keyword', () => {
    const r = xGrep(files, { keyword: '' });
    expect(r.files).toHaveLength(0);
    expect(r.totalMatches).toBe(0);
  });

  it('finds matching files case-insensitively by default', () => {
    const r = xGrep(files, { keyword: 'temp' });
    expect(r.files.map((f) => f.fileName)).toEqual(
      expect.arrayContaining(['reactor.htm', 'cooler.htm'])
    );
    expect(r.files.find((f) => f.fileName === 'empty.htm')).toBeUndefined();
  });

  it('counts matches per file correctly', () => {
    const r = xGrep(files, { keyword: 'temp' });
    const reactor = r.files.find((f) => f.fileName === 'reactor.htm');
    // reactor.htm: REACTOR_TEMP line + COOLER_TEMP line = 2
    expect(reactor?.matchCount).toBe(2);
    const cooler = r.files.find((f) => f.fileName === 'cooler.htm');
    expect(cooler?.matchCount).toBe(1); // only COOLER_TEMP line
  });

  it('returns correct line numbers', () => {
    const r = xGrep(files, { keyword: 'PRESS' });
    const reactor = r.files.find((f) => f.fileName === 'reactor.htm');
    expect(reactor?.matches[0].lineNumber).toBe(2);
  });

  it('case-sensitive search skips wrong-case files', () => {
    const r = xGrep(
      [{ name: 'a.htm', content: 'TEMP\ntemp' }],
      { keyword: 'TEMP', caseSensitive: true }
    );
    expect(r.files[0].matchCount).toBe(1);
    expect(r.files[0].matches[0].lineNumber).toBe(1);
  });

  it('does not include files with zero matches', () => {
    const r = xGrep(files, { keyword: 'XYZZY_NONEXISTENT' });
    expect(r.files).toHaveLength(0);
    expect(r.totalMatches).toBe(0);
  });

  it('totalMatches sums across all files', () => {
    const r = xGrep(files, { keyword: 'COOLER' });
    // cooler.htm has 2 lines with COOLER, reactor.htm has 1
    expect(r.totalMatches).toBe(3);
  });

  it('regex mode works', () => {
    const r = xGrep(files, { keyword: 'REACT.*TEMP', useRegex: true });
    expect(r.files).toHaveLength(1);
    expect(r.files[0].fileName).toBe('reactor.htm');
  });

  it('handles windows-style CRLF content', () => {
    const r = xGrep(
      [{ name: 'win.htm', content: 'LINE1\r\nFOUND\r\nLINE3' }],
      { keyword: 'FOUND' }
    );
    expect(r.files[0].matchCount).toBe(1);
    expect(r.files[0].matches[0].lineNumber).toBe(2);
  });
});
