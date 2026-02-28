// HMI Object Model — TypeScript port of C# HMIWebLib + SCIWebConverter types

/** Conversion output type */
export enum ConversionType {
  RENDER = 'RENDER',
  RADDICAL = 'RADDICAL',
  PROCESS_BOOK = 'PROCESS_BOOK',
}

/** 2D spatial positioning interface */
export interface I2DLocatable {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Text horizontal alignment */
export enum HorizontalAlignment {
  Near = 'Near',
  Center = 'Center',
  Far = 'Far',
}

/** Extracted data point tag with position */
export interface PointTag extends I2DLocatable {
  tagname: string;
  fontHexColor: string;
  horizontalAlignment: HorizontalAlignment;
}

/** Navigation button link with position */
export interface NavigationLink extends I2DLocatable {
  destination: string;
}

// --- HMI Object Model ---

export type HMIObjectType =
  | 'DataValue'
  | 'Button'
  | 'Group'
  | 'Shape'
  | 'Rectangle'
  | 'Oval'
  | 'Arc'
  | 'Line'
  | 'Image'
  | 'TextBox'
  | 'Unknown';

/** CSS-like styling for HMI objects */
export interface HMIWebStyle {
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  fontColor?: string;
  opacity?: number;
  borderRadius?: number;
  backgroundColor?: string;
}

/** Base HMI web object */
export interface HMIWebObject extends I2DLocatable {
  objectId: string;
  objectType: HMIObjectType;
  styleClass: string;
  style: HMIWebStyle;
  visible: boolean;
}

/** Data value display — shows a live tag value */
export interface HMIWebDataValue extends HMIWebObject {
  objectType: 'DataValue';
  fullTag: string;
  textColor: string;
  text?: string;
}

/** Button — navigates to another display */
export interface HMIWebButton extends HMIWebObject {
  objectType: 'Button';
  navigateTo: string;
  label?: string;
}

/** Group container with children */
export interface HMIWebGroup extends HMIWebObject {
  objectType: 'Group';
  children: HMIWebObjectUnion[];
}

/** Shape container with children */
export interface HMIWebShape extends HMIWebObject {
  objectType: 'Shape';
  children: HMIWebObjectUnion[];
  shapeName?: string;
}

/** Rectangle primitive */
export interface HMIWebRectangle extends HMIWebObject {
  objectType: 'Rectangle';
  cornerRadius?: number;
}

/** Oval/ellipse primitive */
export interface HMIWebOval extends HMIWebObject {
  objectType: 'Oval';
}

/** Arc primitive */
export interface HMIWebArc extends HMIWebObject {
  objectType: 'Arc';
  startAngle: number;
  sweepAngle: number;
}

/** Line primitive */
export interface HMIWebLine extends HMIWebObject {
  objectType: 'Line';
  x2: number;
  y2: number;
  points?: Array<{ x: number; y: number }>;
}

/** Embedded image (base64) */
export interface HMIWebImage extends HMIWebObject {
  objectType: 'Image';
  base64Data: string;
  imageFormat?: string;
}

/** Text label */
export interface HMIWebTextBox extends HMIWebObject {
  objectType: 'TextBox';
  text: string;
  textColor?: string;
  horizontalAlignment?: HorizontalAlignment;
}

/** Union of all HMI object types */
export type HMIWebObjectUnion =
  | HMIWebDataValue
  | HMIWebButton
  | HMIWebGroup
  | HMIWebShape
  | HMIWebRectangle
  | HMIWebOval
  | HMIWebArc
  | HMIWebLine
  | HMIWebImage
  | HMIWebTextBox;

/** Root HMI graphic — the full parsed display */
export interface HMIGraphic {
  name: string;
  width: number;
  height: number;
  objects: HMIWebObjectUnion[];
  backgroundColor?: string;
}

/** Per-display Raddical export container */
export interface RaddicalDisplay {
  graphicTitle: string;
  imagePath: string;
  width: number;
  height: number;
  pointTagList: PointTag[];
  navLinkList: NavigationLink[];
}

/** Root Raddical export object */
export interface RaddicalConvert {
  historianServerName: string;
  raddicalNetworkPath: string;
  displays: RaddicalDisplay[];
}

/** Application settings */
export interface HMISettings {
  conversionType: ConversionType;
  piServerName: string;
  raddicalNetworkPath: string;
  multiThreaded: boolean;
  imageScale: number;
  tagConversionMap: Map<string, string>;
}

/** Conversion progress for a single file */
export interface ConversionProgress {
  fileName: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
  message?: string;
}

/** Conversion result for a single file */
export interface ConversionResult {
  fileName: string;
  graphic: HMIGraphic;
  pointTags: PointTag[];
  navigationLinks: NavigationLink[];
  imageBlob?: Blob;
  imageDataUrl?: string;
}

/** Shape names to ignore during rendering */
export const SHAPE_NAME_IGNORE_LIST: ReadonlyArray<string> = [
  'WdgRedTag',
  'ConAlarmState',
  'LinExecState',
  'LineExecState',
  'TxtError',
  'TxtBad',
  'ScTxtSelectBox',
  'FrameDynamic',
  'GSH',
] as const;

export const DEFAULT_IMAGE_SCALE = 3.0;
