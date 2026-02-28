/**
 * HMI HTM Parser
 *
 * Parses Honeywell Experion HMI graphic .htm files into the HMIGraphic object model.
 * The .htm files are HTML documents where HMI objects are represented as absolutely-positioned
 * div/span elements with CSS classes indicating their type and inline styles for geometry.
 *
 * Object types are identified by CSS class names on elements:
 * - HMIWebDataValue / DataValue → data point display
 * - HMIWebButton / Button → navigation button
 * - HMIWebGroup / Group → container
 * - HMIWebShape / Shape → shape container
 * - HMIWebRectangle / Rectangle → rectangle primitive
 * - HMIWebOval / Oval → ellipse/circle
 * - HMIWebArc / Arc → arc segment
 * - HMIWebLine / Line → line segment
 * - HMIWebImage / Image → embedded image
 * - HMIWebTextBox / TextBox → text label
 */

import {
  type HMIGraphic,
  type HMIWebObjectUnion,
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
  type HMIWebStyle,
  type HMIObjectType,
  SHAPE_NAME_IGNORE_LIST,
} from './types';
import { parseCssLength, parseInlineStyle, generateObjectId, resetIdCounter } from './utils';

/**
 * Parse an HMI .htm file content string into an HMIGraphic object.
 */
export function parseHMIFile(htmContent: string, fileName: string = 'untitled'): HMIGraphic {
  resetIdCounter();

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmContent, 'text/html');

  // Extract graphic dimensions from the root container or body
  const { width, height, backgroundColor } = extractGraphicDimensions(doc);

  // Parse all HMI objects from the DOM
  const objects = parseChildren(doc.body);

  return {
    name: fileName.replace(/\.htm$/i, ''),
    width,
    height,
    objects,
    backgroundColor,
  };
}

/**
 * Extract the root graphic dimensions from the document.
 * Looks for a main container div or falls back to body dimensions.
 */
function extractGraphicDimensions(doc: Document): {
  width: number;
  height: number;
  backgroundColor?: string;
} {
  // Look for a root container with explicit dimensions
  const containers = doc.querySelectorAll('div[style]');
  let maxWidth = 800;
  let maxHeight = 600;
  let backgroundColor: string | undefined;

  // Check for a main graphic container (usually the first large positioned div)
  for (const container of containers) {
    const style = parseInlineStyle(container.getAttribute('style') || '');
    const w = parseCssLength(style['width']);
    const h = parseCssLength(style['height']);

    if (w > maxWidth) maxWidth = w;
    if (h > maxHeight) maxHeight = h;

    if (style['background-color'] && !backgroundColor) {
      backgroundColor = style['background-color'];
    }
    if (style['background'] && !backgroundColor) {
      backgroundColor = style['background'];
    }
  }

  // Also check body style
  const bodyStyle = parseInlineStyle(doc.body.getAttribute('style') || '');
  const bodyW = parseCssLength(bodyStyle['width']);
  const bodyH = parseCssLength(bodyStyle['height']);
  if (bodyW > 0) maxWidth = Math.max(maxWidth, bodyW);
  if (bodyH > 0) maxHeight = Math.max(maxHeight, bodyH);
  if (bodyStyle['background-color']) backgroundColor = bodyStyle['background-color'];

  return { width: maxWidth, height: maxHeight, backgroundColor };
}

/**
 * Parse child elements of a container into HMI objects.
 */
function parseChildren(container: Element): HMIWebObjectUnion[] {
  const objects: HMIWebObjectUnion[] = [];

  for (const child of container.children) {
    const obj = parseElement(child);
    if (obj) {
      objects.push(obj);
    }
  }

  return objects;
}

/**
 * Determine the HMI object type from an element's CSS classes and attributes.
 */
