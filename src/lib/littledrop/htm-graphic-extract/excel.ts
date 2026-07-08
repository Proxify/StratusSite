/**
 * Excel export for HTM Graphic Extract results.
 * Mirrors the DataTables produced by the C# Build class — one sheet per table.
 * Uses SheetJS (xlsx) which is already a project dependency.
 */

import type { ExtractionResult } from './types';

export async function exportToExcel(result: ExtractionResult): Promise<Blob> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  // Tags By Graphic
  const tagsByGraphic = result.graphics.flatMap((g) =>
    g.tags.map((t) => ({ Graphic: g.graphicName, Tag: t }))
  );
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tagsByGraphic), 'Tags By Graphic');

  // Graphics By Tag
  const tagMap: Record<string, string[]> = {};
  for (const g of result.graphics) {
    for (const t of g.tags) {
      (tagMap[t] ??= []).push(g.graphicName);
    }
  }
  const graphicsByTag = Object.entries(tagMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([tag, gfxs]) => {
      const row: Record<string, string> = { Tag: tag };
      gfxs.forEach((g, i) => {
        row[`Graphic #${i + 1}`] = g;
      });
      return row;
    });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(graphicsByTag), 'Graphics By Tag');

  // Titles
  const titles = result.graphics.map((g) => ({ Graphic: g.graphicName, Title: g.title }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(titles), 'Titles');

  // Shape Appearance
  const shapeAppearance = result.graphics.map((g) => {
    const counts: Record<string, number> = {};
    for (const s of g.shapes) {
      if (s.shapeFileName) counts[s.shapeFileName] = (counts[s.shapeFileName] ?? 0) + 1;
    }
    const row: Record<string, string | number> = { Graphic: g.graphicName };
    Object.entries(counts).forEach(([file, count], i) => {
      row[`Shape ${i + 1}`] = `${count} x ${file}`;
    });
    return row;
  });
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(shapeAppearance),
    'Shape Appearance'
  );

  // All Scripts
  const allScripts = result.scripts.map((s) => ({
    Graphic: s.graphicName,
    'Shape Name': s.shapeName,
    Code: s.scriptCode.replace(/[\t\n\r]/g, ''),
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allScripts), 'All Scripts');

  // Custom Scripts (if any)
  if (result.customScripts.length > 0) {
    const customScripts = result.customScripts.map((s) => ({
      Graphic: s.graphicName,
      'Shape Name': s.shapeName,
      Code: s.scriptCode.replace(/[\t\n\r]/g, ''),
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(customScripts), 'Custom Scripts');
  }

  // Static Text (if present)
  const allTextBoxes = result.graphics.flatMap((g) => g.textBoxes);
  if (allTextBoxes.length > 0) {
    const staticText = allTextBoxes.map((t) => ({
      Graphic: t.graphicName,
      'Shape ID': t.shapeID,
      Content: t.content,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(staticText), 'Static Text');
  }

  // About
  const about = [
    { Info: 'Generated using HMI Insight (StratusSite).' },
    { Info: 'For any queries, please reach out to contact@stratussoftware.net' },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(about), 'About');

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  return new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
