/**
 * DeltaV Live Parser — parses .di.ahc XML files into the DVLive object model.
 *
 * .di.ahc files are XML documents produced by Emerson DeltaV Live. The root
 * element is <LiveGraphic> and contains nested <Objects> with typed child
 * elements (LiveRectangle, LiveText, LiveGem, etc.).
 *
 * Coordinates are stored in EMU (English Metric Units) and must be divided by
 * the graphicDivisor for the chosen conversion mode to get pixel values.
 *
 * LiveValue properties are encoded as child elements with Source/Value/
 * ThemeVariable/GemVariable/Formula attributes.
 */

import {
  type DVGraphic,
  type DVObjectUnion,
  type DVObjectBase,
  type DVRectangle,
  type DVEllipse,
  type DVArc,
  type DVLine,
  type DVPolygon,
  type DVFreeform,
  type DVTriangle,
  type DVTrapezoid,
  type DVRoundedRectangle,
  type DVConnector,
  type DVImage,
  type DVButton,
  type DVDataLink,
  type DVDisplayLink,
  type DVText,
  type DVGroup,
  type DVGem,
  type DVGemOverride,
  type LiveValue,
  ConversionType,
  GRAPHIC_DIVISORS,
  LiveTheme,
  LiveValueSource,
} from './types';
import { parseLiveValue, directValue } from './live-value';
import { parseTheme, parseDVColor, THEME_BACKGROUND_COLOR } from './theme';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse a .di.ahc XML string into a DVGraphic object model.
 *
 * @param xmlContent  Raw XML file content
 * @param fileName    Source file name (used to derive graphic name)
 * @param mode        Conversion mode — determines the EMU/pixel divisor
 */
export function parseDVFile(
  xmlContent: string,
  fileName: string = 'untitled',
  mode: ConversionType = ConversionType.RENDER
): DVGraphic {
  const divisor = GRAPHIC_DIVISORS[mode];

  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, 'application/xml');

  // Detect XML parse errors
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error(`XML parse error in ${fileName}: ${parseError.textContent?.slice(0, 200)}`);
  }

  const root = doc.documentElement;
  if (!root) {
    throw new Error(`Empty document: ${fileName}`);
  }

  // Root may be <LiveGraphic> directly or wrapped
  const graphicEl =
    root.tagName === 'LiveGraphic' ? root : root.querySelector('LiveGraphic');

  if (!graphicEl) {
    throw new Error(`No <LiveGraphic> element found in ${fileName}`);
  }

  const name = fileName.replace(/\.di\.ahc$/i, '').replace(/\.ahc$/i, '');
  const width = parseEMU(graphicEl.getAttribute('Width'), divisor);
  const height = parseEMU(graphicEl.getAttribute('Height'), divisor);
  const theme = parseTheme(graphicEl.getAttribute('Theme'));
  const rawBgColor = graphicEl.getAttribute('BackColor') ?? graphicEl.getAttribute('BackgroundColor');
  const backgroundColor = rawBgColor
    ? parseDVColor(rawBgColor)
    : parseDVColor(THEME_BACKGROUND_COLOR[theme]);

  const objectsEl = graphicEl.querySelector(':scope > Objects') ?? graphicEl;
  const objects = parseObjectList(objectsEl, divisor, theme);

  return { name, width, height, backgroundColor, theme, objects };
}

/**
 * Parse a .gc.ahc gem library XML string.
 * Returns a flat array of parsed gem children (used by gem-resolver).
 * The gem-resolver calls this and wraps results in a GemDefinition.
 */
export function parseGemChildren(
  xmlContent: string,
  divisor: number
): DVObjectUnion[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, 'application/xml');
  const root = doc.documentElement;
  if (!root) return [];

  const objectsEl = root.querySelector('Objects') ?? root;
  return parseObjectList(objectsEl, divisor, LiveTheme.DEFAULT);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function parseEMU(raw: string | null, divisor: number): number {
  if (!raw) return 0;
  const n = parseFloat(raw);
  return isNaN(n) ? 0 : Math.round(n / divisor);
}

