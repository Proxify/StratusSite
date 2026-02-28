import { describe, it, expect } from 'vitest';
import { extractDataAndLinks } from '@/lib/hmi/extractor';
import type {
  HMIGraphic,
  HMIWebDataValue,
  HMIWebButton,
  HMIWebGroup,
  HMIWebShape,
  HMIWebRectangle,
} from '@/lib/hmi/types';

function makeGraphic(objects: any[]): HMIGraphic {
  return {
    name: 'test',
    width: 800,
    height: 600,
    objects,
  };
}

function makeDataValue(tag: string, x = 10, y = 10, w = 100, h = 25): HMIWebDataValue {
  return {
    objectType: 'DataValue',
    objectId: `dv_${tag}`,
    styleClass: '',
    style: {},
    visible: true,
    x, y, width: w, height: h,
    fullTag: tag,
    textColor: '#00FF00',
  };
}

function makeButton(dest: string, x = 10, y = 10, w = 100, h = 30): HMIWebButton {
  return {
    objectType: 'Button',
    objectId: `btn_${dest}`,
    styleClass: '',
    style: {},
    visible: true,
    x, y, width: w, height: h,
    navigateTo: dest,
  };
}

function makeGroup(children: any[]): HMIWebGroup {
  return {
    objectType: 'Group',
    objectId: 'grp_1',
    styleClass: '',
    style: {},
    visible: true,
    x: 0, y: 0, width: 100, height: 100,
    children,
  };
}

function makeShape(name: string, children: any[]): HMIWebShape {
  return {
    objectType: 'Shape',
    objectId: `shp_${name}`,
    styleClass: '',
    style: {},
    visible: true,
    x: 0, y: 0, width: 100, height: 100,
    children,
    shapeName: name,
  };
}

describe('extractDataAndLinks', () => {
  describe('PointTag extraction', () => {
    it('extracts tags from top-level data values', () => {
      const graphic = makeGraphic([
        makeDataValue('F101.PV', 50, 100, 120, 30),
        makeDataValue('T200.CV', 200, 100, 100, 25),
      ]);
      const { pointTags } = extractDataAndLinks(graphic);
      expect(pointTags).toHaveLength(2);
      expect(pointTags[0].tagname).toBe('F101.PV');
      expect(pointTags[0].x).toBe(50);
      expect(pointTags[0].y).toBe(100);
      expect(pointTags[1].tagname).toBe('T200.CV');
    });

    it('skips data values with width or height <= 1', () => {
      const graphic = makeGraphic([
        makeDataValue('VISIBLE.PV', 10, 10, 100, 25),
        makeDataValue('HIDDEN1.PV', 10, 10, 1, 25),
        makeDataValue('HIDDEN2.PV', 10, 10, 100, 1),
        makeDataValue('HIDDEN3.PV', 10, 10, 0, 0),
      ]);
      const { pointTags } = extractDataAndLinks(graphic);
      expect(pointTags).toHaveLength(1);
      expect(pointTags[0].tagname).toBe('VISIBLE.PV');
    });

    it('skips data values with empty or null tags', () => {
      const dv: HMIWebDataValue = {
        objectType: 'DataValue',
        objectId: 'dv_empty',
        styleClass: '',
        style: {},
        visible: true,
        x: 10, y: 10, width: 100, height: 25,
        fullTag: '',
        textColor: '#000',
      };
      const graphic = makeGraphic([dv]);
      const { pointTags } = extractDataAndLinks(graphic);
      expect(pointTags).toHaveLength(0);
    });

    it('removes whitespace from tag names', () => {
      const graphic = makeGraphic([makeDataValue('F 101 . PV', 10, 10, 100, 25)]);
      const { pointTags } = extractDataAndLinks(graphic);
      expect(pointTags[0].tagname).toBe('F101.PV');
    });

    it('applies tag conversion map', () => {
      const graphic = makeGraphic([makeDataValue('F101.PV', 10, 10, 100, 25)]);
      const map = new Map([['F101.PV', 'F101_NEW.PV']]);
      const { pointTags } = extractDataAndLinks(graphic, { tagConversionMap: map });
      expect(pointTags[0].tagname).toBe('F101_NEW.PV');
    });

    it('appends historian server name in RADDICAL mode', () => {
      const graphic = makeGraphic([makeDataValue('F101.PV', 10, 10, 100, 25)]);
      const { pointTags } = extractDataAndLinks(graphic, {
        conversionType: 'RADDICAL',
        historianServerName: '\\\\PISERVER',
      });
      expect(pointTags[0].tagname).toBe('F101.PV\\\\PISERVER');
    });
  });

  describe('NavigationLink extraction', () => {
    it('extracts navigation links from buttons', () => {
      const graphic = makeGraphic([makeButton('Display_002', 400, 300, 150, 40)]);
      const { navigationLinks } = extractDataAndLinks(graphic);
      expect(navigationLinks).toHaveLength(1);
      expect(navigationLinks[0].destination).toBe('Display_002');
      expect(navigationLinks[0].x).toBe(400);
    });

    it('removes quotes from destination', () => {
      const graphic = makeGraphic([makeButton('"Display_003"', 10, 10, 100, 30)]);
      const { navigationLinks } = extractDataAndLinks(graphic);
      expect(navigationLinks[0].destination).toBe('Display_003');
    });
  });

  describe('recursive extraction', () => {
    it('extracts from Group children', () => {
      const graphic = makeGraphic([
        makeGroup([
          makeDataValue('G.TAG1', 20, 20, 80, 20),
          makeButton('SubDisplay', 20, 50, 80, 25),
        ]),
      ]);
      const { pointTags, navigationLinks } = extractDataAndLinks(graphic);
      expect(pointTags).toHaveLength(1);
      expect(pointTags[0].tagname).toBe('G.TAG1');
      expect(navigationLinks).toHaveLength(1);
      expect(navigationLinks[0].destination).toBe('SubDisplay');
    });

    it('extracts from Shape children', () => {
      const graphic = makeGraphic([
        makeShape('Pipe', [
          makeDataValue('S.TAG1', 10, 10, 80, 20),
          makeDataValue('S.TAG2', 10, 40, 80, 20),
        ]),
      ]);
      const { pointTags } = extractDataAndLinks(graphic);
      expect(pointTags).toHaveLength(2);
    });

    it('extracts from deeply nested structures', () => {
      const graphic = makeGraphic([
        makeGroup([
          makeShape('Inner', [
            makeGroup([
              makeDataValue('DEEP.TAG', 10, 10, 80, 20),
            ]),
          ]),
        ]),
      ]);
      const { pointTags } = extractDataAndLinks(graphic);
      expect(pointTags).toHaveLength(1);
      expect(pointTags[0].tagname).toBe('DEEP.TAG');
    });
  });

  describe('non-extractable objects', () => {
    it('ignores Rectangle objects', () => {
      const rect: HMIWebRectangle = {
        objectType: 'Rectangle',
        objectId: 'rect_1',
        styleClass: '',
        style: {},
        visible: true,
        x: 0, y: 0, width: 100, height: 100,
      };
      const graphic = makeGraphic([rect]);
      const { pointTags, navigationLinks } = extractDataAndLinks(graphic);
      expect(pointTags).toHaveLength(0);
      expect(navigationLinks).toHaveLength(0);
    });
  });
});
