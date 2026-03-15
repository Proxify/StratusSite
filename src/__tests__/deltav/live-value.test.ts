import { describe, it, expect } from 'vitest';
import {
  parseLiveValueFromElement,
  parseLiveValue,
  resolveLiveValue,
  resolveLiveColor,
  resolveLiveBool,
  resolveLiveNumber,
  directValue,
} from '@/lib/deltav/live-value';
import { LiveValueSource, LiveTheme } from '@/lib/deltav/types';

// Helper to create a mock Element from an XML snippet
function el(xml: string): Element {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  return doc.documentElement;
}

describe('parseLiveValueFromElement', () => {
  it('parses Direct source', () => {
    const element = el('<FillColor Source="Direct" Value="#FFFF0000" />');
    const lv = parseLiveValueFromElement(element);
    expect(lv.source).toBe(LiveValueSource.Direct);
    expect(lv.value).toBe('#FFFF0000');
  });

  it('parses ThemeRef source', () => {
    const element = el('<TextColor Source="ThemeRef" ThemeVariable="GL.Library.S_TextColor" DefaultValue="#FF404040" />');
    const lv = parseLiveValueFromElement(element);
    expect(lv.source).toBe(LiveValueSource.ThemeRef);
    expect(lv.themeVariable).toBe('GL.Library.S_TextColor');
    expect(lv.defaultValue).toBe('#FF404040');
  });

  it('parses GemRef source', () => {
    const element = el('<Tag Source="GemRef" GemVariable="Tag" DefaultValue="" />');
    const lv = parseLiveValueFromElement(element);
    expect(lv.source).toBe(LiveValueSource.GemRef);
    expect(lv.gemVariable).toBe('Tag');
  });

  it('parses Formula source', () => {
    const element = el('<Tag Source="Formula" Formula="DLSYS[&quot;FIC101/PV.CV&quot;]" DefaultValue="0.0" />');
    const lv = parseLiveValueFromElement(element);
    expect(lv.source).toBe(LiveValueSource.Formula);
    expect(lv.formula).toContain('DLSYS');
    expect(lv.defaultValue).toBe('0.0');
  });

  it('defaults to Direct for missing Source attribute', () => {
    const element = el('<FillColor Value="#FF000000" />');
    const lv = parseLiveValueFromElement(element);
    expect(lv.source).toBe(LiveValueSource.Direct);
    expect(lv.value).toBe('#FF000000');
  });

  it('returns empty Direct for null input', () => {
    const lv = parseLiveValueFromElement(null);
    expect(lv.source).toBe(LiveValueSource.Direct);
    expect(lv.value).toBe('');
  });
});

describe('parseLiveValue', () => {
  it('finds child element by name', () => {
    const parent = el('<LiveRectangle><FillColor Source="Direct" Value="#FFFF0000" /></LiveRectangle>');
    const lv = parseLiveValue(parent, 'FillColor');
    expect(lv.source).toBe(LiveValueSource.Direct);
    expect(lv.value).toBe('#FFFF0000');
  });

  it('falls back to attribute on parent', () => {
    const parent = el('<LiveRectangle FillColor="#FF00FF00" />');
    const lv = parseLiveValue(parent, 'FillColor');
    expect(lv.source).toBe(LiveValueSource.Direct);
    expect(lv.value).toBe('#FF00FF00');
  });

  it('returns empty Direct when not found', () => {
    const parent = el('<LiveRectangle />');
    const lv = parseLiveValue(parent, 'FillColor');
    expect(lv.source).toBe(LiveValueSource.Direct);
    expect(lv.value).toBe('');
  });
});