function parseFloat2(raw: string | null): number {
  if (!raw) return 0;
  const n = parseFloat(raw);
  return isNaN(n) ? 0 : n;
}

function parseBool(raw: string | null, def = true): boolean {
  if (!raw) return def;
  return raw.trim().toLowerCase() !== 'false' && raw.trim() !== '0';
}

function parsePoints(
  raw: string | null,
  divisor: number
): Array<{ x: number; y: number }> {
  if (!raw) return [];
  // Format: "x1,y1 x2,y2 ..." or "x1,y1;x2,y2;..."
  const pairs = raw.split(/[\s;]+/);
  return pairs
    .map((p) => {
      const [xs, ys] = p.split(',');
      return { x: parseEMU(xs ?? '0', divisor), y: parseEMU(ys ?? '0', divisor) };
    })
    .filter((pt) => !isNaN(pt.x) && !isNaN(pt.y));
}

/** Build a LiveValue that resolves to "true" */
const TRUE_VALUE: LiveValue = { source: LiveValueSource.Direct, value: 'true' };
const ZERO_VALUE: LiveValue = { source: LiveValueSource.Direct, value: '0' };
const HUNDRED_VALUE: LiveValue = { source: LiveValueSource.Direct, value: '100' };
const TRANSPARENT_VALUE: LiveValue = { source: LiveValueSource.Direct, value: 'transparent' };

function parseBaseAttrs(el: Element, divisor: number): Omit<DVObjectBase, 'objectType'> {
  return {
    name: el.getAttribute('Name') ?? el.tagName,
    left: parseEMU(el.getAttribute('Left') ?? el.getAttribute('X'), divisor),
    top: parseEMU(el.getAttribute('Top') ?? el.getAttribute('Y'), divisor),
    width: parseEMU(el.getAttribute('Width'), divisor),
    height: parseEMU(el.getAttribute('Height'), divisor),
    rotation: parseFloat2(el.getAttribute('Rotation')),
    flipX: parseBool(el.getAttribute('FlipX'), false),
    flipY: parseBool(el.getAttribute('FlipY'), false),
    visible: parseLiveValue(el, 'Visible'),
    fillColor: parseLiveValue(el, 'FillColor'),
    borderColor: parseLiveValue(el, 'BorderColor'),
    borderWidth: parseLiveValue(el, 'BorderWidth'),
    opacity: parseLiveValue(el, 'Opacity'),
  };
}

function parseObjectList(
  container: Element,
  divisor: number,
  theme: LiveTheme
): DVObjectUnion[] {
  const results: DVObjectUnion[] = [];
  for (const child of container.children) {
    const obj = parseElement(child, divisor, theme);
    if (obj) results.push(obj);
  }
  return results;
}

// Map XML tag names to parse functions
type Parser = (el: Element, divisor: number, theme: LiveTheme) => DVObjectUnion | null;

const ELEMENT_PARSERS: Record<string, Parser> = {
  LiveRectangle: parseRectangle,
  LiveEllipse: parseEllipse,
  LiveArc: parseArc,
  LiveLine: parseLine,
  LivePolygon: parsePolygon,
  LiveFreeform: parseFreeform,
  LiveTriangle: parseTriangle,
  LiveTrapezoid: parseTrapezoid,
  LiveRoundedRectangle: parseRoundedRectangle,
  LiveConnector: parseConnector,
  LiveImage: parseImage,
  LiveButton: parseButton,
  LiveDataLink: parseDataLink,
  LiveDisplayLink: parseDisplayLink,
  LiveText: parseLiveText,
  LiveGroup: parseGroup,
  LiveGem: parseGem,
  // Alternate/legacy tag names
  Rectangle: parseRectangle,
  Ellipse: parseEllipse,
  Arc: parseArc,
  Line: parseLine,
  Polygon: parsePolygon,
  Freeform: parseFreeform,
  Triangle: parseTriangle,
  Trapezoid: parseTrapezoid,
  RoundedRectangle: parseRoundedRectangle,
  Connector: parseConnector,
  Image: parseImage,
  Button: parseButton,
  DataLink: parseDataLink,
  DisplayLink: parseDisplayLink,
  Text: parseLiveText,
  Group: parseGroup,
  Gem: parseGem,
};

