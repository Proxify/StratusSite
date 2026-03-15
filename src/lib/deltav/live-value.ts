// LiveValue resolution — port of SCILiveConverter LiveValue property system

import { LiveValue, LiveValueSource, LiveTheme } from './types';
import { resolveThemeVariable, parseDVColor } from './theme';

/**
 * Parse a LiveValue from an XML element's attributes.
 *
 * DeltaV XML encodes LiveValue inline on the property element:
 *   <FillColor Source="Direct" Value="#FFFF0000" />
 *   <TextColor Source="ThemeRef" ThemeVariable="GL.Library.S_TextColor" DefaultValue="#FF404040" />
 *   <Tag Source="GemRef" GemVariable="Tag" DefaultValue="" />
 *   <Tag Source="Formula" Formula='DLSYS["UNIT1/FIC101/PV.CV"]' DefaultValue="0.0" />
 */
export function parseLiveValueFromElement(el: Element | null): LiveValue {
  if (!el) return { source: LiveValueSource.Direct, value: '' };

  const source = (el.getAttribute('Source') ?? 'Direct') as LiveValueSource;

  switch (source) {
    case LiveValueSource.ThemeRef:
      return {
        source: LiveValueSource.ThemeRef,
        themeVariable: el.getAttribute('ThemeVariable') ?? undefined,
        defaultValue: el.getAttribute('DefaultValue') ?? undefined,
      };

    case LiveValueSource.GemRef:
      return {
        source: LiveValueSource.GemRef,
        gemVariable: el.getAttribute('GemVariable') ?? undefined,
        defaultValue: el.getAttribute('DefaultValue') ?? undefined,
      };

    case LiveValueSource.Formula:
      return {
        source: LiveValueSource.Formula,
        formula: el.getAttribute('Formula') ?? undefined,
        defaultValue: el.getAttribute('DefaultValue') ?? undefined,
      };

    case LiveValueSource.Direct:
    default:
      return {
        source: LiveValueSource.Direct,
        value: el.getAttribute('Value') ?? '',
      };
  }
}

/**
 * Parse a LiveValue from a named child element inside `parent`.
 * Falls back to a matching attribute on `parent` if no child element found.
 */
export function parseLiveValue(parent: Element, childName: string): LiveValue {
  // querySelector :scope only works on elements with children; use manual search
  for (const child of parent.children) {
    if (child.tagName === childName) {
      return parseLiveValueFromElement(child);
    }
  }

  // Attribute fallback (e.g., <LiveRectangle FillColor="#FFFF0000" .../>)
  const attrVal = parent.getAttribute(childName);
  if (attrVal !== null) {
    return { source: LiveValueSource.Direct, value: attrVal };
  }

  return { source: LiveValueSource.Direct, value: '' };
}

/**
 * Resolve a LiveValue to a concrete string for the given theme and gem variable scope.
 *
 * - Direct   → raw value string
 * - ThemeRef → resolves GL.Library variable from theme table
 * - GemRef   → substitutes from gemVars map
 * - Formula  → extracts DLSYS["tag"] or returns default
 */
export function resolveLiveValue(
  lv: LiveValue,
  theme: LiveTheme,
  gemVars?: Record<string, string>
): string {
  switch (lv.source) {
    case LiveValueSource.Direct:
      return lv.value ?? '';

    case LiveValueSource.ThemeRef:
      return resolveThemeVariable(lv.themeVariable ?? '', theme, lv.defaultValue);

    case LiveValueSource.GemRef: {
      if (gemVars && lv.gemVariable && lv.gemVariable in gemVars) {
        return gemVars[lv.gemVariable];
      }
      return lv.defaultValue ?? '';
    }

    case LiveValueSource.Formula: {
      // Extract tag path from DLSYS["..."] / DLSYS['...'] expressions
      const formula = lv.formula ?? '';
      const match = formula.match(/DLSYS\s*\[\s*["']([^"']+)["']\s*\]/i);
      if (match) return match[1];
      return lv.defaultValue ?? formula;
    }

    default:
      return lv.value ?? lv.defaultValue ?? '';
  }
}

/**
 * Resolve a color LiveValue to a CSS color string.
 * Handles DeltaV #AARRGGBB → CSS conversion.
 */
export function resolveLiveColor(
  lv: LiveValue,
  theme: LiveTheme,
  gemVars?: Record<string, string>
): string {
  const raw = resolveLiveValue(lv, theme, gemVars);
  return parseDVColor(raw);
}

/**
 * Resolve a boolean LiveValue (e.g., Visible).
 * Treats "false" / "0" / "" as false; everything else as true.
 */
export function resolveLiveBool(
  lv: LiveValue,
  theme: LiveTheme,
  gemVars?: Record<string, string>,
  defaultVal: boolean = true
): boolean {
  const raw = resolveLiveValue(lv, theme, gemVars).trim().toLowerCase();
  if (raw === '') return defaultVal;
  return raw !== 'false' && raw !== '0';
}

/**
 * Resolve a numeric LiveValue (e.g., BorderWidth, FontSize, Opacity).
 */
export function resolveLiveNumber(
  lv: LiveValue,
  theme: LiveTheme,
  gemVars?: Record<string, string>,
  defaultVal: number = 0
): number {
  const raw = resolveLiveValue(lv, theme, gemVars);
  const n = parseFloat(raw);
  return isNaN(n) ? defaultVal : n;
}

/** Make a simple Direct LiveValue from a raw string. */
export function directValue(value: string): LiveValue {
  return { source: LiveValueSource.Direct, value };
}
