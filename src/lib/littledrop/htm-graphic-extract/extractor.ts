/**
 * HTM Graphic Extractor
 *
 * Ports the LittleDropSuite C# "HTM Graphic Extract" module to Node-safe TypeScript.
 * Parses Honeywell Experion .htm export files using the same regex patterns as the C# source.
 * Pure regex — no DOMParser — safe to run in Next.js API routes (Node environment).
 *
 * Intentional deviations from the C# source:
 * - DSD/Bindings file parsing (ScriptData from _files directory) is skipped.
 *   The web context cannot walk a filesystem directory; those files would need to be
 *   uploaded separately. Add when zip-upload is supported.
 * - Shape file existence / fileSize checks are skipped (no filesystem access).
 * - WinForms progress callbacks are not ported.
 */

import type {
  ExtractionOptions,
  ExtractionResult,
  ExtractedGraphic,
  ExtractedScript,
  ExtractedShape,
  TextBox,
  UploadedFile,
} from './types';

// ponytail: matches C# exemptList in Main.cs constructor exactly
const EXEMPT = [
  'Page',
  'GSH_Cmenu',
  'GSH_Trend_Sup',
  'Alp',
  'event=onshapeload>on error resume next',
  'event=onactivate>On error resume Next',
  'event=onmouseover>me.style.cursor',
  'event=onclick>dim sShow,sErr,oShape',
  'event=onshapeload',
  'window.external.Parent.RequestTask',
  'IndivisualTrndClr_onClick',
];

function isExempt(shapeName: string, scriptCode: string): boolean {
  const name = shapeName.toLowerCase();
  const code = scriptCode.toLowerCase();
  return EXEMPT.some((e) => name.includes(e.toLowerCase()) || code.includes(e.toLowerCase()));
}

/**
 * Parse a Honeywell parameters string like:
 *   "HscRect001?tagname:FIC101.PV;HscRect001?title:My Title;HscRect001?color:GREEN"
 *
 * Returns:
 *   - params: keys are the part after '?', values are the part after ':'
 *   - tags: collected tag values (from ?tag or ?tagname keys)
 *   - title: last seen title value (from ?title or ?txtDisplayTitle)
 */
function parseParameters(paramStr: string): {
  params: Record<string, string>;
  tags: string[];
  title: string;
} {
  const params: Record<string, string> = {};
  const tags: string[] = [];
  let title = '';

  for (const pair of paramStr.split(';')) {
    if (!pair.trim()) continue;

    const colonIdx = pair.indexOf(':');
    if (colonIdx < 0) {
      // key only — strip prefix up to '?'
      const qIdx = pair.indexOf('?');
      const key = qIdx >= 0 ? pair.slice(qIdx + 1) : pair;
      if (key && !(key in params)) params[key] = '';
      continue;
    }

    const rawKey = pair.slice(0, colonIdx);
    const val = pair.slice(colonIdx + 1);
    const qIdx = rawKey.indexOf('?');
    const key = qIdx >= 0 ? rawKey.slice(qIdx + 1) : rawKey;

    // Tags: ?tagname or ?tag must appear at position > 0 (matches C# > 0 check)
    if (
      (rawKey.toLowerCase().indexOf('?tagname') > 0 || rawKey.toLowerCase().indexOf('?tag') > 0) &&
      val && val !== '-'
    ) {
      if (!tags.includes(val)) tags.push(val);
    }

    // Title: ?title or ?txtDisplayTitle
    if (
      rawKey.toLowerCase().indexOf('?title') > 0 ||
      rawKey.toLowerCase().indexOf('?txtdisplaytitle') > 0
    ) {
      title = val;
    }

    if (key && !(key in params)) params[key] = val;
  }

  return { params, tags, title };
}

/**
 * Build an ExtractedShape from one DIV/INPUT/TEXTAREA element's inner HTML attribute string.
 * Mutates graphicTags and titleRef to match the C# Graphic.buildShape() side-effect behaviour.
 */
function buildShape(
  shapeHTM: string,
  graphicName: string,
  existingShapes: ExtractedShape[],
  graphicTags: string[],
  titleRef: { value: string }
): ExtractedShape | null {
  const shape: ExtractedShape = {
    graphicName,
    shapeName: '',
    shapeFileName: '',
    parameters: {},
    scriptData: [],
  };

  // Regex mirrors C# Graphic.buildShape — 3 or 4 capture groups via alternation:
  //   [1] sha file name
  //   [2] parameters string
  //   [3] id / shape name (space-delimited)
  //
  // ponytail: HDXBINDINGID (group 4) captured but not used; DSD parsing skipped
  const RE_SHAPE =
    /src\s*=\s*"\.\\(?:.*?)_files\\(.*?)\.sha|parameters\s*=\s*"(.*?)"|\sid=(.*?)\s/gi; // singleLine, s unneeded

  for (const m of shapeHTM.matchAll(RE_SHAPE)) {
    if (m[1]) {
      shape.shapeFileName = m[1];
    } else if (m[2]) {
      const { params, tags, title } = parseParameters(m[2]);
      Object.assign(shape.parameters, params);
      for (const t of tags) {
        if (!graphicTags.includes(t)) graphicTags.push(t);
      }
      if (title) titleRef.value = title;
    } else if (m[3]) {
      const value = m[3].trim();
      // Skip sub-elements like "shape002_TextBox" when parent "shape002" already exists
      const parent = existingShapes.find(
        (s) => value !== s.shapeName && value.startsWith(s.shapeName + '_')
      );
      if (!parent) {
        shape.shapeName = value;
      } else {
        const suffix = value.slice(parent.shapeName.length + 1);
        if (/^\d/.test(suffix)) shape.shapeName = value;
      }
    }
  }

  if (!shape.graphicName || !shape.shapeName) return null;
  return shape;
}