function parseElement(
  el: Element,
  divisor: number,
  theme: LiveTheme
): DVObjectUnion | null {
  const fn = ELEMENT_PARSERS[el.tagName];
  if (!fn) return null;
  return fn(el, divisor, theme);
}

// ---------------------------------------------------------------------------
// Per-type parsers
// ---------------------------------------------------------------------------

function parseRectangle(el: Element, divisor: number): DVRectangle {
  return {
    objectType: 'Rectangle',
    ...parseBaseAttrs(el, divisor),
    cornerRadius: parseFloat2(el.getAttribute('CornerRadius')),
  };
}

function parseEllipse(el: Element, divisor: number): DVEllipse {
  return {
    objectType: 'Ellipse',
    ...parseBaseAttrs(el, divisor),
  };
}

function parseArc(el: Element, divisor: number): DVArc {
  return {
    objectType: 'Arc',
    ...parseBaseAttrs(el, divisor),
    startAngle: parseFloat2(el.getAttribute('StartAngle')),
    sweepAngle: parseFloat2(el.getAttribute('SweepAngle') ?? el.getAttribute('EndAngle') ?? '360'),
  };
}

function parseLine(el: Element, divisor: number): DVLine {
  const base = parseBaseAttrs(el, divisor);
  return {
    objectType: 'Line',
    ...base,
    x2: parseEMU(el.getAttribute('X2'), divisor),
    y2: parseEMU(el.getAttribute('Y2'), divisor),
    points: parsePoints(el.getAttribute('Points'), divisor),
    lineColor: parseLiveValue(el, 'LineColor'),
    lineWidth: parseLiveValue(el, 'LineWidth'),
  };
}

function parsePolygon(el: Element, divisor: number): DVPolygon {
  return {
    objectType: 'Polygon',
    ...parseBaseAttrs(el, divisor),
    points: parsePoints(el.getAttribute('Points'), divisor),
  };
}

function parseFreeform(el: Element, divisor: number): DVFreeform {
  return {
    objectType: 'Freeform',
    ...parseBaseAttrs(el, divisor),
    points: parsePoints(el.getAttribute('Points'), divisor),
  };
}

function parseTriangle(el: Element, divisor: number): DVTriangle {
  return {
    objectType: 'Triangle',
    ...parseBaseAttrs(el, divisor),
  };
}

function parseTrapezoid(el: Element, divisor: number): DVTrapezoid {
  return {
    objectType: 'Trapezoid',
    ...parseBaseAttrs(el, divisor),
  };
}

function parseRoundedRectangle(el: Element, divisor: number): DVRoundedRectangle {
  return {
    objectType: 'RoundedRectangle',
    ...parseBaseAttrs(el, divisor),
    cornerRadius: parseFloat2(el.getAttribute('CornerRadius') ?? '4'),
  };
}

function parseConnector(el: Element, divisor: number): DVConnector {
  return {
    objectType: 'Connector',
    ...parseBaseAttrs(el, divisor),
    points: parsePoints(el.getAttribute('Points'), divisor),
  };
}

function parseImage(el: Element, divisor: number): DVImage {
  const imageData =
    el.getAttribute('ImageData') ??
    el.getAttribute('Source') ??
    el.getAttribute('Data') ??
    '';
  const imageFormat =
    el.getAttribute('ImageFormat') ??
    el.getAttribute('Format') ??
    'png';
  return {
    objectType: 'Image',
    ...parseBaseAttrs(el, divisor),
    imageData,
    imageFormat,
  };
}