function detectObjectType(el: Element): HMIObjectType | null {
  const classList = Array.from(el.classList).map((c) => c.toLowerCase());
  const className = el.className?.toString().toLowerCase() || '';
  const tagName = el.tagName.toLowerCase();
  const dataType = el.getAttribute('data-type')?.toLowerCase();

  // Check data-type attribute first (most reliable)
  if (dataType) {
    const typeMap: Record<string, HMIObjectType> = {
      datavalue: 'DataValue',
      button: 'Button',
      group: 'Group',
      shape: 'Shape',
      rectangle: 'Rectangle',
      oval: 'Oval',
      arc: 'Arc',
      line: 'Line',
      image: 'Image',
      textbox: 'TextBox',
    };
    if (typeMap[dataType]) return typeMap[dataType];
  }

  // Check CSS class names
  for (const cls of classList) {
    if (cls.includes('datavalue') || cls.includes('hmiwebdatavalue')) return 'DataValue';
    if (cls.includes('button') || cls.includes('hmiwebbutton')) return 'Button';
    if (cls.includes('group') || cls.includes('hmiwebgroup')) return 'Group';
    if (cls.includes('shape') || cls.includes('hmiwebshape')) return 'Shape';
    if (cls.includes('rectangle') || cls.includes('hmiwebrectangle')) return 'Rectangle';
    if (cls.includes('oval') || cls.includes('hmiweboval')) return 'Oval';
    if (cls.includes('arc') || cls.includes('hmiwebarc')) return 'Arc';
    if (cls.includes('line') || cls.includes('hmiwebline')) return 'Line';
    if (cls.includes('textbox') || cls.includes('hmiwebtextbox')) return 'TextBox';
  }

  // Check for images
  if (tagName === 'img' || className.includes('image') || className.includes('hmiwebimage')) {
    return 'Image';
  }

  // Check for img child elements (image containers)
  if (el.querySelector('img') && !el.querySelector('[class*="datavalue"]')) {
    return 'Image';
  }

  // Check for text content in positioned divs
  const style = parseInlineStyle(el.getAttribute('style') || '');
  if (style['position'] === 'absolute' && el.textContent?.trim()) {
    // If the div has positioned text and no further nested HMI elements, treat as TextBox
    const hasHmiChildren = el.querySelector(
      '[data-type], [class*="hmi"], [class*="DataValue"], [class*="Button"], [class*="Group"], [class*="Shape"]'
    );
    if (!hasHmiChildren && el.children.length === 0) {
      return 'TextBox';
    }
  }

  return null;
}

/**
 * Parse a single DOM element into an HMI object.
 */
function parseElement(el: Element): HMIWebObjectUnion | null {
  const objectType = detectObjectType(el);

  // If not a recognized HMI type, try parsing children as a virtual group
  if (!objectType) {
    // Recurse into container elements that might hold HMI objects
    if (el.children.length > 0) {
      const childObjects = parseChildren(el);
      if (childObjects.length === 1) return childObjects[0];
      if (childObjects.length > 1) {
        // Wrap in an implicit group
        const style = extractStyle(el);
        const { x, y, width, height } = extractPosition(el);
        return {
          objectType: 'Group',
          objectId: generateObjectId('group'),
          styleClass: el.className?.toString() || '',
          style,
          visible: true,
          x,
          y,
          width,
          height,
          children: childObjects,
        } as HMIWebGroup;
      }
    }
    return null;
  }

  // Check shape ignore list
  if (objectType === 'Shape') {
    const shapeName = el.getAttribute('data-name') || el.className?.toString() || '';
    if (SHAPE_NAME_IGNORE_LIST.some((ignored) => shapeName.includes(ignored))) {
      return null;
    }
  }

  const { x, y, width, height } = extractPosition(el);
  const style = extractStyle(el);
  const styleClass = el.className?.toString() || '';

  const base = {
    objectId: generateObjectId(objectType.toLowerCase()),
    styleClass,
    style,
    visible: true,
    x,
    y,
    width,
    height,
  };

  switch (objectType) {
    case 'DataValue':
      return {
        ...base,
        objectType: 'DataValue',
        fullTag: el.getAttribute('data-tag') || el.getAttribute('data-fulltag') || '',
        textColor: extractTextColor(el, style),
        text: el.textContent?.trim() || '',
      } as HMIWebDataValue;

    case 'Button':
      return {
        ...base,
        objectType: 'Button',
        navigateTo: el.getAttribute('data-navigate') || el.getAttribute('data-navigateto') || el.getAttribute('href') || '',
        label: el.textContent?.trim() || '',
      } as HMIWebButton;

    case 'Group':
      return {
        ...base,
        objectType: 'Group',
        children: parseChildren(el),
      } as HMIWebGroup;

    case 'Shape': {
      const shapeName = el.getAttribute('data-name') || '';
      return {
        ...base,
        objectType: 'Shape',
        children: parseChildren(el),
        shapeName,
      } as HMIWebShape;
    }

    case 'Rectangle':
      return {
        ...base,
        objectType: 'Rectangle',
        cornerRadius: parseCssLength(
          parseInlineStyle(el.getAttribute('style') || '')['border-radius']
        ),
      } as HMIWebRectangle;

    case 'Oval':
      return {
        ...base,
        objectType: 'Oval',
      } as HMIWebOval;

    case 'Arc':
      return {
        ...base,
        objectType: 'Arc',
        startAngle: parseFloat(el.getAttribute('data-start-angle') || '0'),
        sweepAngle: parseFloat(el.getAttribute('data-sweep-angle') || '360'),
      } as HMIWebArc;

    case 'Line': {
      const x2 = parseFloat(el.getAttribute('data-x2') || String(x + width));
      const y2 = parseFloat(el.getAttribute('data-y2') || String(y + height));
      const pointsStr = el.getAttribute('data-points');
      let points: Array<{ x: number; y: number }> | undefined;
      if (pointsStr) {
        try {
          points = JSON.parse(pointsStr);
        } catch {
          // Parse "x1,y1 x2,y2 ..." format
          points = pointsStr.split(/\s+/).map((p) => {
            const [px, py] = p.split(',').map(Number);
            return { x: px || 0, y: py || 0 };
          });
        }
      }
      return {
        ...base,
        objectType: 'Line',
        x2,
        y2,
        points,
      } as HMIWebLine;
    }

    case 'Image': {
      let base64Data = '';
      const imgEl = el.tagName.toLowerCase() === 'img' ? el : el.querySelector('img');
      if (imgEl) {
        const src = imgEl.getAttribute('src') || '';
        if (src.startsWith('data:')) {
          // Extract base64 from data URI
          const commaIdx = src.indexOf(',');
          base64Data = commaIdx >= 0 ? src.slice(commaIdx + 1) : src;
        } else {
          base64Data = src;
        }
      }
      return {
        ...base,
        objectType: 'Image',
        base64Data,
        imageFormat: 'png',
      } as HMIWebImage;
    }

    case 'TextBox':
      return {
        ...base,
        objectType: 'TextBox',
        text: el.textContent?.trim() || '',
        textColor: extractTextColor(el, style),
      } as HMIWebTextBox;

    default:
      return null;
  }
}

