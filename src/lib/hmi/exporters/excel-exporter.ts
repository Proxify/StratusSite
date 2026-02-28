/**
 * Excel Exporter
 *
 * Generates Excel workbooks with HMI graphic metadata.
 * Uses xlsx (SheetJS) library for client-side Excel generation.
 */

import type { ConversionResult, PointTag, NavigationLink } from '../types';

/**
 * Export conversion results to an Excel workbook Blob.
 */
export async function exportToExcel(
  results: ConversionResult[],
  title: string = 'HMI Graphics Report'
): Promise<Blob> {
  const XLSX = await import('xlsx');

  const workbook = XLSX.utils.book_new();

  // Summary sheet
  const summaryData = results.map((r) => ({
    'Graphic Name': r.fileName,
    Width: r.graphic.width,
    Height: r.graphic.height,
    'Tag Count': r.pointTags.length,
    'Nav Link Count': r.navigationLinks.length,
  }));
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // All Tags sheet
  const allTags: Array<PointTag & { graphic: string }> = [];
  for (const result of results) {
    for (const tag of result.pointTags) {
      allTags.push({ ...tag, graphic: result.fileName });
    }
  }
  if (allTags.length > 0) {
    const tagData = allTags.map((t) => ({
      Graphic: t.graphic,
      Tagname: t.tagname,
      'Font Color': t.fontHexColor,
      X: t.x,
      Y: t.y,
      Width: t.width,
      Height: t.height,
      Alignment: t.horizontalAlignment,
    }));
    const tagSheet = XLSX.utils.json_to_sheet(tagData);
    XLSX.utils.book_append_sheet(workbook, tagSheet, 'Tags');
  }

  // All Navigation Links sheet
  const allNavLinks: Array<NavigationLink & { graphic: string }> = [];
  for (const result of results) {
    for (const link of result.navigationLinks) {
      allNavLinks.push({ ...link, graphic: result.fileName });
    }
  }
  if (allNavLinks.length > 0) {
    const navData = allNavLinks.map((n) => ({
      Graphic: n.graphic,
      Destination: n.destination,
      X: n.x,
      Y: n.y,
      Width: n.width,
      Height: n.height,
    }));
    const navSheet = XLSX.utils.json_to_sheet(navData);
    XLSX.utils.book_append_sheet(workbook, navSheet, 'Navigation Links');
  }

  // Write to buffer
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
