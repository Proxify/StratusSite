/**
 * CSV Exporter
 *
 * Exports PointTag and NavigationLink data to CSV format.
 */

import type { PointTag, NavigationLink } from '../types';

/**
 * Export point tags to CSV string.
 */
export function exportTagsCsv(tags: PointTag[]): string {
  const headers = ['Tagname', 'FontColor', 'X', 'Y', 'Width', 'Height', 'Alignment'];
  const rows = tags.map((tag) => [
    escapeCsvField(tag.tagname),
    escapeCsvField(tag.fontHexColor),
    String(tag.x),
    String(tag.y),
    String(tag.width),
    String(tag.height),
    tag.horizontalAlignment,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Export navigation links to CSV string.
 */
export function exportNavLinksCsv(links: NavigationLink[]): string {
  const headers = ['Destination', 'X', 'Y', 'Width', 'Height'];
  const rows = links.map((link) => [
    escapeCsvField(link.destination),
    String(link.x),
    String(link.y),
    String(link.width),
    String(link.height),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Export combined tags and nav links to CSV.
 */
export function exportCombinedCsv(tags: PointTag[], links: NavigationLink[]): string {
  const tagSection = exportTagsCsv(tags);
  const navSection = exportNavLinksCsv(links);
  return `Point Tags\n${tagSection}\n\nNavigation Links\n${navSection}`;
}

/**
 * Convert CSV string to a downloadable Blob.
 */
export function csvToBlob(csv: string): Blob {
  return new Blob([csv], { type: 'text/csv;charset=utf-8' });
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
