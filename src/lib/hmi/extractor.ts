/**
 * Tag & Navigation Extractor
 *
 * Port of C# HMIWebGraphic.GetAllDataAndDisplayLinks
 * Walks the HMI object tree and extracts:
 * - PointTags from HMIWebDataValue objects
 * - NavigationLinks from HMIWebButton objects
 * Recurses into HMIWebGroup and HMIWebShape children.
 */

import {
  type HMIGraphic,
  type HMIWebObjectUnion,
  type PointTag,
  type NavigationLink,
  type ConversionType,
  HorizontalAlignment,
} from './types';

export interface ExtractionResult {
  pointTags: PointTag[];
  navigationLinks: NavigationLink[];
}

/**
 * Extract all data tags and navigation links from an HMI graphic.
 * Port of C# GetAllDataAndDisplayLinks.
 */
export function extractDataAndLinks(
  graphic: HMIGraphic,
  options: {
    tagConversionMap?: Map<string, string>;
    conversionType?: ConversionType;
    historianServerName?: string;
  } = {}
): ExtractionResult {
  const pointTags: PointTag[] = [];
  const navigationLinks: NavigationLink[] = [];

  for (const obj of graphic.objects) {
    walkObject(obj, pointTags, navigationLinks, options);
  }

  return { pointTags, navigationLinks };
}

function walkObject(
  obj: HMIWebObjectUnion,
  pointTags: PointTag[],
  navigationLinks: NavigationLink[],
  options: {
    tagConversionMap?: Map<string, string>;
    conversionType?: ConversionType;
    historianServerName?: string;
  }
): void {
  // CASE 1: Data Values (Tags) — skip tiny/invisible objects
  if (obj.objectType === 'DataValue') {
    if (obj.width > 1 && obj.height > 1) {
      const dataValue = obj;
      if (dataValue.fullTag && dataValue.fullTag.trim() !== '') {
        let dataLinkAddress = dataValue.fullTag;

        // Clean whitespace (port of C# whitespace removal)
        if (dataLinkAddress.includes(' ')) {
          dataLinkAddress = dataLinkAddress.replace(/\s/g, '');
        }

        // Apply tag conversion map
        if (options.tagConversionMap?.has(dataLinkAddress)) {
          dataLinkAddress = options.tagConversionMap.get(dataLinkAddress)!;
        }

        // Raddical mode: append historian server name
        if (options.conversionType === 'RADDICAL' && options.historianServerName) {
          dataLinkAddress = dataLinkAddress + options.historianServerName;
        }

        pointTags.push({
          tagname: dataLinkAddress,
          fontHexColor: dataValue.textColor || '#000000',
          x: dataValue.x,
          y: dataValue.y,
          width: dataValue.width,
          height: dataValue.height,
          horizontalAlignment: HorizontalAlignment.Center,
        });
      }
    }
    return;
  }

  // CASE 2: Navigation Buttons
  if (obj.objectType === 'Button') {
    let destination = obj.navigateTo || '';

    // Clean quotes (port of C# quote removal)
    if (destination.includes('"')) {
      destination = destination.replace(/"/g, '');
    }

    navigationLinks.push({
      destination,
      x: obj.x,
      y: obj.y,
      width: obj.width,
      height: obj.height,
    });
    return;
  }

  // CASE 3: Groups — recurse into children
  if (obj.objectType === 'Group') {
    for (const child of obj.children) {
      walkObject(child, pointTags, navigationLinks, options);
    }
    return;
  }

  // CASE 4: Shapes — recurse into children
  if (obj.objectType === 'Shape') {
    for (const child of obj.children) {
      walkObject(child, pointTags, navigationLinks, options);
    }
    return;
  }
}
