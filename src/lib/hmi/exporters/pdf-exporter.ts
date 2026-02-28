/**
 * PDF Exporter
 *
 * Generates PDF documentation from rendered HMI graphic images.
 * Uses jsPDF for client-side PDF generation.
 */

import type { ConversionResult } from '../types';

/**
 * Generate a PDF containing rendered HMI graphic images.
 * Each graphic gets its own page.
 */
export async function exportToPdf(
  results: ConversionResult[],
  title: string = 'HMI Graphics Report'
): Promise<Blob> {
  // Dynamic import jsPDF to keep it client-side only
  const { jsPDF } = await import('jspdf');

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'px',
  });

  // Title page
  doc.setFontSize(24);
  doc.text(title, 40, 60);
  doc.setFontSize(12);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 85);
  doc.text(`Total graphics: ${results.length}`, 40, 100);

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    doc.addPage('landscape');

    // Page header
    doc.setFontSize(14);
    doc.text(result.fileName, 40, 30);
    doc.setFontSize(10);
    doc.text(
      `Dimensions: ${result.graphic.width}×${result.graphic.height} | Tags: ${result.pointTags.length} | Nav Links: ${result.navigationLinks.length}`,
      40,
      45
    );

    // Add rendered image if available
    if (result.imageDataUrl) {
      try {
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const maxWidth = pageWidth - 80;
        const maxHeight = pageHeight - 80;

        const aspect = result.graphic.width / result.graphic.height;
        let imgWidth = maxWidth;
        let imgHeight = imgWidth / aspect;

        if (imgHeight > maxHeight) {
          imgHeight = maxHeight;
          imgWidth = imgHeight * aspect;
        }

        doc.addImage(result.imageDataUrl, 'JPEG', 40, 55, imgWidth, imgHeight);
      } catch {
        doc.text('[Image rendering failed]', 40, 70);
      }
    }
  }

  return doc.output('blob');
}
