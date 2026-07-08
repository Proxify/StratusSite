// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { parseFhx } from '@/lib/littledrop/config-siphon/parser';
import { buildTables } from '@/lib/littledrop/config-siphon/exporter';

// ---------------------------------------------------------------------------
// Minimal FHX fixture helpers
// ---------------------------------------------------------------------------

function makeFhx(body: string): string {
  return `DELTA_V_FILE_VERSION=11.3.1\n${body}`;
}

const SIMPLE_MODULE = makeFhx(`
MODULE_INSTANCE TAG="TIC-101" CATEGORY=UNDEFINED
{
  MODULE_CLASS="PID_MODULE"
  DESCRIPTION="Temperature controller"
  SUB_TYPE="CONTROLLER"
  ATTRIBUTE_INSTANCE NAME="AI1$OUT_SCALE" CATEGORY=UNDEFINED
  {
    VALUE
    {
      EU100=100.0 EU0=0.0 UNITS="degF"
    }
  }
  ATTRIBUTE_INSTANCE NAME="PID1$SP" CATEGORY=UNDEFINED
  {
    VALUE
    {
      CV=50.0
    }
  }
}
`);

const MODULE_CLASS_FHX = makeFhx(`
MODULE_CLASS NAME="PID_MODULE" CATEGORY=UNDEFINED
{
  DESCRIPTION="PID control module class"
  ATTRIBUTE_INSTANCE NAME="AI1$OUT_SCALE" CATEGORY=UNDEFINED
  {
    VALUE
    {
      EU100=100.0 EU0=0.0 UNITS="degF"
    }
  }
}
MODULE_INSTANCE TAG="TIC-102" CATEGORY=UNDEFINED
{
  MODULE_CLASS="PID_MODULE"
  DESCRIPTION="Downstream TC"
}
`);

const MULTI_MODULE_FHX = makeFhx(`
MODULE_INSTANCE TAG="FIC-201" CATEGORY=UNDEFINED
{
  DESCRIPTION="Flow controller"
}
MODULE_INSTANCE TAG="LIC-301" CATEGORY=UNDEFINED
{
  DESCRIPTION="Level controller"
}
SIF_MODULE TAG="SIF-001" CATEGORY=UNDEFINED
{
  DESCRIPTION="Safety function"
}
`);

const ESP_FHX = makeFhx(`
MODULE_INSTANCE TAG="PIC-101" CATEGORY=UNDEFINED
{
  DESCRIPTION="Pressure controller"
}
`);

// ---------------------------------------------------------------------------
// parseFhx
// ---------------------------------------------------------------------------

describe('parseFhx', () => {
  it('parses a simple MODULE_INSTANCE', () => {
    const { controlModules } = parseFhx(SIMPLE_MODULE);
    expect(controlModules).toHaveLength(1);
    const cm = controlModules[0];
    expect(cm.tagname).toBe('TIC-101');
    expect(cm.moduleClass).toBe('PID_MODULE');
    expect(cm.description).toBe('Temperature controller');
    expect(cm.subType).toBe('CONTROLLER');
  });

  it('parses attribute instances and their value maps', () => {
    const { controlModules } = parseFhx(SIMPLE_MODULE);
    const cm = controlModules[0];
    expect(Object.keys(cm.attributeMap)).toContain('AI1$OUT_SCALE');
    const scale = cm.attributeMap['AI1$OUT_SCALE'];
    expect(scale.value['EU100']).toBe('100.0');
    expect(scale.value['EU0']).toBe('0.0');
    expect(scale.value['UNITS']).toBe('degF');
  });

  it('parses bare numeric CV values', () => {
    const { controlModules } = parseFhx(SIMPLE_MODULE);
    const sp = controlModules[0].attributeMap['PID1$SP'];
    expect(sp).toBeDefined();
    expect(sp.value['CV']).toBe('50.0');
  });

  it('parses MODULE_CLASS blocks', () => {
    const { moduleClassMap } = parseFhx(MODULE_CLASS_FHX);
    expect(moduleClassMap['PID_MODULE']).toBeDefined();
    expect(moduleClassMap['PID_MODULE'].description).toBe('PID control module class');
    expect(Object.keys(moduleClassMap['PID_MODULE'].attributeMap)).toContain('AI1$OUT_SCALE');
  });

  it('handles multiple MODULE_INSTANCE and SIF_MODULE blocks', () => {
    const { controlModules } = parseFhx(MULTI_MODULE_FHX);
    expect(controlModules).toHaveLength(3);
    const tags = controlModules.map((m) => m.tagname);
    expect(tags).toContain('FIC-201');
    expect(tags).toContain('LIC-301');
    expect(tags).toContain('SIF-001');
  });

  it('returns empty arrays for empty/garbage input', () => {
    const { controlModules, moduleClassMap } = parseFhx('nothing here');
    expect(controlModules).toHaveLength(0);
    expect(Object.keys(moduleClassMap)).toHaveLength(0);
  });

  it('normalises Windows CRLF line endings', () => {
    const crlf = SIMPLE_MODULE.replace(/\n/g, '\r\n');
    const { controlModules } = parseFhx(crlf);
    expect(controlModules[0].tagname).toBe('TIC-101');
  });
});

