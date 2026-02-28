/**
 * Raddical Exporter
 *
 * Generates Raddical .info file format and JSON export.
 * Port of C# RaddicalConvert.SerializeRad
 *
 * .info format:
 *   [OUTPUT_FOLDER]<path>
 *   [DISP_NAME]<name>
 *   [DEST_FOLDER]<network path>
 *   [JPEG]<filename.jpg>
 *   [TAG_VALUE]<tagname>\t<x>\t<y>\t<x+w>\t<y+h>
 *   [AREA_LINK]<dest path>\t<x>\t<y>\t<x+w>\t<y+h>
 */

import type { RaddicalConvert, RaddicalDisplay, PointTag, NavigationLink } from '../types';

/**
 * Create a RaddicalConvert container.
 */
export function createRaddicalConvert(
  historianServerName: string,
  raddicalNetworkPath: string
): RaddicalConvert {
  return {
    historianServerName,
    raddicalNetworkPath,
    displays: [],
  };
}

/**
 * Create a RaddicalDisplay. Width and height are doubled per C# convention.
 */
export function createRaddicalDisplay(
  graphicTitle: string,
  imagePath: string,
  width: number,
  height: number,
  pointTagList: PointTag[],
  navLinkList: NavigationLink[]
): RaddicalDisplay {
  return {
    graphicTitle,
    imagePath,
    width: width * 2,
    height: height * 2,
    pointTagList,
    navLinkList,
  };
}

/**
 * Serialize a RaddicalConvert to the .info file format string.
 * Port of C# RaddicalConvert.SerializeRad
 */
export function serializeRaddicalInfo(
  raddicalConvert: RaddicalConvert,
  outputFolder: string
): string {
  const lines: string[] = [];

  lines.push(`[OUTPUT_FOLDER]${outputFolder}`);

  for (const display of raddicalConvert.displays) {
    lines.push(`[DISP_NAME]${display.graphicTitle}`);
    lines.push(`[DEST_FOLDER]${raddicalConvert.raddicalNetworkPath}`);

    // Extract just the filename from the image path
    const imageName = display.imagePath.includes('/')
      ? display.imagePath.split('/').pop()!
      : display.imagePath.includes('\\')
        ? display.imagePath.split('\\').pop()!
        : display.imagePath;
    lines.push(`[JPEG]${imageName}`);

    // Tag values: [TAG_VALUE]tagname\tx\ty\tx+w\ty+h
    for (const tag of display.pointTagList) {
      lines.push(
        `[TAG_VALUE]${tag.tagname}\t${tag.x}\t${tag.y}\t${tag.x + tag.width}\t${tag.y + tag.height}`
      );
    }

    // Navigation links: [AREA_LINK]dest\tx\ty\tx+w\ty+h
    for (const nav of display.navLinkList) {
      if (nav.destination && nav.destination.trim() !== '') {
        const destPath = `${raddicalConvert.raddicalNetworkPath}\\${nav.destination}.rvw`;
        lines.push(
          `[AREA_LINK]${destPath}\t${nav.x}\t${nav.y}\t${nav.x + nav.width}\t${nav.y + nav.height}`
        );
      }
    }
  }

  return lines.join('\n');
}

/**
 * Serialize a RaddicalConvert to JSON format.
 */
export function serializeRaddicalJson(raddicalConvert: RaddicalConvert): string {
  return JSON.stringify(raddicalConvert, null, 2);
}

/**
 * Generate both .info and .json as downloadable Blobs.
 */
export function exportRaddical(
  raddicalConvert: RaddicalConvert,
  outputFolder: string
): { infoBlob: Blob; jsonBlob: Blob } {
  const infoContent = serializeRaddicalInfo(raddicalConvert, outputFolder);
  const jsonContent = serializeRaddicalJson(raddicalConvert);

  return {
    infoBlob: new Blob([infoContent], { type: 'text/plain' }),
    jsonBlob: new Blob([jsonContent], { type: 'application/json' }),
  };
}
