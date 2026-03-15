// DeltaV Live Theme System — port of LiveTheme color resolution

import { LiveTheme } from './types';

/** Default font (foreground) color per theme */
export const THEME_FONT_COLOR: Record<LiveTheme, string> = {
  [LiveTheme.DEFAULT]: '#FF404040',
  [LiveTheme.DG]: '#FFF2F2F2',
  [LiveTheme.DB]: '#FFF2F2F2',
  [LiveTheme.TAN]: '#FF404040',
  [LiveTheme.LB]: '#FF404040',
  [LiveTheme.MOT]: '#FFF2F2F2',
};

/** Default background color per theme */
export const THEME_BACKGROUND_COLOR: Record<LiveTheme, string> = {
  [LiveTheme.DEFAULT]: '#FFD0D0D0',
  [LiveTheme.DG]: '#FF303030',
  [LiveTheme.DB]: '#FF1E2B4A',
  [LiveTheme.TAN]: '#FFCFC39A',
  [LiveTheme.LB]: '#FFB0C8E0',
  [LiveTheme.MOT]: '#FF1A1A2E',
};

/** GL.Library variable → resolved color per theme */
const THEME_VARIABLES: Record<LiveTheme, Record<string, string>> = {
  [LiveTheme.DEFAULT]: {
    'GL.Library.S_DispBackColor': '#FFD0D0D0',
    'GL.Library.S_LineColor': '#FF404040',
    'GL.Library.S_TextColor': '#FF404040',
    'GL.Library.S_FillColor': '#FFC0C0C0',
    'GL.Library.S_HighlightColor': '#FF0000FF',
    'GL.Library.S_AlarmColor': '#FFFF0000',
    'GL.Library.S_WarningColor': '#FFFFFF00',
    'GL.Library.S_GoodColor': '#FF00C000',
    'GL.Library.S_BorderColor': '#FF808080',
    'GL.Library.S_ShadowColor': '#FF606060',
  },
  [LiveTheme.DG]: {
    'GL.Library.S_DispBackColor': '#FF303030',
    'GL.Library.S_LineColor': '#FFF2F2F2',
    'GL.Library.S_TextColor': '#FFF2F2F2',
    'GL.Library.S_FillColor': '#FF484848',
    'GL.Library.S_HighlightColor': '#FF4080FF',
    'GL.Library.S_AlarmColor': '#FFFF4040',
    'GL.Library.S_WarningColor': '#FFFFFF60',
    'GL.Library.S_GoodColor': '#FF40FF40',
    'GL.Library.S_BorderColor': '#FF909090',
    'GL.Library.S_ShadowColor': '#FF202020',
  },
  [LiveTheme.DB]: {
    'GL.Library.S_DispBackColor': '#FF1E2B4A',
    'GL.Library.S_LineColor': '#FFF2F2F2',
    'GL.Library.S_TextColor': '#FFF2F2F2',
    'GL.Library.S_FillColor': '#FF2A3D6A',
    'GL.Library.S_HighlightColor': '#FF4090FF',
    'GL.Library.S_AlarmColor': '#FFFF4040',
    'GL.Library.S_WarningColor': '#FFFFFF60',
    'GL.Library.S_GoodColor': '#FF40FF40',
    'GL.Library.S_BorderColor': '#FF5060A0',
    'GL.Library.S_ShadowColor': '#FF101828',
  },
  [LiveTheme.TAN]: {
    'GL.Library.S_DispBackColor': '#FFCFC39A',
    'GL.Library.S_LineColor': '#FF404040',
    'GL.Library.S_TextColor': '#FF404040',
    'GL.Library.S_FillColor': '#FFD0C8A0',
    'GL.Library.S_HighlightColor': '#FF0000C0',
    'GL.Library.S_AlarmColor': '#FFFF0000',
    'GL.Library.S_WarningColor': '#FFCC8800',
    'GL.Library.S_GoodColor': '#FF008000',
    'GL.Library.S_BorderColor': '#FF806040',
    'GL.Library.S_ShadowColor': '#FF907050',
  },
  [LiveTheme.LB]: {
    'GL.Library.S_DispBackColor': '#FFB0C8E0',
    'GL.Library.S_LineColor': '#FF404040',
    'GL.Library.S_TextColor': '#FF404040',
    'GL.Library.S_FillColor': '#FFC0D4E8',
    'GL.Library.S_HighlightColor': '#FF0040C0',
    'GL.Library.S_AlarmColor': '#FFFF0000',
    'GL.Library.S_WarningColor': '#FFCC8800',
    'GL.Library.S_GoodColor': '#FF008000',
    'GL.Library.S_BorderColor': '#FF608090',
    'GL.Library.S_ShadowColor': '#FF809AB0',
  },
  [LiveTheme.MOT]: {
    'GL.Library.S_DispBackColor': '#FF1A1A2E',
    'GL.Library.S_LineColor': '#FFF2F2F2',
    'GL.Library.S_TextColor': '#FFF2F2F2',
    'GL.Library.S_FillColor': '#FF16213E',
    'GL.Library.S_HighlightColor': '#FF0F3460',
    'GL.Library.S_AlarmColor': '#FFE94560',
    'GL.Library.S_WarningColor': '#FFFFD166',
    'GL.Library.S_GoodColor': '#FF06D6A0',
    'GL.Library.S_BorderColor': '#FF533483',
    'GL.Library.S_ShadowColor': '#FF0D0D1A',
  },
};

/**
 * Resolve a GL.Library theme variable to its color value.
 * Returns defaultValue (or theme font color) when variable is unknown.
 */
export function resolveThemeVariable(
  variable: string,
  theme: LiveTheme,
  defaultValue?: string
): string {
  const vars = THEME_VARIABLES[theme];
  if (vars && variable in vars) {
    return vars[variable];
  }
  return defaultValue ?? THEME_FONT_COLOR[theme];
}

/**
 * Parse a DeltaV ARGB color string (#AARRGGBB) to a CSS color string.
 * DeltaV uses ARGB byte order (opposite of CSS #RRGGBBAA).
 */
export function parseDVColor(color: string): string {
  if (!color || color.trim() === '') return 'transparent';
  const t = color.trim();

  if (t.startsWith('#') && t.length === 9) {
    // #AARRGGBB
    const a = parseInt(t.slice(1, 3), 16) / 255;
    const r = parseInt(t.slice(3, 5), 16);
    const g = parseInt(t.slice(5, 7), 16);
    const b = parseInt(t.slice(7, 9), 16);
    if (a >= 0.999) return `rgb(${r}, ${g}, ${b})`;
    return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
  }

  if (t.startsWith('#') && t.length === 7) return t;
  if (t.startsWith('#') && t.length === 4) {
    // #RGB shorthand → #RRGGBB
    const r = (t[1] + t[1]).toLowerCase();
    const g = (t[2] + t[2]).toLowerCase();
    const b = (t[3] + t[3]).toLowerCase();
    return `#${r}${g}${b}`;
  }

  // Pass through rgb()/rgba()/named colors
  return t;
}

/** True for dark themes (light foreground text). */
export function isDarkTheme(theme: LiveTheme): boolean {
  return [LiveTheme.DG, LiveTheme.DB, LiveTheme.MOT].includes(theme);
}

/** Parse a theme string from the XML attribute, with DEFAULT fallback. */
export function parseTheme(raw: string | null): LiveTheme {
  if (!raw) return LiveTheme.DEFAULT;
  const upper = raw.trim().toUpperCase();
  if (Object.values(LiveTheme).includes(upper as LiveTheme)) {
    return upper as LiveTheme;
  }
  return LiveTheme.DEFAULT;
}
