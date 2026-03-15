/**
 * DeltaV Live SVG Renderer — replaces the C# GDI+ rendering engine.
 *
 * Renders a DVGraphic scene graph to an SVG string that faithfully represents
 * the display. Supports:
 *   - All primitive shapes (Rectangle, Ellipse, Arc, Line, Polygon, etc.)
 *   - Rotation and flip transforms
 *   - LiveValue property resolution (Direct, ThemeRef, GemRef)
 *   - Theme-aware colors
 *   - Gem children (after resolution)
 *   - Text objects with alignment
 *   - DataLink / DisplayLink annotations
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
  type LiveValue,
  LiveTheme,
} from './types';
import { resolveLiveColor, resolveLiveNumber, resolveLiveBool, resolveLiveValue } from './live-value';
import { parseDVColor, THEME_BACKGROUND_COLOR, THEME_FONT_COLOR } from './theme';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface RenderOptions {
  theme?: LiveTheme;
  /** Override width/height (falls back to graphic dimensions) */
  width?: number;
  height?: number;
}

/**
 * Render a DVGraphic to an SVG string.
 */
export function renderDVGraphicToSVG(
  graphic: DVGraphic,
  options: RenderOptions = {}
): string {
  const theme = options.theme ?? graphic.theme ?? LiveTheme.DEFAULT;
  const width = options.width ?? graphic.width;
  const height = options.height ?? graphic.height;
  const bgColor = graphic.backgroundColor || parseDVColor(THEME_BACKGROUND_COLOR[theme]);

  const children = graphic.objects
    .map((obj) => renderObject(obj, theme))
    .filter(Boolean)
    .join('\n');

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `  <rect width="${width}" height="${height}" fill="${bgColor}" />`,
    children,
    '</svg>',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Object rendering dispatch
// ---------------------------------------------------------------------------

function renderObject(obj: DVObjectUnion, theme: LiveTheme): string {
  // Check visibility
  if (obj.visible) {
    const vis = resolveLiveBool(obj.visible, theme);
    if (!vis) return '';
  }

  switch (obj.objectType) {
    case 'Rectangle': return renderRectangle(obj, theme);
    case 'RoundedRectangle': return renderRoundedRectangle(obj, theme);
    case 'Ellipse': return renderEllipse(obj, theme);
    case 'Arc': return renderArc(obj, theme);
    case 'Line': return renderLine(obj, theme);
    case 'Polygon': return renderPolygon(obj, theme);
    case 'Freeform': return renderFreeform(obj, theme);
    case 'Triangle': return renderTriangle(obj, theme);
    case 'Trapezoid': return renderTrapezoid(obj, theme);
    case 'Connector': return renderConnector(obj, theme);
    case 'Image': return renderImage(obj, theme);
    case 'Button': return renderButton(obj, theme);
    case 'DataLink': return renderDataLink(obj, theme);
    case 'DisplayLink': return renderDisplayLink(obj, theme);
    case 'Text': return renderText(obj, theme);
    case 'Group': return renderGroup(obj, theme);
    case 'Gem': return renderGem(obj, theme);
    default: return '';
  }
}

// ---------------------------------------------------------------------------
// Transform helpers
// ---------------------------------------------------------------------------

function buildTransform(obj: DVObjectBase): string {
  const parts: string[] = [];
  const cx = obj.left + obj.width / 2;
  const cy = obj.top + obj.height / 2;

  if (obj.rotation !== 0) {
    parts.push(`rotate(${obj.rotation}, ${cx}, ${cy})`);
  }
  if (obj.flipX || obj.flipY) {
    const scaleX = obj.flipX ? -1 : 1;
    const scaleY = obj.flipY ? -1 : 1;
    parts.push(`translate(${cx}, ${cy}) scale(${scaleX}, ${scaleY}) translate(${-cx}, ${-cy})`);
  }

  return parts.length > 0 ? ` transform="${parts.join(' ')}"` : '';
}

function resolveStrokeAttrs(obj: DVObjectBase, theme: LiveTheme): string {
  const stroke = resolveLiveColor(obj.borderColor, theme);
  const strokeWidth = resolveLiveNumber(obj.borderWidth, theme, undefined, 1);
  const fill = resolveLiveColor(obj.fillColor, theme);
  const opacity = resolveLiveNumber(obj.opacity, theme, undefined, 100) / 100;

  return `fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity.toFixed(3)}"`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Shape renderers
// ---------------------------------------------------------------------------

function renderRectangle(obj: DVRectangle, theme: LiveTheme): string {
  const attrs = resolveStrokeAttrs(obj, theme);
  const rx = obj.cornerRadius ? ` rx="${obj.cornerRadius}"` : '';
  const xform = buildTransform(obj);
  return `  <rect x="${obj.left}" y="${obj.top}" width="${obj.width}" height="${obj.height}"${rx} ${attrs}${xform} />`;
}

function renderRoundedRectangle(obj: DVRoundedRectangle, theme: LiveTheme): string {
  const attrs = resolveStrokeAttrs(obj, theme);
  const xform = buildTransform(obj);
  return `  <rect x="${obj.left}" y="${obj.top}" width="${obj.width}" height="${obj.height}" rx="${obj.cornerRadius}" ${attrs}${xform} />`;
}

function renderEllipse(obj: DVEllipse, theme: LiveTheme): string {
  const cx = obj.left + obj.width / 2;
  const cy = obj.top + obj.height / 2;
  const rx = obj.width / 2;
  const ry = obj.height / 2;
  const attrs = resolveStrokeAttrs(obj, theme);
  const xform = buildTransform(obj);
  return `  <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" ${attrs}${xform} />`;
}

function renderArc(obj: DVArc, theme: LiveTheme): string {
  const cx = obj.left + obj.width / 2;
  const cy = obj.top + obj.height / 2;
  const rx = obj.width / 2;
  const ry = obj.height / 2;
  const attrs = resolveStrokeAttrs(obj, theme);
  const xform = buildTransform(obj);

  // Convert start/sweep angles to SVG arc path
  const startRad = (obj.startAngle * Math.PI) / 180;
  const endRad = ((obj.startAngle + obj.sweepAngle) * Math.PI) / 180;
  const largeArc = Math.abs(obj.sweepAngle) > 180 ? 1 : 0;
  const x1 = cx + rx * Math.cos(startRad);
  const y1 = cy + ry * Math.sin(startRad);
  const x2 = cx + rx * Math.cos(endRad);
  const y2 = cy + ry * Math.sin(endRad);
  const sweep = obj.sweepAngle >= 0 ? 1 : 0;

  const d = `M ${x1} ${y1} A ${rx} ${ry} 0 ${largeArc} ${sweep} ${x2} ${y2}`;
  return `  <path d="${d}" fill="none" ${attrs}${xform} />`;
}

function renderLine(obj: DVLine, theme: LiveTheme): string {
  const color = resolveLiveColor(obj.lineColor ?? obj.borderColor, theme);
  const lineWidth = resolveLiveNumber(obj.lineWidth ?? obj.borderWidth, theme, undefined, 1);
  const opacity = resolveLiveNumber(obj.opacity, theme, undefined, 100) / 100;
  const xform = buildTransform(obj);

  if (obj.points && obj.points.length >= 2) {
    const pts = obj.points.map((p) => `${p.x},${p.y}`).join(' ');
    return `  <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="${lineWidth}" opacity="${opacity.toFixed(3)}"${xform} />`;
  }

  return `  <line x1="${obj.left}" y1="${obj.top}" x2="${obj.x2}" y2="${obj.y2}" stroke="${color}" stroke-width="${lineWidth}" opacity="${opacity.toFixed(3)}"${xform} />`;
}

function renderPolygon(obj: DVPolygon, theme: LiveTheme): string {
  const pts = obj.points.map((p) => `${p.x},${p.y}`).join(' ');
  const attrs = resolveStrokeAttrs(obj, theme);
  const xform = buildTransform(obj);
  return `  <polygon points="${pts}" ${attrs}${xform} />`;
}

function renderFreeform(obj: DVFreeform, theme: LiveTheme): string {
  if (obj.points.length < 2) return '';
  const pts = obj.points.map((p) => `${p.x},${p.y}`).join(' ');
  const attrs = resolveStrokeAttrs(obj, theme);
  const xform = buildTransform(obj);
  return `  <polyline points="${pts}" ${attrs}${xform} />`;
}

function renderTriangle(obj: DVTriangle, theme: LiveTheme): string {
  // Default isoceles triangle: top-center, bottom-left, bottom-right
  const pts = [
    `${obj.left + obj.width / 2},${obj.top}`,
    `${obj.left},${obj.top + obj.height}`,
    `${obj.left + obj.width},${obj.top + obj.height}`,
  ].join(' ');
  const attrs = resolveStrokeAttrs(obj, theme);
  const xform = buildTransform(obj);
  return `  <polygon points="${pts}" ${attrs}${xform} />`;
}

function renderTrapezoid(obj: DVTrapezoid, theme: LiveTheme): string {
  const inset = obj.width * 0.15;
  const pts = [
    `${obj.left + inset},${obj.top}`,
    `${obj.left + obj.width - inset},${obj.top}`,
    `${obj.left + obj.width},${obj.top + obj.height}`,
    `${obj.left},${obj.top + obj.height}`,
  ].join(' ');
  const attrs = resolveStrokeAttrs(obj, theme);
  const xform = buildTransform(obj);
  return `  <polygon points="${pts}" ${attrs}${xform} />`;
}

function renderConnector(obj: DVConnector, theme: LiveTheme): string {
  if (obj.points.length < 2) return '';
  const start = `M ${obj.points[0].x} ${obj.points[0].y}`;
  const rest = obj.points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ');
  const color = resolveLiveColor(obj.borderColor, theme);
  const lineWidth = resolveLiveNumber(obj.borderWidth, theme, undefined, 1);
  const opacity = resolveLiveNumber(obj.opacity, theme, undefined, 100) / 100;
  const xform = buildTransform(obj);
  return `  <path d="${start} ${rest}" fill="none" stroke="${color}" stroke-width="${lineWidth}" opacity="${opacity.toFixed(3)}"${xform} />`;
}

function renderImage(obj: DVImage, theme: LiveTheme): string {
  const xform = buildTransform(obj);
  const opacity = resolveLiveNumber(obj.opacity, theme, undefined, 100) / 100;
  const href = obj.imageData.startsWith('data:')
    ? obj.imageData
    : `data:image/${obj.imageFormat ?? 'png'};base64,${obj.imageData}`;
  return `  <image x="${obj.left}" y="${obj.top}" width="${obj.width}" height="${obj.height}" href="${escapeXml(href)}" opacity="${opacity.toFixed(3)}"${xform} />`;
}

function renderButton(obj: DVButton, theme: LiveTheme): string {
  const fill = resolveLiveColor(obj.fillColor, theme);
  const stroke = resolveLiveColor(obj.borderColor, theme);
  const label = escapeXml(resolveLiveValue(obj.label, theme));
  const fontColor = THEME_FONT_COLOR[theme];
  const xform = buildTransform(obj);
  return [
    `  <g${xform}>`,
    `    <rect x="${obj.left}" y="${obj.top}" width="${obj.width}" height="${obj.height}" fill="${fill}" stroke="${stroke}" stroke-width="1" rx="3" />`,
    `    <text x="${obj.left + obj.width / 2}" y="${obj.top + obj.height / 2 + 5}" text-anchor="middle" fill="${fontColor}" font-size="12" font-family="Arial">${label}</text>`,
    `  </g>`,
  ].join('\n');
}

function renderDataLink(obj: DVDataLink, theme: LiveTheme): string {
  const fill = resolveLiveColor(obj.fillColor, theme);
  const textColor = resolveLiveColor(obj.textColor, theme) || THEME_FONT_COLOR[theme];
  const tag = escapeXml(resolveLiveValue(obj.tag, theme));
  const fontSize = resolveLiveNumber(obj.fontSize, theme, undefined, 12);
  const fontFamily = resolveLiveValue(obj.fontFamily, theme) || 'Arial';
  const xform = buildTransform(obj);

  return [
    `  <g${xform}>`,
    `    <rect x="${obj.left}" y="${obj.top}" width="${obj.width}" height="${obj.height}" fill="${fill}" stroke="none" />`,
    `    <text x="${obj.left + obj.width / 2}" y="${obj.top + obj.height / 2 + fontSize / 3}" text-anchor="middle" fill="${textColor}" font-size="${fontSize}" font-family="${escapeXml(fontFamily)}" data-tag="${tag}">`,
    `      {${tag}}`,
    `    </text>`,
    `  </g>`,
  ].join('\n');
}

function renderDisplayLink(obj: DVDisplayLink, theme: LiveTheme): string {
  const displayName = escapeXml(resolveLiveValue(obj.displayName, theme));
  const label = escapeXml(resolveLiveValue(obj.label, theme));
  const fill = resolveLiveColor(obj.fillColor, theme);
  const stroke = resolveLiveColor(obj.borderColor, theme);
  const textColor = THEME_FONT_COLOR[theme];
  const xform = buildTransform(obj);
  return [
    `  <g${xform} data-display="${displayName}">`,
    `    <rect x="${obj.left}" y="${obj.top}" width="${obj.width}" height="${obj.height}" fill="${fill}" stroke="${stroke}" stroke-width="1" />`,
    `    <text x="${obj.left + obj.width / 2}" y="${obj.top + obj.height / 2 + 5}" text-anchor="middle" fill="${textColor}" font-size="11" font-family="Arial">${label || displayName}</text>`,
    `  </g>`,
  ].join('\n');
}

function renderText(obj: DVText, theme: LiveTheme): string {
  const text = escapeXml(resolveLiveValue(obj.text, theme));
  const textColor = resolveLiveColor(obj.textColor, theme) || THEME_FONT_COLOR[theme];
  const fontSize = resolveLiveNumber(obj.fontSize, theme, undefined, 12);
  const fontFamily = resolveLiveValue(obj.fontFamily, theme) || 'Arial';
  const opacity = resolveLiveNumber(obj.opacity, theme, undefined, 100) / 100;
  const xform = buildTransform(obj);

  const anchor =
    obj.horizontalAlignment === 'Center'
      ? 'middle'
      : obj.horizontalAlignment === 'Right'
      ? 'end'
      : 'start';
  const tx =
    obj.horizontalAlignment === 'Center'
      ? obj.left + obj.width / 2
      : obj.horizontalAlignment === 'Right'
      ? obj.left + obj.width
      : obj.left;

  return `  <text x="${tx}" y="${obj.top + obj.height / 2 + fontSize / 3}" text-anchor="${anchor}" fill="${textColor}" font-size="${fontSize}" font-family="${escapeXml(fontFamily)}" opacity="${opacity.toFixed(3)}"${xform}>${text}</text>`;
}

function renderGroup(obj: DVGroup, theme: LiveTheme): string {
  const xform = buildTransform(obj);
  const opacity = resolveLiveNumber(obj.opacity, theme, undefined, 100) / 100;
  const children = obj.children
    .map((c) => renderObject(c, theme))
    .filter(Boolean)
    .join('\n');
  return `  <g opacity="${opacity.toFixed(3)}"${xform}>\n${children}\n  </g>`;
}

function renderGem(obj: DVGem, theme: LiveTheme): string {
  if (!obj.children || obj.children.length === 0) {
    // Render as a placeholder rectangle if gem wasn't resolved
    return `  <rect x="${obj.left}" y="${obj.top}" width="${obj.width}" height="${obj.height}" fill="none" stroke="#808080" stroke-dasharray="4" opacity="0.5" />`;
  }

  const xform = buildTransform(obj);
  const opacity = resolveLiveNumber(obj.opacity, theme, undefined, 100) / 100;
  const children = obj.children
    .map((c) => renderObject(c, theme))
    .filter(Boolean)
    .join('\n');
  return `  <g opacity="${opacity.toFixed(3)}"${xform} data-gem="${escapeXml(obj.gemName)}">\n${children}\n  </g>`;
}
