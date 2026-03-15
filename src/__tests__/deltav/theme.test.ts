import { describe, it, expect } from 'vitest';
import {
  resolveThemeVariable,
  parseDVColor,
  isDarkTheme,
  parseTheme,
  THEME_FONT_COLOR,
  THEME_BACKGROUND_COLOR,
} from '@/lib/deltav/theme';
import { LiveTheme } from '@/lib/deltav/types';

describe('parseDVColor', () => {
  it('parses #AARRGGBB format (fully opaque)', () => {
    expect(parseDVColor('#FF404040')).toBe('rgb(64, 64, 64)');
  });

  it('parses #AARRGGBB format (fully opaque white)', () => {
    expect(parseDVColor('#FFFFFFFF')).toBe('rgb(255, 255, 255)');
  });

  it('parses #AARRGGBB format with alpha', () => {
    const result = parseDVColor('#80FF0000');
    expect(result).toMatch(/rgba\(255,\s*0,\s*0,/);
    expect(result).toMatch(/0\.502/); // 128/255 ≈ 0.502
  });

  it('passes through standard #RRGGBB colors unchanged', () => {
    expect(parseDVColor('#3B82F6')).toBe('#3B82F6');
  });

  it('expands #RGB shorthand', () => {
    expect(parseDVColor('#F00')).toBe('#ff0000');
  });

  it('returns transparent for empty string', () => {
    expect(parseDVColor('')).toBe('transparent');
  });

  it('passes through rgb() strings unchanged', () => {
    expect(parseDVColor('rgb(100, 200, 50)')).toBe('rgb(100, 200, 50)');
  });

  it('handles #FF000000 (black)', () => {
    expect(parseDVColor('#FF000000')).toBe('rgb(0, 0, 0)');
  });

  it('handles #FFD0D0D0 (default background)', () => {
    expect(parseDVColor('#FFD0D0D0')).toBe('rgb(208, 208, 208)');
  });
});

describe('resolveThemeVariable', () => {
  it('resolves S_DispBackColor for DEFAULT theme', () => {
    const result = resolveThemeVariable('GL.Library.S_DispBackColor', LiveTheme.DEFAULT);
    expect(result).toBe('#FFD0D0D0');
  });

  it('resolves S_DispBackColor for DG theme', () => {
    const result = resolveThemeVariable('GL.Library.S_DispBackColor', LiveTheme.DG);
    expect(result).toBe('#FF303030');
  });

  it('resolves S_DispBackColor for MOT theme', () => {
    const result = resolveThemeVariable('GL.Library.S_DispBackColor', LiveTheme.MOT);
    expect(result).toBe('#FF1A1A2E');
  });

  it('resolves S_TextColor for DEFAULT theme', () => {
    const result = resolveThemeVariable('GL.Library.S_TextColor', LiveTheme.DEFAULT);
    expect(result).toBe('#FF404040');
  });

  it('resolves S_TextColor for DG theme (dark)', () => {
    const result = resolveThemeVariable('GL.Library.S_TextColor', LiveTheme.DG);
    expect(result).toBe('#FFF2F2F2');
  });

  it('resolves S_AlarmColor for DEFAULT', () => {
    expect(resolveThemeVariable('GL.Library.S_AlarmColor', LiveTheme.DEFAULT)).toBe('#FFFF0000');
  });

  it('returns defaultValue for unknown variable', () => {
    const result = resolveThemeVariable('GL.Library.Unknown', LiveTheme.DEFAULT, '#FF123456');
    expect(result).toBe('#FF123456');
  });

  it('returns theme font color when no default provided for unknown variable', () => {
    const result = resolveThemeVariable('GL.Library.Unknown', LiveTheme.DEFAULT);
    expect(result).toBe(THEME_FONT_COLOR[LiveTheme.DEFAULT]);
  });
});

describe('isDarkTheme', () => {
  it('identifies DG as dark', () => expect(isDarkTheme(LiveTheme.DG)).toBe(true));
  it('identifies DB as dark', () => expect(isDarkTheme(LiveTheme.DB)).toBe(true));
  it('identifies MOT as dark', () => expect(isDarkTheme(LiveTheme.MOT)).toBe(true));
  it('identifies DEFAULT as light', () => expect(isDarkTheme(LiveTheme.DEFAULT)).toBe(false));
  it('identifies TAN as light', () => expect(isDarkTheme(LiveTheme.TAN)).toBe(false));
  it('identifies LB as light', () => expect(isDarkTheme(LiveTheme.LB)).toBe(false));
});

describe('parseTheme', () => {
  it('parses DEFAULT', () => expect(parseTheme('DEFAULT')).toBe(LiveTheme.DEFAULT));
  it('parses DG', () => expect(parseTheme('DG')).toBe(LiveTheme.DG));
  it('parses DB', () => expect(parseTheme('DB')).toBe(LiveTheme.DB));
  it('parses TAN', () => expect(parseTheme('TAN')).toBe(LiveTheme.TAN));
  it('parses LB', () => expect(parseTheme('LB')).toBe(LiveTheme.LB));
  it('parses MOT', () => expect(parseTheme('MOT')).toBe(LiveTheme.MOT));
  it('parses lowercase', () => expect(parseTheme('dg')).toBe(LiveTheme.DG));
  it('returns DEFAULT for null', () => expect(parseTheme(null)).toBe(LiveTheme.DEFAULT));
  it('returns DEFAULT for unknown', () => expect(parseTheme('UNKNOWN')).toBe(LiveTheme.DEFAULT));
  it('handles whitespace', () => expect(parseTheme(' MOT ')).toBe(LiveTheme.MOT));
});

describe('THEME constants', () => {
  it('all 6 themes have a font color defined', () => {
    for (const theme of Object.values(LiveTheme)) {
      expect(THEME_FONT_COLOR[theme]).toBeTruthy();
    }
  });

  it('all 6 themes have a background color defined', () => {
    for (const theme of Object.values(LiveTheme)) {
      expect(THEME_BACKGROUND_COLOR[theme]).toBeTruthy();
    }
  });

  it('dark themes have light font colors (starting with FFF)', () => {
    expect(THEME_FONT_COLOR[LiveTheme.DG]).toMatch(/^#FFF/);
    expect(THEME_FONT_COLOR[LiveTheme.DB]).toMatch(/^#FFF/);
    expect(THEME_FONT_COLOR[LiveTheme.MOT]).toMatch(/^#FFF/);
  });

  it('light themes have dark font colors (starting with #FF4)', () => {
    expect(THEME_FONT_COLOR[LiveTheme.DEFAULT]).toMatch(/^#FF[0-7]/);
    expect(THEME_FONT_COLOR[LiveTheme.TAN]).toMatch(/^#FF[0-7]/);
    expect(THEME_FONT_COLOR[LiveTheme.LB]).toMatch(/^#FF[0-7]/);
  });
});