// ---------------------------------------------------------------------------
// buildTables
// ---------------------------------------------------------------------------

describe('buildTables', () => {
  it('config format produces Config Info and Class Info sheets plus About', () => {
    const parsed = parseFhx(SIMPLE_MODULE);
    const tables = buildTables(parsed, { format: 'config' });
    const names = tables.map((t) => t.name);
    expect(names).toContain('Config Info');
    expect(names).toContain('Class Info');
    expect(names).toContain('About');
  });

  it('Config Info rows include core columns', () => {
    const parsed = parseFhx(SIMPLE_MODULE);
    const tables = buildTables(parsed, { format: 'config' });
    const configTable = tables.find((t) => t.name === 'Config Info')!;
    expect(configTable.rows).toHaveLength(1);
    const row = configTable.rows[0];
    expect(row['Tag Name']).toBe('TIC-101');
    expect(row['Description']).toBe('Temperature controller');
    expect(row['Module Class']).toBe('PID_MODULE');
  });

  it('Config Info expands attribute value keys into columns', () => {
    const parsed = parseFhx(SIMPLE_MODULE);
    const tables = buildTables(parsed, { format: 'config' });
    const row = tables.find((t) => t.name === 'Config Info')!.rows[0];
    expect(row['AI1$OUT_SCALE EU100']).toBe('100.0');
    expect(row['AI1$OUT_SCALE UNITS']).toBe('degF');
  });

  it('class-inherited attributes are wrapped in angle brackets', () => {
    const parsed = parseFhx(MODULE_CLASS_FHX);
    const tables = buildTables(parsed, { format: 'config' });
    const row = tables.find((t) => t.name === 'Config Info')!.rows[0];
    // TIC-102 has no instance-level attribute, so it should inherit from class
    expect(row['AI1$OUT_SCALE EU100']).toBe('<100.0>');
  });

  it('paramMap filters attribute columns', () => {
    const parsed = parseFhx(SIMPLE_MODULE);
    const tables = buildTables(parsed, { format: 'config', paramMap: ['PID1$SP'] });
    const row = tables.find((t) => t.name === 'Config Info')!.rows[0];
    expect(row['PID1$SP CV']).toBe('50.0');
    expect(row['AI1$OUT_SCALE EU100']).toBeUndefined();
  });

  it('esp format produces Alarm ESP sheet', () => {
    const parsed = parseFhx(ESP_FHX);
    const tables = buildTables(parsed, { format: 'esp' });
    expect(tables.find((t) => t.name === 'Alarm ESP')).toBeDefined();
    expect(tables.find((t) => t.name === 'Config Info')).toBeUndefined();
  });

  it('json format (same tables as config) via buildTables', () => {
    const parsed = parseFhx(SIMPLE_MODULE);
    const tables = buildTables(parsed, { format: 'json' });
    expect(tables.find((t) => t.name === 'Config Info')).toBeDefined();
  });

  it('Class Info lists module classes', () => {
    const parsed = parseFhx(MODULE_CLASS_FHX);
    const tables = buildTables(parsed, { format: 'config' });
    const classTable = tables.find((t) => t.name === 'Class Info')!;
    expect(classTable.rows).toHaveLength(1);
    expect(classTable.rows[0]['Name']).toBe('PID_MODULE');
  });
});