/**
 * Extract position and dimensions from element's inline style.
 * Handles absolute positioning (left/top/width/height).
 */
function extractPosition(el: Element): { x: number; y: number; width: number; height: number } {
  const style = parseInlineStyle(el.getAttribute('style') || '');
  return {
    x: parseCssLength(style['left']),
    y: parseCssLength(style['top']),
    width: parseCssLength(style['width']),
    height: parseCssLength(style['height']),
  };
}

/**
 * Extract styling information from an element.
 */
function extractStyle(el: Element): HMIWebStyle {
  const style = parseInlineStyle(el.getAttribute('style') || '');
  const result: HMIWebStyle = {};

  if (style['background-color']) result.fillColor = style['background-color'];
  if (style['background'] && !style['background-color']) result.fillColor = style['background'];
  if (style['border-color']) result.strokeColor = style['border-color'];
  if (style['border']) {
    // Parse "1px solid #000" format
    const parts = style['border'].split(/\s+/);
    for (const part of parts) {
      if (part.startsWith('#') || part.startsWith('rgb')) {
        result.strokeColor = part;
      } else if (part.endsWith('px') || part.endsWith('pt')) {
        result.strokeWidth = parseFloat(part);
      }
    }
  }
  if (style['border-width']) result.strokeWidth = parseCssLength(style['border-width']);
  if (style['font-family']) result.fontFamily = style['font-family'].replace(/['"]/g, '');
  if (style['font-size']) result.fontSize = parseCssLength(style['font-size']);
  if (style['font-weight']) result.fontWeight = style['font-weight'];
  if (style['color']) result.fontColor = style['color'];
  if (style['opacity']) result.opacity = parseFloat(style['opacity']);
  if (style['border-radius']) result.borderRadius = parseCssLength(style['border-radius']);
  if (style['background-color']) result.backgroundColor = style['background-color'];

  return result;
}

/**
 * Extract text color from an element, preferring explicit style over inherited.
 */
function extractTextColor(el: Element, style: HMIWebStyle): string {
  if (style.fontColor) return style.fontColor;
  const inlineStyle = parseInlineStyle(el.getAttribute('style') || '');
  if (inlineStyle['color']) return inlineStyle['color'];
  return el.getAttribute('data-text-color') || '#000000';
}
