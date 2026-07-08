/** DeltaV alarm with enabled state, priority, and optional limit value. */
export interface Alarm {
  name: string;
  blockName: string;
  priority: string;
  limit: number | null; // null = not set (C# used -float.MaxValue as sentinel)
  enabled: boolean;
}

/** A named attribute instance carrying key→value pairs from a VALUE block. */
export interface AttributeInstance {
  name: string;
  /** Key→value pairs parsed from the VALUE { ... } block. */
  value: Record<string, string>;
  /** True when this attribute was inherited from the module class (not set on the instance). */
  isFromClass: boolean;
}

/** A DeltaV control module (MODULE_INSTANCE / SIF_MODULE / MODULE). */
export interface ControlModule {
  tagname: string;
  moduleClass: string;
  description: string;
  subType: string;
  alarmMap: Record<string, Alarm>;
  attributeMap: Record<string, AttributeInstance>;
}

/** A DeltaV module class (MODULE_CLASS). */
export interface ModuleClass {
  name: string;
  description: string;
  attributeMap: Record<string, AttributeInstance>;
}

/** Options passed to processFhx. */
export interface SiphonOptions {
  /**
   * 'config'  → Config Info + Class Info sheets (xlsx)
   * 'esp'     → Alarm ESP sheet (xlsx)
   * 'json'    → Config Info + Class Info as JSON
   */
  format: 'config' | 'esp' | 'json';
  /** If provided, only include attributes whose name is in this set. */
  paramMap?: string[];
}

/** A flat table row (string values only). */
export type TableRow = Record<string, string>;

/** One named table of rows. */
export interface NamedTable {
  name: string;
  rows: TableRow[];
}

/** processFhx result payload. */
export interface SiphonResult {
  tables: NamedTable[];
  moduleCount: number;
  classCount: number;
  elapsedMs: number;
}
