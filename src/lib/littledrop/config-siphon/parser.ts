/**
 * Config Siphon parser — FHX file → ControlModule[] + ModuleClass[].
 *
 * Port of:
 *   LittleDrop Suite/Modules/Config_Siphon/Main.cs (parse section)
 *   LittleDrop Suite/Modules/Config_Siphon/DeltaV/*.cs
 *
 * Deviations from C#:
 *  - Value parsing is cleaner than the C# implementation (which had a dead code
 *    path for string values due to an else-if bug). We parse KEY="value" and
 *    KEY=value in one pass each.
 *  - No WinForms, PI/Raddical, or licensing code paths.
 *  - Windows \r\n is normalised to \n on entry.
 */

import type { AttributeInstance, ControlModule, ModuleClass } from './types';

// ---------------------------------------------------------------------------
// Value-block parsing (replaces AttributeInstance.CreateAttributeInstance)
// ---------------------------------------------------------------------------

/**
 * Parse key=value pairs from a VALUE { ... } block body.
 * Handles both quoted strings (KEY="val") and bare scalars (KEY=1.0).
 */
function parseValueBlock(content: string): Record<string, string> {
  const pairs: Record<string, string> = {};
  const strKeys = new Set<string>();

  // Quoted strings first: KEY="value"
  const strRe = /([A-Za-z0-9_]+)="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = strRe.exec(content)) !== null) {
    pairs[m[1]] = m[2];
    strKeys.add(m[1]);
  }

  // Bare scalars: KEY=value (no quotes, no braces, not already captured)
  const numRe = /([A-Za-z0-9_]+)=([^\s"{}]+)/g;
  while ((m = numRe.exec(content)) !== null) {
    if (!strKeys.has(m[1])) {
      pairs[m[1]] = m[2];
    }
  }

  return pairs;
}

/**
 * Parse a single ATTRIBUTE_INSTANCE text block (the captured content after
 * the ATTRIBUTE_INSTANCE keyword, up to and excluding the closing \n  }).
 */
function createAttributeInstance(attText: string): AttributeInstance | null {
  // Skip array/element attributes (not scalar config values)
  if (/ELEMENT|ARRAY/i.test(attText)) return null;

  let name = '';
  const value: Record<string, string> = {};

  // Match NAME="..." and VALUE { ... } blocks
  const re = /\sNAME="([^"]*)"|VALUE\s*\{([\s\S]*?)\}/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(attText)) !== null) {
    if (m[1] !== undefined && m[1] !== '' && name === '') {
      name = m[1];
    } else if (m[2] !== undefined && m[2] !== '') {
      // Skip EXPRESSION blocks
      if (/EXPRESSION/i.test(m[2])) continue;
      Object.assign(value, parseValueBlock(m[2]));
    }
  }

  if (!name) return null;
  return { name, value, isFromClass: false };
}

// ---------------------------------------------------------------------------
// Module class parsing (replaces ModuleClass.CreateModuleClass)
// ---------------------------------------------------------------------------

function createModuleClass(classText: string): ModuleClass {
  const mc: ModuleClass = { name: '', description: '', attributeMap: {} };

  const re = /\sNAME="([^"]*)"|DESCRIPTION="([^"]*)"|\n\s\sATTRIBUTE_INSTANCE(\s[\s\S]*?)\n\s\s\}/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(classText)) !== null) {
    if (m[1] !== undefined && m[1] !== '' && mc.name === '') {
      mc.name = m[1];
    } else if (m[2] !== undefined && m[2] !== '' && mc.description === '') {
      mc.description = m[2];
    } else if (m[3] !== undefined && m[3] !== '') {
      const att = createAttributeInstance(m[3]);
      if (att && att.name && !mc.attributeMap[att.name]) {
        mc.attributeMap[att.name] = att;
      }
    }
  }

  return mc;
}

// ---------------------------------------------------------------------------
// Control module parsing (replaces inner loop in Main.execute)
// ---------------------------------------------------------------------------

function createControlModule(modText: string): ControlModule {
  const cm: ControlModule = {
    tagname: '',
    moduleClass: '',
    description: '',
    subType: '',
    alarmMap: {},
    attributeMap: {},
  };

  const re =
    /TAG="([^"]*)"|MODULE_CLASS="([^"]*)"|DESCRIPTION=(.*?)\n|SUB_TYPE="([^"]*)"|\n\s\sATTRIBUTE_INSTANCE(\s[\s\S]*?)\n\s\s\}/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(modText)) !== null) {
    if (m[1] !== undefined && m[1] !== '' && cm.tagname === '') {
      cm.tagname = m[1];
    } else if (m[2] !== undefined && m[2] !== '' && cm.moduleClass === '') {
      cm.moduleClass = m[2];
    } else if (m[3] !== undefined && m[3] !== '' && cm.description === '') {
      // Strip surrounding quotes and whitespace/CR
      const raw = m[3].trim().replace(/^"|"$/g, '');
      if (raw.length > 0) cm.description = raw;
    } else if (m[4] !== undefined && m[4] !== '' && cm.subType === '') {
      cm.subType = m[4];
    } else if (m[5] !== undefined && m[5] !== '') {
      const att = createAttributeInstance(m[5]);
      if (att && att.name && !cm.attributeMap[att.name]) {
        cm.attributeMap[att.name] = att;
      }
    }
  }

  return cm;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ParseResult {
  controlModules: ControlModule[];
  moduleClassMap: Record<string, ModuleClass>;
}

/**
 * Parse an FHX file string into control modules and module classes.
 */
export function parseFhx(fhxContent: string): ParseResult {
  // Normalise Windows line endings
  const text = fhxContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const controlModules: ControlModule[] = [];
  const moduleClassMap: Record<string, ModuleClass> = {};

  // Outer regex: finds MODULE_INSTANCE / SIF_MODULE / MODULE blocks (group 1)
  // and MODULE_CLASS blocks (group 2).
  // The \n} pattern correctly identifies the top-level closing brace because
  // nested block closers are indented (e.g. \n  }).
  const outerRe =
    /(?:MODULE_INSTANCE|SIF_MODULE|MODULE)(\sTAG="(?:[^"]*)"(?:[\s\S]*?)\{[\s\S]*?)\n\}|MODULE_CLASS(\sNAME="(?:[^"]*)"(?:[\s\S]*?)\{[\s\S]*?)\n\}/gi;

  let m: RegExpExecArray | null;
  while ((m = outerRe.exec(text)) !== null) {
    if (m[1] !== undefined && m[1] !== '') {
      controlModules.push(createControlModule(m[1]));
    } else if (m[2] !== undefined && m[2] !== '') {
      const mc = createModuleClass(m[2]);
      if (mc.name && !moduleClassMap[mc.name]) {
        moduleClassMap[mc.name] = mc;
      }
    }
  }

  return { controlModules, moduleClassMap };
}
