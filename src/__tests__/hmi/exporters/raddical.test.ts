import { describe, it, expect } from 'vitest';
import {
  createRaddicalConvert,
  createRaddicalDisplay,
  serializeRaddicalInfo,
  serializeRaddicalJson,
} from '@/lib/hmi/exporters/raddical-exporter';
import type { PointTag, NavigationLink } from '@/lib/hmi/types';
import { HorizontalAlignment } from '@/lib/hmi/types';

describe('Raddical Exporter', () => {
  function makeTags(): PointTag[] {
    return [
      {
        tagname: 'F101.PV',
        fontHexColor: '#00FF00',
        x: 115,
        y: 233,
        width: 80,
        height: 20,
        horizontalAlignment: HorizontalAlignment.Center,
      },
      {
        tagname: 'F102.PV',
        fontHexColor: '#FFFF00',
        x: 135,
        y: 253,
        width: 80,
        height: 20,
        horizontalAlignment: HorizontalAlignment.Center,
      },
    ];
  }

  function makeNavLinks(): NavigationLink[] {
    return [
      { destination: '00138', x: 100, y: 120, width: 100, height: 105 },
      { destination: '00140', x: 300, y: 200, width: 80, height: 60 },
    ];
  }

  describe('createRaddicalDisplay', () => {
    it('doubles width and height per C# convention', () => {
      const display = createRaddicalDisplay('test', 'test.jpg', 400, 300, [], []);
      expect(display.width).toBe(800);
      expect(display.height).toBe(600);
    });
  });

  describe('serializeRaddicalInfo', () => {
    it('generates correct .info format with tags and nav links', () => {
      const convert = createRaddicalConvert('\\\\PISERVER', '\\\\server\\share\\CCU');
      convert.displays.push(
        createRaddicalDisplay('00135', '00135.jpg', 500, 400, makeTags(), makeNavLinks())
      );

      const info = serializeRaddicalInfo(convert, 'c:\\output\\');
      const lines = info.split('\n');

      expect(lines[0]).toBe('[OUTPUT_FOLDER]c:\\output\\');
      expect(lines[1]).toBe('[DISP_NAME]00135');
      expect(lines[2]).toBe('[DEST_FOLDER]\\\\server\\share\\CCU');
      expect(lines[3]).toBe('[JPEG]00135.jpg');

      // TAG_VALUE lines: tagname\tx\ty\tx+w\ty+h
      expect(lines[4]).toBe('[TAG_VALUE]F101.PV\t115\t233\t195\t253');
      expect(lines[5]).toBe('[TAG_VALUE]F102.PV\t135\t253\t215\t273');

      // AREA_LINK lines: dest\tx\ty\tx+w\ty+h
      expect(lines[6]).toBe(
        '[AREA_LINK]\\\\server\\share\\CCU\\00138.rvw\t100\t120\t200\t225'
      );
      expect(lines[7]).toBe(
        '[AREA_LINK]\\\\server\\share\\CCU\\00140.rvw\t300\t200\t380\t260'
      );
    });

    it('handles multiple displays', () => {
      const convert = createRaddicalConvert('', '\\\\server\\share');
      convert.displays.push(
        createRaddicalDisplay('D001', 'D001.jpg', 100, 100, [], [])
      );
      convert.displays.push(
        createRaddicalDisplay('D002', 'D002.jpg', 100, 100, [], [])
      );

      const info = serializeRaddicalInfo(convert, '/out/');
      expect(info).toContain('[DISP_NAME]D001');
      expect(info).toContain('[DISP_NAME]D002');
      expect(info).toContain('[JPEG]D001.jpg');
      expect(info).toContain('[JPEG]D002.jpg');
    });

    it('skips empty navigation destinations', () => {
      const convert = createRaddicalConvert('', '\\\\server');
      const navLinks: NavigationLink[] = [
        { destination: '', x: 0, y: 0, width: 10, height: 10 },
        { destination: 'Valid', x: 10, y: 10, width: 10, height: 10 },
      ];
      convert.displays.push(createRaddicalDisplay('D', 'D.jpg', 100, 100, [], navLinks));

      const info = serializeRaddicalInfo(convert, '/');
      const areaLinkLines = info.split('\n').filter((l) => l.startsWith('[AREA_LINK]'));
      expect(areaLinkLines).toHaveLength(1);
      expect(areaLinkLines[0]).toContain('Valid.rvw');
    });
  });

  describe('serializeRaddicalJson', () => {
    it('produces valid JSON', () => {
      const convert = createRaddicalConvert('\\\\PI', '\\\\net');
      convert.displays.push(
        createRaddicalDisplay('test', 'test.jpg', 100, 100, makeTags(), [])
      );

      const json = serializeRaddicalJson(convert);
      const parsed = JSON.parse(json);
      expect(parsed.historianServerName).toBe('\\\\PI');
      expect(parsed.displays).toHaveLength(1);
      expect(parsed.displays[0].pointTagList).toHaveLength(2);
    });
  });
});
