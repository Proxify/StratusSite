import { describe, it, expect } from 'vitest';
import {
  exportTagsCsv,
  exportNavLinksCsv,
  exportCombinedCsv,
} from '@/lib/hmi/exporters/csv-exporter';
import { HorizontalAlignment } from '@/lib/hmi/types';
import type { PointTag, NavigationLink } from '@/lib/hmi/types';

describe('CSV Exporter', () => {
  const sampleTags: PointTag[] = [
    {
      tagname: 'F101.PV',
      fontHexColor: '#00FF00',
      x: 50,
      y: 100,
      width: 120,
      height: 30,
      horizontalAlignment: HorizontalAlignment.Center,
    },
    {
      tagname: 'T200.CV',
      fontHexColor: '#FFFF00',
      x: 200,
      y: 100,
      width: 100,
      height: 25,
      horizontalAlignment: HorizontalAlignment.Near,
    },
  ];

  const sampleLinks: NavigationLink[] = [
    { destination: 'Display_002', x: 400, y: 300, width: 150, height: 40 },
    { destination: 'Display_003', x: 400, y: 360, width: 150, height: 40 },
  ];

  describe('exportTagsCsv', () => {
    it('generates CSV with header row and data rows', () => {
      const csv = exportTagsCsv(sampleTags);
      const lines = csv.split('\n');

      expect(lines[0]).toBe('Tagname,FontColor,X,Y,Width,Height,Alignment');
      expect(lines[1]).toBe('F101.PV,#00FF00,50,100,120,30,Center');
      expect(lines[2]).toBe('T200.CV,#FFFF00,200,100,100,25,Near');
      expect(lines).toHaveLength(3);
    });

    it('handles empty tag list', () => {
      const csv = exportTagsCsv([]);
      const lines = csv.split('\n');
      expect(lines).toHaveLength(1);
      expect(lines[0]).toContain('Tagname');
    });

    it('escapes commas in tag names', () => {
      const tags: PointTag[] = [
        {
          tagname: 'Tag,With,Commas',
          fontHexColor: '#000',
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          horizontalAlignment: HorizontalAlignment.Center,
        },
      ];
      const csv = exportTagsCsv(tags);
      expect(csv).toContain('"Tag,With,Commas"');
    });
  });

  describe('exportNavLinksCsv', () => {
    it('generates CSV with header and data rows', () => {
      const csv = exportNavLinksCsv(sampleLinks);
      const lines = csv.split('\n');

      expect(lines[0]).toBe('Destination,X,Y,Width,Height');
      expect(lines[1]).toBe('Display_002,400,300,150,40');
      expect(lines[2]).toBe('Display_003,400,360,150,40');
    });
  });

  describe('exportCombinedCsv', () => {
    it('combines tag and nav link sections', () => {
      const csv = exportCombinedCsv(sampleTags, sampleLinks);
      expect(csv).toContain('Point Tags');
      expect(csv).toContain('Navigation Links');
      expect(csv).toContain('F101.PV');
      expect(csv).toContain('Display_002');
    });
  });
});
