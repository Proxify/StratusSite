import { describe, it, expect } from 'vitest';
import { parseHMIFile } from '@/lib/hmi/parser';
import type {
  HMIWebRectangle,
  HMIWebOval,
  HMIWebDataValue,
  HMIWebButton,
  HMIWebGroup,
  HMIWebShape,
  HMIWebTextBox,
  HMIWebArc,
  HMIWebImage,
  HMIWebLine,
} from '@/lib/hmi/types';
import { readFileSync } from 'fs';
import { join } from 'path';

const fixturesDir = join(__dirname, '..', 'fixtures');

function loadFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), 'utf-8');
}

describe('parseHMIFile', () => {
  describe('basic parsing', () => {
    it('parses a minimal graphic with dimensions', () => {
      const htm = loadFixture('minimal-graphic.htm');
      const graphic = parseHMIFile(htm, 'minimal-graphic.htm');

      expect(graphic.name).toBe('minimal-graphic');
      expect(graphic.width).toBe(800);
      expect(graphic.height).toBe(600);
      expect(graphic.objects.length).toBeGreaterThan(0);
    });

    it('strips .htm extension from name', () => {
      const graphic = parseHMIFile('<html><body style="width:100px;height:100px;"></body></html>', 'test.htm');
      expect(graphic.name).toBe('test');
    });
  });

  describe('object type detection (data-type attribute)', () => {
    const htm = loadFixture('sample-graphic.htm');
    let graphic: ReturnType<typeof parseHMIFile>;

    // Parse once for the whole describe block
    graphic = parseHMIFile(htm, 'sample-graphic.htm');

    it('parses graphic dimensions from body', () => {
      expect(graphic.width).toBe(1024);
      expect(graphic.height).toBe(768);
    });

    it('detects Rectangle objects', () => {
      const rects = graphic.objects.filter((o) => o.objectType === 'Rectangle') as HMIWebRectangle[];
      expect(rects.length).toBeGreaterThanOrEqual(1);
      const first = rects[0];
      expect(first.x).toBe(10);
      expect(first.y).toBe(10);
      expect(first.width).toBe(200);
      expect(first.height).toBe(100);
    });

    it('parses rounded rectangle corner radius', () => {
      const rects = graphic.objects.filter((o) => o.objectType === 'Rectangle') as HMIWebRectangle[];
      const rounded = rects.find((r) => r.cornerRadius && r.cornerRadius > 0);
      expect(rounded).toBeDefined();
      expect(rounded!.cornerRadius).toBe(10);
    });

    it('detects Oval objects', () => {
      const ovals = graphic.objects.filter((o) => o.objectType === 'Oval') as HMIWebOval[];
      expect(ovals.length).toBeGreaterThanOrEqual(1);
      expect(ovals[0].width).toBe(80);
      expect(ovals[0].height).toBe(80);
    });

    it('detects DataValue objects with tag', () => {
      const dataValues = graphic.objects.filter((o) => o.objectType === 'DataValue') as HMIWebDataValue[];
      expect(dataValues.length).toBeGreaterThanOrEqual(2);
      const f101 = dataValues.find((d) => d.fullTag === 'F101.PV');
      expect(f101).toBeDefined();
      expect(f101!.x).toBe(50);
      expect(f101!.y).toBe(150);
      expect(f101!.textColor).toBe('#00FF00');
    });

    it('detects Button objects with navigation', () => {
      const buttons = graphic.objects.filter((o) => o.objectType === 'Button') as HMIWebButton[];
      expect(buttons.length).toBeGreaterThanOrEqual(1);
      const btn = buttons.find((b) => b.navigateTo.includes('Display_002'));
      expect(btn).toBeDefined();
      expect(btn!.label).toBe('Go to Display 2');
    });

    it('detects TextBox objects', () => {
      const textBoxes = graphic.objects.filter((o) => o.objectType === 'TextBox') as HMIWebTextBox[];
      expect(textBoxes.length).toBeGreaterThanOrEqual(1);
      const overview = textBoxes.find((t) => t.text === 'System Overview');
      expect(overview).toBeDefined();
    });

    it('detects Arc objects with angles', () => {
      const arcs = graphic.objects.filter((o) => o.objectType === 'Arc') as HMIWebArc[];
      expect(arcs.length).toBeGreaterThanOrEqual(1);
      expect(arcs[0].startAngle).toBe(0);
      expect(arcs[0].sweepAngle).toBe(180);
    });

    it('detects Image objects with base64', () => {
      const images = graphic.objects.filter((o) => o.objectType === 'Image') as HMIWebImage[];
      expect(images.length).toBeGreaterThanOrEqual(1);
      expect(images[0].base64Data).toContain('iVBORw0KGgo');
    });

    it('detects Line objects with points', () => {
      const lines = graphic.objects.filter((o) => o.objectType === 'Line') as HMIWebLine[];
      // Lines can be top-level or nested in shapes
      const allLines = findAllOfType(graphic.objects, 'Line') as HMIWebLine[];
      expect(allLines.length).toBeGreaterThanOrEqual(1);
    });

    it('detects Group containers with children', () => {
      const groups = graphic.objects.filter((o) => o.objectType === 'Group') as HMIWebGroup[];
      expect(groups.length).toBeGreaterThanOrEqual(1);
      const group = groups[0];
      expect(group.children.length).toBeGreaterThan(0);
    });

    it('detects Shape containers with children', () => {
      const shapes = findAllOfType(graphic.objects, 'Shape') as HMIWebShape[];
      // MainPipe shape should be present, WdgRedTag should be filtered
      const mainPipe = shapes.find((s) => s.shapeName === 'MainPipe');
      expect(mainPipe).toBeDefined();
      expect(mainPipe!.children.length).toBeGreaterThan(0);
    });

    it('filters out shapes in the ignore list', () => {
      const shapes = findAllOfType(graphic.objects, 'Shape') as HMIWebShape[];
      const redTag = shapes.find((s) => s.shapeName?.includes('WdgRedTag'));
      expect(redTag).toBeUndefined();
    });
  });

  describe('CSS class-based detection', () => {
    it('detects objects by CSS class names', () => {
      const htm = loadFixture('css-class-graphic.htm');
      const graphic = parseHMIFile(htm, 'css-class-graphic.htm');

      expect(graphic.width).toBeGreaterThanOrEqual(630);
      expect(graphic.height).toBeGreaterThanOrEqual(470);

      const dataValues = findAllOfType(graphic.objects, 'DataValue') as HMIWebDataValue[];
      expect(dataValues.length).toBeGreaterThanOrEqual(1);
      const flow = dataValues.find((d) => d.fullTag === 'FLOW.PV');
      expect(flow).toBeDefined();

      const buttons = findAllOfType(graphic.objects, 'Button') as HMIWebButton[];
      expect(buttons.length).toBeGreaterThanOrEqual(1);

      const textBoxes = findAllOfType(graphic.objects, 'TextBox') as HMIWebTextBox[];
      expect(textBoxes.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('style extraction', () => {
    it('extracts fill and stroke colors', () => {
      const htm = `<html><body style="width:100px;height:100px;">
        <div data-type="rectangle" style="position:absolute;left:0px;top:0px;width:100px;height:100px;background-color:#FF0000;border:2px solid #00FF00;"></div>
      </body></html>`;
      const graphic = parseHMIFile(htm, 'test.htm');
      const rect = graphic.objects[0] as HMIWebRectangle;
      expect(rect.style.fillColor).toBe('#FF0000');
      expect(rect.style.strokeColor).toBe('#00FF00');
      expect(rect.style.strokeWidth).toBe(2);
    });

    it('extracts font properties', () => {
      const htm = `<html><body style="width:100px;height:100px;">
        <div data-type="textbox" style="position:absolute;left:0px;top:0px;width:100px;height:20px;color:#FFFFFF;font-size:16px;font-family:Arial;">Hello</div>
      </body></html>`;
      const graphic = parseHMIFile(htm, 'test.htm');
      const text = graphic.objects[0] as HMIWebTextBox;
      expect(text.style.fontColor).toBe('#FFFFFF');
      expect(text.style.fontSize).toBe(16);
      expect(text.style.fontFamily).toBe('Arial');
    });
  });
});

// Utility: recursively find all objects of a given type
function findAllOfType(objects: any[], type: string): any[] {
  const found: any[] = [];
  for (const obj of objects) {
    if (obj.objectType === type) found.push(obj);
    if (obj.children) found.push(...findAllOfType(obj.children, type));
  }
  return found;
}
