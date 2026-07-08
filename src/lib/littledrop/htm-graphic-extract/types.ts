/** Types for the HTM Graphic Extract module — port of the LittleDropSuite C# module. */

export interface ScriptDataEntry {
  point: string;
  parameter: string;
  displayAs: string;
}

export interface ExtractedShape {
  graphicName: string;
  shapeName: string;
  shapeFileName: string;
  /** Parsed parameters keyed by the part after '?' in the parameter name. */
  parameters: Record<string, string>;
  /** Script data from DSD bindings — empty unless DSD files are provided. */
  scriptData: ScriptDataEntry[];
}

export interface TextBox {
  graphicName: string;
  shapeID: string;
  content: string;
}

export interface ExtractedGraphic {
  graphicName: string;
  title: string;
  /** Unique tag names referenced on this graphic (sorted). */
  tags: string[];
  shapes: ExtractedShape[];
  textBoxes: TextBox[];
}

export interface ExtractedScript {
  graphicName: string;
  shapeName: string;
  scriptCode: string;
}

export interface ExtractionOptions {
  includeStaticText?: boolean;
  /** When true, static text is filtered to entries that look like tag-style values (3–8 chars, mostly digits). */
  filterStaticText?: boolean;
}

export interface ExtractionResult {
  graphics: ExtractedGraphic[];
  scripts: ExtractedScript[];
  /** Scripts that are not matched by the standard Honeywell exemption patterns. */
  customScripts: ExtractedScript[];
  stats: {
    graphicCount: number;
    tagCount: number;
    shapeCount: number;
    scriptCount: number;
    customScriptCount: number;
  };
}

export interface UploadedFile {
  name: string;
  content: string;
}
