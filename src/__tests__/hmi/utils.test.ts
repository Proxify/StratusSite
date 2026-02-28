import { describe, it, expect } from 'vitest';
import {
  parseColor,
  colorToCss,
  fromHex,
  indexOfNth,
  parseBetween,
  parseContent,
  parseCssLength,
  parseInlineStyle,
  parseTagConversionMap,
} from '@/lib/hmi/utils';

describe('parseColor', () => {
  it('parses hex color #RRGGBB', () => {
    expect(parseColor('#FF0000')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(parseColor('#00FF00')).toEqual({ r: 0, g: 255, b: 0, a: 1 });
    expect(parseColor('#0000FF')).toEqual({ r: 0, g: 0, b: 255, a: 1 });
    expect(parseColor('#336699')).toEqual({ r: 51, g: 102, b: 153, a: 1 });
  });

  it('parses shorthand hex #RGB', () => {
    expect(parseColor('#F00')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(parseColor('#0F0')).toEqual({ r: 0, g: 255, b: 0, a: 1 });
  });

  it('parses rgb() format', () => {
    expect(parseColor('rgb(255, 0, 0)')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(parseColor('rgb(0,128,255)')).toEqual({ r: 0, g: 128, b: 255, a: 1 });
  });

  it('parses rgba() format', () => {
    expect(parseColor('rgba(255, 0, 0, 0.5)')).toEqual({ r: 255, g: 0, b: 0, a: 0.5 });
  });

  it('parses hex without # prefix', () => {
    expect(parseColor('FF0000')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
  });

  it('returns black for empty/invalid input', () => {
    expect(parseColor('')).toEqual({ r: 0, g: 0, b: 0, a: 1 });
    expect(parseColor('   ')).toEqual({ r: 0, g: 0, b: 0, a: 1 });
  });
});

describe('colorToCss', () => {
  it('outputs rgb() for opaque colors', () => {
    expect(colorToCss({ r: 255, g: 0, b: 0 })).toBe('rgb(255, 0, 0)');
  });

  it('outputs rgba() for transparent colors', () => {
    expect(colorToCss({ r: 255, g: 0, b: 0, a: 0.5 })).toBe('rgba(255, 0, 0, 0.5)');
  });
});

describe('fromHex', () => {
  it('converts hex to CSS color string', () => {
    expect(fromHex('#FF0000')).toBe('rgb(255, 0, 0)');
  });

  it('handles rgb() passthrough', () => {
    expect(fromHex('rgb(0, 128, 255)')).toBe('rgb(0, 128, 255)');
  });
});

describe('indexOfNth', () => {
  it('finds the Nth occurrence of a substring', () => {
    expect(indexOfNth('aXbXcXd', 'X', 1)).toBe(1);
    expect(indexOfNth('aXbXcXd', 'X', 2)).toBe(3);
    expect(indexOfNth('aXbXcXd', 'X', 3)).toBe(5);
  });

  it('returns -1 if Nth occurrence does not exist', () => {
    expect(indexOfNth('aXbXc', 'X', 5)).toBe(-1);
  });

  it('throws for nth <= 0', () => {
    expect(() => indexOfNth('abc', 'a', 0)).toThrow();
  });
});

describe('parseBetween', () => {
  it('extracts text between delimiters', () => {
    expect(parseBetween('<start>hello</start>', '<start>', '</start>')).toBe('hello');
  });

  it('returns empty string if not found', () => {
    expect(parseBetween('no match here', '<x>', '</x>')).toBe('');
  });

  it('handles multiline text', () => {
    const input = '<tag>\nline1\nline2\n</tag>';
    expect(parseBetween(input, '<tag>', '</tag>')).toContain('line1');
  });
});

describe('parseContent', () => {
  it('extracts Content tag value', () => {
    expect(parseContent('<Content>Some value</Content>')).toBe('Some value');
  });

  it('returns empty for no Content tag', () => {
    expect(parseContent('<Other>data</Other>')).toBe('');
  });
});

describe('parseCssLength', () => {
  it('parses pixel values', () => {
    expect(parseCssLength('100px')).toBe(100);
    expect(parseCssLength('25.5px')).toBe(25.5);
  });

  it('parses bare numbers', () => {
    expect(parseCssLength('42')).toBe(42);
  });

  it('returns 0 for null/undefined/empty', () => {
    expect(parseCssLength(null)).toBe(0);
    expect(parseCssLength(undefined)).toBe(0);
    expect(parseCssLength('')).toBe(0);
  });
});

describe('parseInlineStyle', () => {
  it('parses CSS inline style string', () => {
    const result = parseInlineStyle('left: 10px; top: 20px; width: 100px;');
    expect(result).toEqual({
      left: '10px',
      top: '20px',
      width: '100px',
    });
  });

  it('handles complex values', () => {
    const result = parseInlineStyle('background-color: rgb(255, 0, 0); border: 1px solid #000;');
    expect(result['background-color']).toBe('rgb(255, 0, 0)');
    expect(result['border']).toBe('1px solid #000');
  });

  it('returns empty object for empty string', () => {
    expect(parseInlineStyle('')).toEqual({});
  });
});

describe('parseTagConversionMap', () => {
  it('parses tab-separated tag map', () => {
    const content = 'F101.PV\tF101_PV\nF102.CV\tF102_CV\n';
    const map = parseTagConversionMap(content);
    expect(map.get('F101.PV')).toBe('F101_PV');
    expect(map.get('F102.CV')).toBe('F102_CV');
    expect(map.size).toBe(2);
  });

  it('skips empty lines', () => {
    const content = 'A\tB\n\n\nC\tD\n';
    const map = parseTagConversionMap(content);
    expect(map.size).toBe(2);
  });

  it('returns empty map for empty input', () => {
    expect(parseTagConversionMap('').size).toBe(0);
  });
});
