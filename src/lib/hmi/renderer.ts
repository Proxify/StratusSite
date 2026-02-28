/**
 * HMI Canvas Renderer
 *
 * Renders an HMIGraphic to a Canvas 2D context.
 * Port of C# GDI+ rendering: DrawRectangle, FillRectangle, DrawEllipse,
 * FillEllipse, DrawArc, FillPie, DrawLine, DrawBezier, DrawRoundedRectangle,
 * FillRoundedRectangle, DrawImage, DrawString, FillPolygon.
 */

import {
  type HMIGraphic,
  type HMIWebObjectUnion,
  type HMIWebStyle,
  type HMIWebDataValue,
  type HMIWebButton,
  type HMIWebGroup,
  type HMIWebShape,
  type HMIWebRectangle,
  type HMIWebOval,
  type HMIWebArc,
  type HMIWebLine,
  type HMIWebImage,
  type HMIWebTextBox,
  SHAPE_NAME_IGNORE_LIST,
  DEFAULT_IMAGE_SCALE,
} from './types';
import { fromHex } from './utils';

export interface RenderOptions {
  scale?: number;
  backgroundColor?: string;
  quality?: number;
}

/**
 * Render an HMIGraphic to an OffscreenCanvas and return it.
 */
export function renderGraphic(
  graphic: HMIGraphic,
  options: RenderOptions = {}
): OffscreenCanvas {
  const scale = options.scale ?? DEFAULT_IMAGE_SCALE;
  const canvasWidth = Math.round(graphic.width * scale);
  const canvasHeight = Math.round(graphic.height * scale);

  const canvas = new OffscreenCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D context');

  // Fill background
  ctx.fillStyle = options.backgroundColor || graphic.backgroundColor || '#C0C0C0';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Apply scale transform
  ctx.scale(scale, scale);

  // Render all objects
  for (const obj of graphic.objects) {
    renderObject(ctx, obj);
  }

  return canvas;
}

/**
 * Render an HMIGraphic to an HTMLCanvasElement (for browser preview).
 */
export function renderGraphicToCanvas(
  graphic: HMIGraphic,
  canvas: HTMLCanvasElement,
  options: RenderOptions = {}
): void {
  const scale = options.scale ?? DEFAULT_IMAGE_SCALE;
  canvas.width = Math.round(graphic.width * scale);
  canvas.height = Math.round(graphic.height * scale);

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D context');

  // Fill background
  ctx.fillStyle = options.backgroundColor || graphic.backgroundColor || '#C0C0C0';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.scale(scale, scale);

  for (const obj of graphic.objects) {
    renderObject(ctx, obj);
  }
}

/**
 * Export an OffscreenCanvas to a JPEG Blob.
 */
export async function canvasToJpegBlob(
  canvas: OffscreenCanvas,
  quality: number = 0.92
): Promise<Blob> {
  return canvas.convertToBlob({ type: 'image/jpeg', quality });
}

/**
 * Export an OffscreenCanvas to a PNG Blob.
 */
export async function canvasToPngBlob(canvas: OffscreenCanvas): Promise<Blob> {
  return canvas.convertToBlob({ type: 'image/png' });
}

// --- Internal rendering functions ---

function renderObject(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  obj: HMIWebObjectUnion
): void {
  if (!obj.visible) return;

  ctx.save();

  // Apply opacity if set
  if (obj.style.opacity !== undefined) {
    ctx.globalAlpha = obj.style.opacity;
  }

  switch (obj.objectType) {
    case 'Rectangle':
      renderRectangle(ctx, obj);
      break;
    case 'Oval':
      renderOval(ctx, obj);
      break;
    case 'Arc':
      renderArc(ctx, obj);
      break;
    case 'Line':
      renderLine(ctx, obj);
      break;
    case 'Image':
      renderImage(ctx, obj);
      break;
    case 'TextBox':
      renderTextBox(ctx, obj);
      break;
    case 'DataValue':
      renderDataValue(ctx, obj);
      break;
    case 'Button':
      renderButton(ctx, obj);
      break;
    case 'Group':
      renderGroup(ctx, obj);
      break;
    case 'Shape':
      renderShape(ctx, obj);
      break;
  }

  ctx.restore();
}

