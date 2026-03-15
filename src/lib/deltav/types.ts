// DeltaV Live Object Model — TypeScript port of DVLive namespace (SCILiveConverter)

/** Conversion output type — shared with HMI module */
export enum ConversionType {
  RENDER = 'RENDER',
  RADDICAL = 'RADDICAL',
  PROCESS_BOOK = 'PROCESS_BOOK',
}

/** EMU divisor per conversion mode: EMU / divisor = pixels */
export const GRAPHIC_DIVISORS: Record<ConversionType, number> = {
  [ConversionType.RENDER]: 7200,
  [ConversionType.RADDICAL]: 10800,
  [ConversionType.PROCESS_BOOK]: 5700,
};

/** DeltaV color theme */
export enum LiveTheme {
  DEFAULT = 'DEFAULT',
  DG = 'DG',
  DB = 'DB',
  TAN = 'TAN',
  LB = 'LB',
  MOT = 'MOT',
}

/** How a LiveValue resolves its concrete value */
export enum LiveValueSource {
  Direct = 'Direct',
  ThemeRef = 'ThemeRef',
  GemRef = 'GemRef',
  Formula = 'Formula',
}

/**
 * LiveValue — a property that can resolve from a direct value, theme lookup,
 * gem variable reference, or formula expression.
 */
export interface LiveValue {
  source: LiveValueSource;
  value?: string;           // Used when source = Direct
  themeVariable?: string;   // Used when source = ThemeRef
  gemVariable?: string;     // Used when source = GemRef
  formula?: string;         // Used when source = Formula
  defaultValue?: string;    // Fallback for ThemeRef / GemRef / Formula
}

/** All possible DVLive object type discriminants */
export type DVObjectType =
  | 'Rectangle'
  | 'Ellipse'
  | 'Arc'
  | 'Line'
  | 'Polygon'
  | 'Freeform'
  | 'Triangle'
  | 'Trapezoid'
  | 'RoundedRectangle'
  | 'Connector'
  | 'Image'
  | 'Button'
  | 'DataLink'
  | 'DisplayLink'
  | 'Text'
  | 'Group'
  | 'Gem';

/** Base interface for all DVLive objects after coordinate conversion */
export interface DVObjectBase {
  objectType: DVObjectType;
  name: string;
  left: number;    // pixels
  top: number;     // pixels
  width: number;   // pixels
  height: number;  // pixels
  rotation: number;   // degrees clockwise
  flipX: boolean;
  flipY: boolean;
  visible: LiveValue;
  fillColor: LiveValue;
  borderColor: LiveValue;
  borderWidth: LiveValue;
  opacity: LiveValue;  // 0–100 percent
}

export interface DVRectangle extends DVObjectBase {
  objectType: 'Rectangle';
  cornerRadius?: number;
}

export interface DVEllipse extends DVObjectBase {
  objectType: 'Ellipse';
}

export interface DVArc extends DVObjectBase {
  objectType: 'Arc';
  startAngle: number;
  sweepAngle: number;
}

export interface DVLine extends DVObjectBase {
  objectType: 'Line';
  x2: number;
  y2: number;
  points?: Array<{ x: number; y: number }>;
  lineColor: LiveValue;
  lineWidth: LiveValue;
}

export interface DVPolygon extends DVObjectBase {
  objectType: 'Polygon';
  points: Array<{ x: number; y: number }>;
}

export interface DVFreeform extends DVObjectBase {
  objectType: 'Freeform';
  points: Array<{ x: number; y: number }>;
}

export interface DVTriangle extends DVObjectBase {
  objectType: 'Triangle';
}

export interface DVTrapezoid extends DVObjectBase {
  objectType: 'Trapezoid';
}

export interface DVRoundedRectangle extends DVObjectBase {
  objectType: 'RoundedRectangle';
  cornerRadius: number;
}

export interface DVConnector extends DVObjectBase {
  objectType: 'Connector';
  points: Array<{ x: number; y: number }>;
}

export interface DVImage extends DVObjectBase {
  objectType: 'Image';
  imageData: string;   // base64-encoded or URL
  imageFormat?: string;
}

export interface DVButton extends DVObjectBase {
  objectType: 'Button';
  label: LiveValue;
  navigateTo: LiveValue;
}

export interface DVDataLink extends DVObjectBase {
  objectType: 'DataLink';
  tag: LiveValue;
  text: LiveValue;
  textColor: LiveValue;
  fontFamily: LiveValue;
  fontSize: LiveValue;
}

export interface DVDisplayLink extends DVObjectBase {
  objectType: 'DisplayLink';
  displayName: LiveValue;
  label: LiveValue;
}

export interface DVText extends DVObjectBase {
  objectType: 'Text';
  text: LiveValue;
  textColor: LiveValue;
  fontFamily: LiveValue;
  fontSize: LiveValue;
  horizontalAlignment: 'Left' | 'Center' | 'Right';
}

export interface DVGroup extends DVObjectBase {
  objectType: 'Group';
  children: DVObjectUnion[];
}

/** Override applied by a parent display to a gem child property */
export interface DVGemOverride {
  childPath: string;      // e.g. "Label" or "Group1/Label"
  propertyName: string;   // e.g. "Text", "FillColor"
  value: string;
}

export interface DVGem extends DVObjectBase {
  objectType: 'Gem';
  gemName: string;                     // references GemDefinition in library
  variables: Record<string, string>;   // variable name → resolved value
  overrides: DVGemOverride[];
  children?: DVObjectUnion[];          // populated after gem resolution
  isEmbedded?: boolean;               // inline definition vs library lookup
}

/** Discriminated union of all DVLive object types */
export type DVObjectUnion =
  | DVRectangle
  | DVEllipse
  | DVArc
  | DVLine
  | DVPolygon
  | DVFreeform
  | DVTriangle
  | DVTrapezoid
  | DVRoundedRectangle
  | DVConnector
  | DVImage
  | DVButton
  | DVDataLink
  | DVDisplayLink
  | DVText
  | DVGroup
  | DVGem;

/** Root DeltaV Live graphic — the parsed display */
export interface DVGraphic {
  name: string;
  width: number;       // pixels
  height: number;      // pixels
  backgroundColor: string;
  theme: LiveTheme;
  objects: DVObjectUnion[];
}

// --- Gem Library ---

export interface GraphicVariable {
  name: string;
  defaultValue: string;
  description?: string;
}

/** A resolved gem definition loaded from a .gc.ahc library file */
export interface GemDefinition {
  name: string;
  width: number;
  height: number;
  variables: GraphicVariable[];
  children: DVObjectUnion[];
  customDataLinkMap?: Record<string, string>;
}

export interface GemLibrary {
  gems: Map<string, GemDefinition>;
}

// --- Extraction results for RADDICAL / PROCESS_BOOK ---

export interface DVTagLink {
  tagname: string;    // normalized DCS tag
  objectName: string;
  gemName?: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface DVDisplayLinkInfo {
  displayName: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface DVConversionResult {
  graphicName: string;
  graphic: DVGraphic;
  svgOutput?: string;
  tagLinks: DVTagLink[];
  displayLinks: DVDisplayLinkInfo[];
}

export interface DVSettings {
  conversionType: ConversionType;
  theme: LiveTheme;
  gemLibraryPath?: string;
  piServerName?: string;
  raddicalNetworkPath?: string;
}
