/**
 * Gem Resolver — loads GemDefinitions from .gc.ahc library files and resolves
 * LiveGem instances within a DVGraphic.
 *
 * A Gem is DeltaV Live's reusable component system:
 *   1. A GemDefinition stored in a .gc.ahc library file defines the template.
 *   2. A LiveGem instance in a .di.ahc display references the gem by name,
 *      supplies variable values (e.g., Tag="FIC101"), and may include property
 *      overrides for specific child objects.
 *   3. Resolution clones the gem's child objects, substitutes variables, and
 *      applies any overrides.
 */

import {
  type DVObjectUnion,
  type DVGem,
  type DVGemOverride,
  type DVGraphic,
  type GemDefinition,
  type GemLibrary,
  type GraphicVariable,
  type LiveValue,
  ConversionType,
  GRAPHIC_DIVISORS,
  LiveTheme,
  LiveValueSource,
} from './types';
import { parseLiveValueFromElement, directValue } from './live-value';
import { parseGemChildren } from './parser';

// ---------------------------------------------------------------------------
// Library loading
// ---------------------------------------------------------------------------

/**
 * Parse a .gc.ahc gem library file into a GemLibrary map.
 *
 * A .gc.ahc file may define one or multiple gems. The root element is typically
 * <GemLibrary> or <LiveGemLibrary> containing <GemDefinition> children, or the
 * root itself is a single <GemDefinition>.
 */
export function loadGemLibrary(
  xmlContent: string,
  mode: ConversionType = ConversionType.RENDER
): GemLibrary {
  const divisor = GRAPHIC_DIVISORS[mode];
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, 'application/xml');
  const root = doc.documentElement;

  const gems = new Map<string, GemDefinition>();
  if (!root) return { gems };

  // Case 1: Root is a library container
  const defEls = root.querySelectorAll(
    'GemDefinition, LiveGemDefinition, Gem'
  );
  if (defEls.length > 0) {
    for (const defEl of defEls) {
      const def = parseGemDefinition(defEl, divisor);
      if (def) gems.set(def.name, def);
    }
  } else if (
    root.tagName === 'GemDefinition' ||
    root.tagName === 'LiveGemDefinition'
  ) {
    // Case 2: Root IS the definition
    const def = parseGemDefinition(root, divisor);
    if (def) gems.set(def.name, def);
  }

  return { gems };
}

function parseGemDefinition(
  el: Element,
  divisor: number
): GemDefinition | null {
  const name = el.getAttribute('Name') ?? el.getAttribute('GemName');
  if (!name) return null;

  const width = parseEMU(el.getAttribute('Width'), divisor);
  const height = parseEMU(el.getAttribute('Height'), divisor);

  // Parse graphic variables (parameters)
  const variables: GraphicVariable[] = [];
  const varsEl = el.querySelector('GraphicVariables, Variables');
  if (varsEl) {
    for (const varEl of varsEl.children) {
      const vName = varEl.getAttribute('Name');
      if (vName) {
        variables.push({
          name: vName,
          defaultValue: varEl.getAttribute('DefaultValue') ?? '',
          description: varEl.getAttribute('Description') ?? undefined,
        });
      }
    }
  }

  // Parse custom data link map
  const customDataLinkMap: Record<string, string> = {};
  const cdlEl = el.querySelector('CustomDataLinkMap');
  if (cdlEl) {
    for (const entryEl of cdlEl.children) {
      const key = entryEl.getAttribute('Key') ?? entryEl.getAttribute('GemType');
      const val = entryEl.getAttribute('Value') ?? entryEl.getAttribute('TagPath');
      if (key && val) customDataLinkMap[key] = val;
    }
  }

  // Parse children using the shared parser
  const objectsEl = el.querySelector('Objects') ?? el;
  const children = parseGemChildren(objectsEl.outerHTML, divisor);

  return {
    name,
    width,
    height,
    variables,
    children,
    customDataLinkMap: Object.keys(customDataLinkMap).length > 0
      ? customDataLinkMap
      : undefined,
  };
}

function parseEMU(raw: string | null, divisor: number): number {
  if (!raw) return 0;
  const n = parseFloat(raw);
  return isNaN(n) ? 0 : Math.round(n / divisor);
}

// ---------------------------------------------------------------------------
// Gem resolution
// ---------------------------------------------------------------------------

/**
 * Resolve all LiveGem instances in a DVGraphic by substituting variables and
 * applying overrides. Mutates gem objects in-place by populating `children`.
 *
 * Gems not found in the library are left as-is (children remain undefined).
 */
export function resolveGems(graphic: DVGraphic, library: GemLibrary): DVGraphic {
  return {
    ...graphic,
    objects: resolveObjectList(graphic.objects, library),
  };
}

function resolveObjectList(
  objects: DVObjectUnion[],
  library: GemLibrary
): DVObjectUnion[] {
  return objects.map((obj) => {
    if (obj.objectType === 'Gem') {
      return resolveGem(obj, library);
    }
    if (obj.objectType === 'Group') {
      return {
        ...obj,
        children: resolveObjectList(obj.children, library),
      };
    }
    return obj;
  });
}

function resolveGem(gem: DVGem, library: GemLibrary): DVGem {
  // Already resolved (embedded or previously resolved)
  if (gem.isEmbedded && gem.children) return gem;

  const def = library.gems.get(gem.gemName);
  if (!def) {
    // Library not loaded or gem not found — leave unresolved
    return gem;
  }

  // Build the merged variable scope: definition defaults ← gem instance values
  const mergedVars: Record<string, string> = {};
  for (const v of def.variables) {
    mergedVars[v.name] = v.defaultValue;
  }
  for (const [k, v] of Object.entries(gem.variables)) {
    mergedVars[k] = v;
  }

  // Clone and substitute gem children
  let children = cloneAndSubstitute(def.children, mergedVars);

  // Apply overrides from the gem instance
  children = applyOverrides(children, gem.overrides, mergedVars);

  return {
    ...gem,
    variables: mergedVars,
    children,
  };
}

