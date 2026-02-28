// Utility functions ported from C# ColorExtensions, StringExtensions, RegexExtensions

/**
 * Parse a CSS color string (hex or rgb()) to an {r,g,b,a} object.
 * Handles: #RGB, #RRGGBB, rgb(r,g,b), rgba(r,g,b,a), named CSS colors via canvas.
 */
export function parseColor(color: string): { r: number; g: number; b: number; a: number } {
  if (!color || color.trim() === '') {
    return { r: 0, g: 0, b: 0, a: 1 };
  }

  const trimmed = color.trim();

  // Handle rgb()/rgba() format
  if (trimmed.toLowerCase().startsWith('rgb')) {
    const inner = trimmed
      .replace(/rgba?\s*\(/i, '')
      .replace(')', '')
      .split(',')
      .map((s) => s.trim());

    return {
      r: parseInt(inner[0] || '0', 10),
      g: parseInt(inner[1] || '0', 10),
      b: parseInt(inner[2] || '0', 10),
      a: inner[3] !== undefined ? parseFloat(inner[3]) : 1,
    };
  }

  // Handle hex format
  if (trimmed.startsWith('#')) {
    let hex = trimmed.slice(1);
    // Expand shorthand (#RGB → #RRGGBB)
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: 1,
    };
  }

  // Fallback: treat as hex without '#'
  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) {
    return {
      r: parseInt(trimmed.slice(0, 2), 16),
      g: parseInt(trimmed.slice(2, 4), 16),
      b: parseInt(trimmed.slice(4, 6), 16),
      a: 1,
    };
  }

  // Default black
  return { r: 0, g: 0, b: 0, a: 1 };
}

/**
 * Convert parsed color to CSS string.
 */
export function colorToCss(color: { r: number; g: number; b: number; a?: number }): string {
  if (color.a !== undefined && color.a < 1) {
    return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
  }
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

/**
 * Convert a color string (hex/rgb) to a CSS-usable string.
 * Port of C# ColorExtensions.FromHex
 */
export function fromHex(hex: string): string {
  const parsed = parseColor(hex);
  return colorToCss(parsed);
}

/**
 * Find the Nth occurrence of a substring.
 * Port of C# StringExtensions.IndexOfNth
 */
export function indexOfNth(str: string, value: string, nth: number = 1): number {
  if (nth <= 0) throw new Error('nth must be >= 1');
  let offset = str.indexOf(value);
  for (let i = 1; i < nth; i++) {
    if (offset === -1) return -1;
    offset = str.indexOf(value, offset + 1);
  }
  return offset;
}

/**
 * Extract text between two delimiters using regex.
 * Port of C# RegexExtensions.ParseBetween
 */
export function parseBetween(
  text: string,
  startText: string,
  endText: string,
  captureGroup: string = '(.*?)'
): string {
  const joined = Array.isArray(text) ? text.join(' ') : text;
  const pattern = new RegExp(startText + captureGroup + endText, 'is');
  const match = joined.match(pattern);
  if (match && match[1] && match[1] !== '') {
    return match[1];
  }
  return '';
}

/**
 * Extract content from <Content>...</Content> tags.
 * Port of C# RegexExtensions.ParseContent
 */
export function parseContent(text: string): string {
  return parseBetween(text, '<Content>', '</Content>');
}

/**
 * Parse a CSS length value to number (handles px, pt, etc.)
 */
export function parseCssLength(value: string | null | undefined): number {
  if (!value) return 0;
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}

/**
 * Parse inline style string to a key-value map.
 */
export function parseInlineStyle(styleStr: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!styleStr) return result;

  const parts = styleStr.split(';').filter((s) => s.trim() !== '');
  for (const part of parts) {
    const colonIdx = part.indexOf(':');
    if (colonIdx === -1) continue;
    const key = part.slice(0, colonIdx).trim();
    const val = part.slice(colonIdx + 1).trim();
    if (key) result[key] = val;
  }
  return result;
}

/**
 * Generate unique ID for HMI objects.
 */
let idCounter = 0;
export function generateObjectId(prefix: string = 'hmi'): string {
  return `${prefix}_${++idCounter}`;
}

export function resetIdCounter(): void {
  idCounter = 0;
}

/**
 * Tile an image into a grid of sub-images.
 * Port of C# ImageTile.GenerateTiles
 * Returns array of { col, row, canvas } tile objects.
 */
export function tileImage(
  sourceCanvas: HTMLCanvasElement | OffscreenCanvas,
  cols: number,
  rows: number
): Array<{ col: number; row: number; canvas: OffscreenCanvas }> {
  const srcWidth = sourceCanvas.width;
  const srcHeight = sourceCanvas.height;
  const tileWidth = Math.floor(srcWidth / cols);
  const tileHeight = Math.floor(srcHeight / rows);
  const tiles: Array<{ col: number; row: number; canvas: OffscreenCanvas }> = [];

  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      const tile = new OffscreenCanvas(tileWidth, tileHeight);
      const ctx = tile.getContext('2d');
      if (ctx) {
        ctx.drawImage(
          sourceCanvas,
          col * tileWidth,
          row * tileHeight,
          tileWidth,
          tileHeight,
          0,
          0,
          tileWidth,
          tileHeight
        );
      }
      tiles.push({ col, row, canvas: tile });
    }
  }

  return tiles;
}

/**
 * Parse a tab-separated tag conversion map file.
 * Format: OldTagName\tNewTagName per line
 */
export function parseTagConversionMap(content: string): Map<string, string> {
  const map = new Map<string, string>();
  const lines = content.split('\n').filter((l) => l.trim() !== '');

  for (const line of lines) {
    const parts = line.split('\t');
    if (parts.length >= 2) {
      const oldTag = parts[0].trim();
      const newTag = parts[1].trim();
      if (oldTag && newTag) {
        map.set(oldTag, newTag);
      }
    }
  }

  return map;
}