describe('resolveLiveValue', () => {
  const theme = LiveTheme.DEFAULT;

  it('resolves Direct source', () => {
    const lv = directValue('hello');
    expect(resolveLiveValue(lv, theme)).toBe('hello');
  });

  it('resolves ThemeRef to theme variable', () => {
    const lv = { source: LiveValueSource.ThemeRef, themeVariable: 'GL.Library.S_TextColor' };
    const result = resolveLiveValue(lv, theme);
    expect(result).toBe('#FF404040');
  });

  it('resolves ThemeRef for DG theme', () => {
    const lv = { source: LiveValueSource.ThemeRef, themeVariable: 'GL.Library.S_TextColor' };
    const result = resolveLiveValue(lv, LiveTheme.DG);
    expect(result).toBe('#FFF2F2F2');
  });

  it('resolves GemRef from gemVars', () => {
    const lv = { source: LiveValueSource.GemRef, gemVariable: 'Tag' };
    const result = resolveLiveValue(lv, theme, { Tag: 'FIC101', FriendlyName: 'Flow' });
    expect(result).toBe('FIC101');
  });

  it('falls back to defaultValue when GemRef variable not in map', () => {
    const lv = { source: LiveValueSource.GemRef, gemVariable: 'Tag', defaultValue: 'NOTAG' };
    const result = resolveLiveValue(lv, theme, {});
    expect(result).toBe('NOTAG');
  });

  it('resolves Formula with DLSYS[] expression', () => {
    const lv = { source: LiveValueSource.Formula, formula: 'DLSYS["UNIT1/FIC101/PV.CV"]' };
    const result = resolveLiveValue(lv, theme);
    expect(result).toBe('UNIT1/FIC101/PV.CV');
  });

  it('resolves Formula with single-quoted DLSYS', () => {
    const lv = { source: LiveValueSource.Formula, formula: "DLSYS['UNIT1/TAG/OUT']" };
    const result = resolveLiveValue(lv, theme);
    expect(result).toBe('UNIT1/TAG/OUT');
  });

  it('falls back to defaultValue for unrecognized formula', () => {
    const lv = { source: LiveValueSource.Formula, formula: 'SomeExpr()', defaultValue: 'fallback' };
    const result = resolveLiveValue(lv, theme);
    expect(result).toBe('fallback');
  });
});

describe('resolveLiveColor', () => {
  it('converts DV ARGB color to CSS', () => {
    const lv = directValue('#FFFF0000');
    const result = resolveLiveColor(lv, LiveTheme.DEFAULT);
    expect(result).toBe('rgb(255, 0, 0)');
  });

  it('resolves theme color and converts to CSS', () => {
    const lv = { source: LiveValueSource.ThemeRef, themeVariable: 'GL.Library.S_DispBackColor' };
    const result = resolveLiveColor(lv, LiveTheme.DEFAULT);
    expect(result).toBe('rgb(208, 208, 208)');
  });
});

describe('resolveLiveBool', () => {
  it('resolves "true" as true', () => {
    expect(resolveLiveBool(directValue('true'), LiveTheme.DEFAULT)).toBe(true);
  });

  it('resolves "false" as false', () => {
    expect(resolveLiveBool(directValue('false'), LiveTheme.DEFAULT)).toBe(false);
  });

  it('resolves "0" as false', () => {
    expect(resolveLiveBool(directValue('0'), LiveTheme.DEFAULT)).toBe(false);
  });

  it('resolves "1" as true', () => {
    expect(resolveLiveBool(directValue('1'), LiveTheme.DEFAULT)).toBe(true);
  });

  it('uses defaultVal for empty string', () => {
    expect(resolveLiveBool(directValue(''), LiveTheme.DEFAULT, undefined, false)).toBe(false);
    expect(resolveLiveBool(directValue(''), LiveTheme.DEFAULT, undefined, true)).toBe(true);
  });
});

describe('resolveLiveNumber', () => {
  it('parses numeric string', () => {
    expect(resolveLiveNumber(directValue('42'), LiveTheme.DEFAULT)).toBe(42);
  });

  it('parses float string', () => {
    expect(resolveLiveNumber(directValue('3.14'), LiveTheme.DEFAULT)).toBe(3.14);
  });

  it('returns defaultVal for non-numeric', () => {
    expect(resolveLiveNumber(directValue('abc'), LiveTheme.DEFAULT, undefined, 99)).toBe(99);
  });

  it('returns 0 as default', () => {
    expect(resolveLiveNumber(directValue(''), LiveTheme.DEFAULT)).toBe(0);
  });
});

describe('directValue', () => {
  it('creates a Direct LiveValue', () => {
    const lv = directValue('test');
    expect(lv.source).toBe(LiveValueSource.Direct);
    expect(lv.value).toBe('test');
  });
});