function extractStaticText(
  singleLine: string,
  graphicName: string,
  filter: boolean
): TextBox[] {
  const boxes: TextBox[] = [];
  const RE_TB = /<DIV(.*?class="?hvg\.textbox.*?>.*?<)\/DIV>/gi; // singleLine, s unneeded

  for (const m of singleLine.matchAll(RE_TB)) {
    const value = m[1];
    if (!value) continue;

    const idM = value.match(/\sid=(.*?)\s/i);
    const shapeID = idM ? idM[1].trim() : '';
    if (!shapeID.toLowerCase().includes('textbox')) continue;

    const start = value.indexOf('>') + 1;
    const end = value.indexOf('<', start);
    if (start <= 0 || end <= start) continue;
    const content = value.slice(start, end);

    if (filter) {
      const numDigits = (content.match(/\d/g) ?? []).length;
      if (content.length <= 3 || content.length >= 9 || numDigits <= 3 || numDigits >= 8) continue;
    }

    boxes.push({ graphicName, shapeID, content });
  }

  return boxes;
}

export function extractFromFiles(
  files: UploadedFile[],
  options: ExtractionOptions = {}
): ExtractionResult {
  const htmFiles = files.filter((f) => /\.htm$/i.test(f.name));

  const graphics: ExtractedGraphic[] = [];
  const allScripts: ExtractedScript[] = [];

  for (const file of htmFiles) {
    const graphicName = file.name.replace(/\.[^.]+$/, '');
    const raw = file.content;
    // Single line for DIV/INPUT parsing (mirrors htmAsSingleString in C#)
    const singleLine = raw.split(/\r?\n/).join(' ');

    // --- Scripts (C# Main.buildStructures script pass) ---
    // ponytail: s flag not available at ES2017 target — use [\s\S]*? to cross newlines
    const RE_SCRIPT = /<script\s+language=vbscript\s+for=([\s\S]*?)<\/script>/gi;
    for (const sm of raw.matchAll(RE_SCRIPT)) {
      const value = sm[1];
      if (!value) continue;
      const nameM = value.match(/^(.*?)\s/i);
      if (!nameM?.[1]) continue;
      const shapeName = nameM[1];
      if (/ScConAlp/i.test(shapeName)) continue;
      allScripts.push({ graphicName, shapeName, scriptCode: value });
    }

    // --- Shapes (DIV / INPUT / TEXTAREA) ---
    const RE_ELEMENTS = /<DIV(.*?)>|<INPUT(.*?)>|<TEXTAREA(.*?)>/gi; // runs on singleLine, s flag unneeded
    const shapes: ExtractedShape[] = [];
    const graphicTags: string[] = [];
    const titleRef = { value: '' };

    for (const dm of singleLine.matchAll(RE_ELEMENTS)) {
      const value = dm[1] ?? dm[2] ?? dm[3] ?? '';
      if (!value) continue;
      // Exclude _ScConAlp TEXTAREA (C# exclusion)
      if (dm[3] !== undefined && /_ScConAlp/i.test(value)) continue;

      const shape = buildShape(value, graphicName, shapes, graphicTags, titleRef);
      if (shape) shapes.push(shape);
    }

    // Post-sort mirrors C# graphicList.ForEach sort step
    graphicTags.sort();
    shapes.sort((a, b) => a.shapeName.localeCompare(b.shapeName));

    // Static text
    const textBoxes =
      options.includeStaticText
        ? extractStaticText(singleLine, graphicName, options.filterStaticText ?? false)
        : [];

    graphics.push({
      graphicName,
      title: titleRef.value,
      tags: graphicTags,
      shapes,
      textBoxes,
    });
  }

  // Sort graphics and scripts to match C# ordering
  graphics.sort((a, b) => a.graphicName.localeCompare(b.graphicName));
  allScripts.sort(
    (a, b) =>
      a.graphicName.localeCompare(b.graphicName) || a.shapeName.localeCompare(b.shapeName)
  );

  const customScripts = allScripts.filter((s) => !isExempt(s.shapeName, s.scriptCode));

  return {
    graphics,
    scripts: allScripts,
    customScripts,
    stats: {
      graphicCount: graphics.length,
      tagCount: graphics.reduce((n, g) => n + g.tags.length, 0),
      shapeCount: graphics.reduce((n, g) => n + g.shapes.length, 0),
      scriptCount: allScripts.length,
      customScriptCount: customScripts.length,
    },
  };
}