function applyFill(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  style: HMIWebStyle
): boolean {
  const color = style.fillColor || style.backgroundColor;
  if (color) {
    ctx.fillStyle = fromHex(color);
    return true;
  }
  return false;
}

function applyStroke(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  style: HMIWebStyle
): boolean {
  if (style.strokeColor) {
    ctx.strokeStyle = fromHex(style.strokeColor);
    ctx.lineWidth = style.strokeWidth ?? 1;
    return true;
  }
  return false;
}

function renderRectangle(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  rect: HMIWebRectangle
): void {
  const { x, y, width, height, cornerRadius } = rect;

  if (cornerRadius && cornerRadius > 0) {
    // Rounded rectangle — port of C# GraphicExtensions.RoundedRect
    if (applyFill(ctx, rect.style)) {
      fillRoundedRect(ctx, x, y, width, height, cornerRadius);
    }
    if (applyStroke(ctx, rect.style)) {
      strokeRoundedRect(ctx, x, y, width, height, cornerRadius);
    }
  } else {
    if (applyFill(ctx, rect.style)) {
      ctx.fillRect(x, y, width, height);
    }
    if (applyStroke(ctx, rect.style)) {
      ctx.strokeRect(x, y, width, height);
    }
  }
}

/**
 * Port of C# GraphicExtensions.RoundedRect path builder.
 */
function roundedRectPath(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
): void {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function fillRoundedRect(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
): void {
  roundedRectPath(ctx, x, y, w, h, radius);
  ctx.fill();
}

function strokeRoundedRect(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
): void {
  roundedRectPath(ctx, x, y, w, h, radius);
  ctx.stroke();
}

function renderOval(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  oval: HMIWebOval
): void {
  const cx = oval.x + oval.width / 2;
  const cy = oval.y + oval.height / 2;
  const rx = oval.width / 2;
  const ry = oval.height / 2;

  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);

  if (applyFill(ctx, oval.style)) {
    ctx.fill();
  }
  if (applyStroke(ctx, oval.style)) {
    ctx.stroke();
  }
}

function renderArc(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  arc: HMIWebArc
): void {
  const cx = arc.x + arc.width / 2;
  const cy = arc.y + arc.height / 2;
  const rx = arc.width / 2;
  const ry = arc.height / 2;

  // Convert degrees to radians (GDI+ uses degrees)
  const startRad = (arc.startAngle * Math.PI) / 180;
  const endRad = ((arc.startAngle + arc.sweepAngle) * Math.PI) / 180;

  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, startRad, endRad);

  if (applyFill(ctx, arc.style)) {
    // FillPie — fill the pie segment
    ctx.lineTo(cx, cy);
    ctx.closePath();
    ctx.fill();
  }
  if (applyStroke(ctx, arc.style)) {
    ctx.stroke();
  }
}

function renderLine(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  line: HMIWebLine
): void {
  if (!applyStroke(ctx, line.style)) {
    // Default to black line if no stroke color
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
  }

  if (line.points && line.points.length > 1) {
    // DrawLines / polyline
    ctx.beginPath();
    ctx.moveTo(line.points[0].x, line.points[0].y);
    for (let i = 1; i < line.points.length; i++) {
      ctx.lineTo(line.points[i].x, line.points[i].y);
    }
    ctx.stroke();
  } else {
    // Single line segment
    ctx.beginPath();
    ctx.moveTo(line.x, line.y);
    ctx.lineTo(line.x2, line.y2);
    ctx.stroke();
  }
}

// Cache for decoded images to avoid redundant decoding
const imageCache = new Map<string, ImageBitmap>();

function renderImage(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  img: HMIWebImage
): void {
  if (!img.base64Data) return;

  // For synchronous rendering, we draw a placeholder rectangle
  // Actual image loading happens asynchronously via renderImageAsync
  if (applyFill(ctx, img.style)) {
    ctx.fillRect(img.x, img.y, img.width, img.height);
  }
}

/**
 * Render an image asynchronously (loads base64 data).
 * Call this after initial render for full-fidelity output.
 */