function parseButton(el: Element, divisor: number): DVButton {
  return {
    objectType: 'Button',
    ...parseBaseAttrs(el, divisor),
    label: parseLiveValue(el, 'Label'),
    navigateTo: parseLiveValue(el, 'NavigateTo'),
  };
}

function parseDataLink(el: Element, divisor: number): DVDataLink {
  return {
    objectType: 'DataLink',
    ...parseBaseAttrs(el, divisor),
    tag: parseLiveValue(el, 'Tag'),
    text: parseLiveValue(el, 'Text'),
    textColor: parseLiveValue(el, 'TextColor'),
    fontFamily: parseLiveValue(el, 'FontFamily'),
    fontSize: parseLiveValue(el, 'FontSize'),
  };
}

function parseDisplayLink(el: Element, divisor: number): DVDisplayLink {
  return {
    objectType: 'DisplayLink',
    ...parseBaseAttrs(el, divisor),
    displayName: parseLiveValue(el, 'DisplayName'),
    label: parseLiveValue(el, 'Label'),
  };
}

function parseLiveText(el: Element, divisor: number): DVText {
  const align = (el.getAttribute('HorizontalAlignment') ?? 'Left') as
    | 'Left'
    | 'Center'
    | 'Right';
  return {
    objectType: 'Text',
    ...parseBaseAttrs(el, divisor),
    text: parseLiveValue(el, 'Text'),
    textColor: parseLiveValue(el, 'TextColor'),
    fontFamily: parseLiveValue(el, 'FontFamily'),
    fontSize: parseLiveValue(el, 'FontSize'),
    horizontalAlignment: align,
  };
}

function parseGroup(
  el: Element,
  divisor: number,
  theme: LiveTheme
): DVGroup {
  const objectsEl = el.querySelector('Objects') ?? el;
  return {
    objectType: 'Group',
    ...parseBaseAttrs(el, divisor),
    children: parseObjectList(objectsEl, divisor, theme),
  };
}

function parseGem(el: Element, divisor: number, theme: LiveTheme): DVGem {
  // Parse gem variable bindings: <Variables><Variable Name="Tag" Value="FIC101"/></Variables>
  const variables: Record<string, string> = {};
  const varsEl = el.querySelector('Variables');
  if (varsEl) {
    for (const varEl of varsEl.querySelectorAll('Variable')) {
      const vName = varEl.getAttribute('Name');
      const vValue = varEl.getAttribute('Value') ?? '';
      if (vName) variables[vName] = vValue;
    }
  }

  // Parse overrides: <OverrideInfos><OverrideInfo ChildPath="..." PropertyName="..." Value="..."/></OverrideInfos>
  const overrides: DVGemOverride[] = [];
  const overridesEl = el.querySelector('OverrideInfos');
  if (overridesEl) {
    for (const oEl of overridesEl.querySelectorAll('OverrideInfo')) {
      const childPath = oEl.getAttribute('ChildPath') ?? '';
      const propertyName = oEl.getAttribute('PropertyName') ?? '';
      const value = oEl.getAttribute('Value') ?? '';
      if (childPath || propertyName) {
        overrides.push({ childPath, propertyName, value });
      }
    }
  }

  // Check for embedded gem definition
  const embeddedEl = el.querySelector('EmbeddedGem');
  let children: DVObjectUnion[] | undefined;
  let isEmbedded = false;
  if (embeddedEl) {
    isEmbedded = true;
    const embObjectsEl = embeddedEl.querySelector('Objects') ?? embeddedEl;
    children = parseObjectList(embObjectsEl, divisor, theme);
  }

  return {
    objectType: 'Gem',
    ...parseBaseAttrs(el, divisor),
    gemName: el.getAttribute('GemName') ?? el.getAttribute('Name') ?? '',
    variables,
    overrides,
    children,
    isEmbedded,
  };
}