/**
 * Deep-clone DVObjectUnion array, substituting gem variable references.
 */
function cloneAndSubstitute(
  objects: DVObjectUnion[],
  vars: Record<string, string>
): DVObjectUnion[] {
  return objects.map((obj) => substituteObject(obj, vars));
}

function substituteObject(
  obj: DVObjectUnion,
  vars: Record<string, string>
): DVObjectUnion {
  const substituted = substituteBaseProps(obj, vars);

  if (obj.objectType === 'Group') {
    return {
      ...substituted,
      objectType: 'Group',
      children: cloneAndSubstitute(obj.children, vars),
    } as DVObjectUnion;
  }

  if (obj.objectType === 'Gem') {
    return {
      ...substituted,
      objectType: 'Gem',
      variables: substituteVarRecord(obj.variables, vars),
    } as DVObjectUnion;
  }

  return substituted as DVObjectUnion;
}

function substituteBaseProps(
  obj: DVObjectUnion,
  vars: Record<string, string>
): DVObjectUnion {
  const result: Record<string, unknown> = { ...obj };
  for (const key of Object.keys(result)) {
    const val = result[key];
    if (val && typeof val === 'object' && 'source' in val) {
      result[key] = substituteValue(val as LiveValue, vars);
    }
  }
  return result as unknown as DVObjectUnion;
}

function substituteValue(lv: LiveValue, vars: Record<string, string>): LiveValue {
  if (lv.source === LiveValueSource.GemRef && lv.gemVariable && lv.gemVariable in vars) {
    return directValue(vars[lv.gemVariable]);
  }
  return lv;
}

function substituteVarRecord(
  record: Record<string, string>,
  vars: Record<string, string>
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(record)) {
    result[k] = vars[v] ?? v;
  }
  return result;
}

/**
 * Apply a gem instance's property overrides to its resolved children.
 * childPath can be a simple name ("Label") or a slash-delimited path
 * ("Group1/Label") navigating the child tree.
 */
function applyOverrides(
  objects: DVObjectUnion[],
  overrides: DVGemOverride[],
  _vars: Record<string, string>
): DVObjectUnion[] {
  if (overrides.length === 0) return objects;

  // Build a mutable copy of the objects array
  const mutable = [...objects];

  for (const override of overrides) {
    const pathParts = override.childPath.split('/');
    applyOverridePath(mutable, pathParts, override.propertyName, override.value);
  }

  return mutable;
}

function applyOverridePath(
  objects: DVObjectUnion[],
  path: string[],
  propertyName: string,
  value: string
): void {
  const [head, ...rest] = path;
  for (let i = 0; i < objects.length; i++) {
    const obj = objects[i];
    if (obj.name !== head) continue;

    if (rest.length === 0) {
      // Apply override to this object
      objects[i] = applyPropertyOverride(obj, propertyName, value);
    } else {
      // Recurse into children
      if (obj.objectType === 'Group' && obj.children) {
        const children = [...obj.children];
        applyOverridePath(children, rest, propertyName, value);
        objects[i] = { ...obj, children };
      }
    }
    break;
  }
}

function applyPropertyOverride(
  obj: DVObjectUnion,
  propertyName: string,
  value: string
): DVObjectUnion {
  // Map property names to object keys
  const keyMap: Record<string, string> = {
    Text: 'text',
    FillColor: 'fillColor',
    BorderColor: 'borderColor',
    BorderWidth: 'borderWidth',
    TextColor: 'textColor',
    FontFamily: 'fontFamily',
    FontSize: 'fontSize',
    Visible: 'visible',
    Opacity: 'opacity',
    Tag: 'tag',
    Label: 'label',
    NavigateTo: 'navigateTo',
    DisplayName: 'displayName',
  };

  const key = keyMap[propertyName] ?? propertyName.charAt(0).toLowerCase() + propertyName.slice(1);
  const asRecord = obj as unknown as Record<string, unknown>;

  if (key in asRecord && asRecord[key] && typeof asRecord[key] === 'object' && 'source' in (asRecord[key] as object)) {
    return { ...obj, [key]: directValue(value) } as DVObjectUnion;
  }

  // Scalar property
  return { ...obj, [key]: value } as DVObjectUnion;
}

// ---------------------------------------------------------------------------
// Tag extraction helpers
// ---------------------------------------------------------------------------

/**
 * Extract all DataLink tags from a resolved DVObjectUnion tree.
 * Used for RADDICAL/PROCESS_BOOK export.
 */
export function extractTagsFromObject(
  obj: DVObjectUnion,
  library: GemLibrary,
  theme: LiveTheme
): Array<{ tagname: string; objectName: string; gemName?: string }> {
  const tags: Array<{ tagname: string; objectName: string; gemName?: string }> = [];

  if (obj.objectType === 'DataLink') {
    const rawTag =
      obj.tag.source === LiveValueSource.Direct ? (obj.tag.value ?? '') : '';
    if (rawTag) {
      tags.push({ tagname: rawTag, objectName: obj.name });
    }
  }

  if (obj.objectType === 'Gem' && obj.children) {
    for (const child of obj.children) {
      const childTags = extractTagsFromObject(child, library, theme);
      tags.push(...childTags.map((t) => ({ ...t, gemName: obj.gemName })));
    }
  }

  if (obj.objectType === 'Group') {
    for (const child of obj.children) {
      tags.push(...extractTagsFromObject(child, library, theme));
    }
  }

  return tags;
}