export async function renderImageAsync(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  img: HMIWebImage
): Promise<void> {
  if (!img.base64Data) return;

  let bitmap = imageCache.get(img.base64Data);
  if (!bitmap) {
    try {
      const dataUrl = img.base64Data.startsWith('data:')
        ? img.base64Data
        : `data:image/${img.imageFormat || 'png'};base64,${img.base64Data}`;

      const response = await fetch(dataUrl);
      const blob = await response.blob();
      bitmap = await createImageBitmap(blob);
      imageCache.set(img.base64Data, bitmap);
    } catch {
      // Draw error placeholder
      ctx.fillStyle = '#FF000033';
      ctx.fillRect(img.x, img.y, img.width, img.height);
      return;
    }
  }

  ctx.drawImage(bitmap, img.x, img.y, img.width, img.height);
}

function renderTextBox(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  textBox: HMIWebTextBox
): void {
  if (!textBox.text) return;

  // Background fill
  if (applyFill(ctx, textBox.style)) {
    ctx.fillRect(textBox.x, textBox.y, textBox.width, textBox.height);
  }

  // Text rendering
  const fontSize = textBox.style.fontSize || 12;
  const fontFamily = textBox.style.fontFamily || 'Arial';
  const fontWeight = textBox.style.fontWeight || 'normal';
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.fillStyle = fromHex(textBox.textColor || textBox.style.fontColor || '#000000');

  // Text alignment
  const align = textBox.horizontalAlignment;
  if (align === 'Center' || align === undefined) {
    ctx.textAlign = 'center';
    ctx.fillText(textBox.text, textBox.x + textBox.width / 2, textBox.y + textBox.height / 2 + fontSize / 3, textBox.width);
  } else if (align === 'Far') {
    ctx.textAlign = 'right';
    ctx.fillText(textBox.text, textBox.x + textBox.width, textBox.y + textBox.height / 2 + fontSize / 3, textBox.width);
  } else {
    ctx.textAlign = 'left';
    ctx.fillText(textBox.text, textBox.x, textBox.y + textBox.height / 2 + fontSize / 3, textBox.width);
  }
}

function renderDataValue(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  dataValue: HMIWebDataValue
): void {
  // Render as a text box with tag name as placeholder text
  const fontSize = dataValue.style.fontSize || 10;
  const fontFamily = dataValue.style.fontFamily || 'Arial';
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.fillStyle = fromHex(dataValue.textColor || '#000000');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const displayText = dataValue.text || dataValue.fullTag || '---';
  ctx.fillText(
    displayText,
    dataValue.x + dataValue.width / 2,
    dataValue.y + dataValue.height / 2,
    dataValue.width
  );
}

function renderButton(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  button: HMIWebButton
): void {
  // Background
  if (applyFill(ctx, button.style)) {
    ctx.fillRect(button.x, button.y, button.width, button.height);
  }

  // Border
  if (applyStroke(ctx, button.style)) {
    ctx.strokeRect(button.x, button.y, button.width, button.height);
  }

  // Label text
  if (button.label) {
    const fontSize = button.style.fontSize || 10;
    const fontFamily = button.style.fontFamily || 'Arial';
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillStyle = fromHex(button.style.fontColor || '#000000');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      button.label,
      button.x + button.width / 2,
      button.y + button.height / 2,
      button.width
    );
  }
}

function renderGroup(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  group: HMIWebGroup
): void {
  // Render group background if styled
  if (applyFill(ctx, group.style)) {
    ctx.fillRect(group.x, group.y, group.width, group.height);
  }

  // Render children
  for (const child of group.children) {
    renderObject(ctx, child);
  }
}

function renderShape(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  shape: HMIWebShape
): void {
  // Skip ignored shapes
  if (shape.shapeName && SHAPE_NAME_IGNORE_LIST.some((ignored) => shape.shapeName!.includes(ignored))) {
    return;
  }

  // Render shape background if styled
  if (applyFill(ctx, shape.style)) {
    ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
  }

  // Render children
  for (const child of shape.children) {
    renderObject(ctx, child);
  }
}

/**
 * Clear the image bitmap cache.
 */
export function clearImageCache(): void {
  imageCache.clear();
}
