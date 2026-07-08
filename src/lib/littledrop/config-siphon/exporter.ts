/**
 * Config Siphon exporter — parsed data → NamedTable[] → xlsx buffer or JSON.
 *
 * Port of the GetConfigTable / GetClassTable / GetESPDataTable methods in
 * LittleDrop Suite/Modules/Config_Siphon/Main.cs.
 *
 * Deviations from C#:
 *  - Uses SheetJS (xlsx) instead of ClosedXML.
 *  - Returns a Buffer (xlsx) or plain objects (json) instead of writing files.
 *  - GetAlarmDataTable is dead code in the C# (commented-out call) — skipped.
 *  - AttributeInstance mutation bug in C# GetConfigTable is avoided by copying.
 */

import type {
  AttributeInstance,
  ControlModule,
  ModuleClass,
  NamedTable,
  SiphonOptions,
  SiphonResult,
  TableRow,
} from './types';
import type { ParseResult } from './parser';

// ---------------------------------------------------------------------------
// Table builders
// ---------------------------------------------------------------------------

/**
 * GetConfigTable — one row per control module, dynamic attribute columns.
 * Class-inherited attribute values are wrapped in angle brackets.
 */
function buildConfigTable(
  controlModules: ControlModule[],
  moduleClassMap: Record<string, ModuleClass>,
  paramMap: Set<string>
): NamedTable {
  const rows: TableRow[] = [];

  for (const cm of controlModules) {
    const row: TableRow = {
      'Tag Name': cm.tagname,
      Description: cm.description,
      'Module Class': cm.moduleClass,
      SubType: cm.subType,
    };

    // Merge class attributes (as defaults) into a local copy — never mutate the class map.
    const mergedAttMap: Record<string, AttributeInstance> = { ...cm.attributeMap };
    if (cm.moduleClass && moduleClassMap[cm.moduleClass]) {
      for (const [attrKey, classAttr] of Object.entries(
        moduleClassMap[cm.moduleClass].attributeMap
      )) {
        const instanceKey = attrKey.replace(/\//g, '$');
        if (!mergedAttMap[instanceKey]) {
          mergedAttMap[instanceKey] = { ...classAttr, name: instanceKey, isFromClass: true };
        }
      }
    }

    for (const attr of Object.values(mergedAttMap)) {
      if (paramMap.size > 0 && !paramMap.has(attr.name)) continue;
      for (const [key, val] of Object.entries(attr.value)) {
        const col = `${attr.name} ${key}`;
        const cleaned = val.replace(/"/g, '');
        row[col] = attr.isFromClass ? `<${cleaned}>` : cleaned;
      }
    }

    rows.push(row);
  }

  return { name: 'Config Info', rows };
}

/**
 * GetClassTable — one row per module class, dynamic attribute columns.
 */
function buildClassTable(moduleClassMap: Record<string, ModuleClass>): NamedTable {
  const rows: TableRow[] = [];

  for (const mc of Object.values(moduleClassMap)) {
    const row: TableRow = { Name: mc.name, Description: mc.description };
    for (const attr of Object.values(mc.attributeMap)) {
      for (const [key, val] of Object.entries(attr.value)) {
        row[`${attr.name} ${key}`] = val;
      }
    }
    rows.push(row);
  }

  return { name: 'Class Info', rows };
}

/**
 * GetESPDataTable — one row per enabled alarm (Alarm ESP format).
 */
function buildEspTable(controlModules: ControlModule[]): NamedTable {
  const rows: TableRow[] = [];

  for (const cm of controlModules) {
    for (const alarm of Object.values(cm.alarmMap)) {
      if (!alarm.enabled) continue;
      rows.push({
        'Tag Name': cm.tagname,
        'Purpose of Alarm': cm.description,
        Verification: 'N/A',
        Note: cm.description,
        'If No Alarm, or Alert, why not': '',
        'Alarm or Alert Strategy': 'Follow mitigation plan.',
        'Boundary Name': alarm.priority,
        'Alarm Type': alarm.name.replace(/_ALM/i, ' Alarm'),
        'Alarm Priority': alarm.priority,
        Value: alarm.limit === null ? '' : String(alarm.limit),
        'Reason for Value': '',
        'Potential Impact': '',
        'Console Action': '',
        'Field Action': '',
        'Escalation/Notification': '',
      });
    }
  }

  return { name: 'Alarm ESP', rows };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build NamedTable[] from parsed FHX data according to the requested format.
 */
export function buildTables(
  parsed: ParseResult,
  options: SiphonOptions
): NamedTable[] {
  const paramSet = new Set(options.paramMap ?? []);
  const tables: NamedTable[] = [];

  if (options.format === 'esp') {
    tables.push(buildEspTable(parsed.controlModules));
  } else {
    tables.push(buildConfigTable(parsed.controlModules, parsed.moduleClassMap, paramSet));
    tables.push(buildClassTable(parsed.moduleClassMap));
  }

  tables.push({
    name: 'About',
    rows: [
      { Info: 'Generated using Stratus Platform — Config Siphon.' },
      { Info: 'For queries please reach out to contact@stratussoftware.net' },
    ],
  });

  return tables;
}

/**
 * Produce a complete SiphonResult (tables + stats) from parsed data.
 */
export function buildResult(
  parsed: ParseResult,
  options: SiphonOptions,
  elapsedMs: number
): SiphonResult {
  return {
    tables: buildTables(parsed, options),
    moduleCount: parsed.controlModules.length,
    classCount: Object.keys(parsed.moduleClassMap).length,
    elapsedMs,
  };
}

/**
 * Write NamedTable[] to an xlsx Buffer using SheetJS.
 * Dynamic import keeps xlsx out of the client bundle.
 */
export async function tablesToXlsx(tables: NamedTable[]): Promise<Uint8Array> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  for (const table of tables) {
    const ws = XLSX.utils.json_to_sheet(table.rows);
    XLSX.utils.book_append_sheet(wb, ws, table.name.substring(0, 31)); // xlsx sheet name ≤31 chars
  }

  // 'array' type returns Uint8Array, directly usable as BodyInit in Response
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as Uint8Array;
  return buf;
}
