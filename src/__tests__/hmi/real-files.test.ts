/**
 * Symmetrical tests against real Motiva CAS HMI source files.
 *
 * Source: /Volumes/Public/Motiva/CAS/source/ (35 .htm graphics)
 * Reference: /Volumes/Public/Motiva/CAS/P2K5.xlsx (HMI Insight extract)
 *
 * These tests establish a parse baseline: every file must parse without error
 * and produce object counts that match the snapshotted values. This ensures
 * parser regressions are caught against real-world data.
 */

import { describe, it, expect, vi } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parseHMIFile } from '@/lib/hmi/parser';
import { extractDataAndLinks } from '@/lib/hmi/extractor';

const SOURCE_DIR = '/Volumes/Public/Motiva/CAS/source';
const XLSX_PATH = '/Volumes/Public/Motiva/CAS/P2K5.xlsx';

// ---------------------------------------------------------------------------
// Snapshot of object-type counts produced by the current parser.
// Captured 2026-03-15 from 35 real Motiva CAS .htm files.
// The native Honeywell HMIWeb format encodes DCS tags in `Point?Tag:` onclick
// attributes, so the current CSS-class parser finds 0 DataValue objects —
// tags=0 is correct for this baseline and should be updated if/when native
// format parsing is added.
// ---------------------------------------------------------------------------
interface FileSnapshot {
  width: number;
  height: number;
  topLevelObjects: number;
  types: Partial<Record<string, number>>;
  links: number; // navigation link count
}

const SNAPSHOTS: Record<string, FileSnapshot> = {
  E1401:  { width: 800, height: 600, topLevelObjects: 1, types: { Group: 13, TextBox: 51, Shape: 15, Button: 23 }, links: 23 },
  E1402:  { width: 800, height: 600, topLevelObjects: 1, types: { Group: 46, Shape: 51, TextBox: 173, Button: 18, Line: 3 }, links: 18 },
  E1402A: { width: 800, height: 600, topLevelObjects: 1, types: { Group: 67, Shape: 62, TextBox: 248, Button: 9, Line: 3 }, links: 9 },
  E1402AA:{ width: 800, height: 600, topLevelObjects: 1, types: { Group: 40, Shape: 45, TextBox: 146, Button: 6 }, links: 6 },
  E1402B: { width: 800, height: 600, topLevelObjects: 1, types: { Group: 21, Shape: 23, TextBox: 82, Button: 6 }, links: 6 },
  E1402C: { width: 800, height: 600, topLevelObjects: 1, types: { Group: 54, Shape: 55, TextBox: 200, Button: 14, Line: 2 }, links: 14 },
  E1402D: { width: 800, height: 600, topLevelObjects: 1, types: { Group: 3, Shape: 5, TextBox: 55, Button: 4 }, links: 4 },
  E1402E: { width: 800, height: 600, topLevelObjects: 1, types: { Group: 2, Shape: 2, TextBox: 72, Button: 1 }, links: 1 },
  E1402F: { width: 800, height: 600, topLevelObjects: 1, types: { Group: 37, Shape: 37, TextBox: 117, Button: 1 }, links: 1 },
  E1402G: { width: 800, height: 600, topLevelObjects: 1, types: { Group: 17, Shape: 17, TextBox: 97, Button: 1 }, links: 1 },
  E1402H: { width: 800, height: 600, topLevelObjects: 1, types: { Group: 73, Shape: 73, TextBox: 222, Button: 1 }, links: 1 },
  E1403:  { width: 800, height: 600, topLevelObjects: 1, types: { Group: 46, Shape: 51, TextBox: 173, Button: 18, Line: 3 }, links: 18 },
  E1403A: { width: 800, height: 600, topLevelObjects: 1, types: { Group: 67, Shape: 62, TextBox: 248, Button: 9, Line: 3 }, links: 9 },
  E1403AA:{ width: 800, height: 600, topLevelObjects: 1, types: { Group: 40, Shape: 45, TextBox: 146, Button: 6 }, links: 6 },
  E1403B: { width: 800, height: 600, topLevelObjects: 1, types: { Group: 21, Shape: 23, TextBox: 82, Button: 6 }, links: 6 },
  E1403C: { width: 800, height: 600, topLevelObjects: 1, types: { Group: 54, Shape: 55, TextBox: 200, Button: 14, Line: 2 }, links: 14 },
  E1403D: { width: 800, height: 600, topLevelObjects: 1, types: { Group: 3, Shape: 5, TextBox: 55, Button: 4 }, links: 4 },
  E1403E: { width: 800, height: 600, topLevelObjects: 1, types: { Group: 2, Shape: 2, TextBox: 72, Button: 1 }, links: 1 },
  E1403F: { width: 800, height: 600, topLevelObjects: 1, types: { Group: 37, Shape: 37, TextBox: 117, Button: 1 }, links: 1 },
  E1403G: { width: 800, height: 600, topLevelObjects: 1, types: { Group: 17, Shape: 17, TextBox: 97, Button: 1 }, links: 1 },
  E1403H: { width: 800, height: 600, topLevelObjects: 1, types: { Group: 73, Shape: 73, TextBox: 222, Button: 1 }, links: 1 },
  E1404:  { width: 800, height: 600, topLevelObjects: 1, types: { Group: 64, Shape: 64, TextBox: 280, Button: 10, Line: 3 }, links: 10 },
  E1404A: { width: 800, height: 600, topLevelObjects: 1, types: { Group: 21, Shape: 19, TextBox: 79, Button: 4, Line: 2 }, links: 4 },
  E1404B: { width: 800, height: 600, topLevelObjects: 1, types: { Group: 42, Shape: 34, TextBox: 175, Button: 6 }, links: 6 },
  E1405:  { width: 800, height: 600, topLevelObjects: 1, types: { Group: 54, Shape: 53, TextBox: 238, Button: 11, Line: 1 }, links: 11 },
  E1405A: { width: 800, height: 600, topLevelObjects: 1, types: { Group: 46, Shape: 46, TextBox: 244, Button: 2 }, links: 2 },
  E1405B: { width: 800, height: 600, topLevelObjects: 1, types: { Group: 15, Shape: 11, TextBox: 51, Button: 1, Line: 2 }, links: 1 },
  E1406:  { width: 800, height: 600, topLevelObjects: 1, types: { Group: 53, Shape: 55, TextBox: 226, Button: 15, Line: 1 }, links: 15 },
  E1406A: { width: 800, height: 600, topLevelObjects: 1, types: { Group: 5, Shape: 13, TextBox: 60, Button: 12 }, links: 12 },
  E1406B: { width: 800, height: 600, topLevelObjects: 1, types: { Group: 3, Shape: 4, TextBox: 36, Button: 2 }, links: 2 },
  E1406C: { width: 800, height: 600, topLevelObjects: 1, types: { Group: 32, Shape: 26, TextBox: 164, Button: 1, Line: 1 }, links: 1 },
  E1407:  { width: 800, height: 600, topLevelObjects: 1, types: { Group: 15, Shape: 15, TextBox: 86, Button: 1 }, links: 1 },
  E1408:  { width: 800, height: 600, topLevelObjects: 1, types: { Group: 56, Shape: 57, TextBox: 376, Button: 2 }, links: 2 },
  E1409:  { width: 800, height: 600, topLevelObjects: 1, types: { Group: 40, Shape: 40, TextBox: 193, Button: 1 }, links: 1 },
  E1410:  { width: 800, height: 600, topLevelObjects: 1, types: { Group: 17, Shape: 16, TextBox: 96, Button: 1 }, links: 1 },
};

// ---------------------------------------------------------------------------
// Mock OffscreenCanvas (same pattern as renderer.test.ts) so renderGraphic
// can be exercised in jsdom without crashing.
// ---------------------------------------------------------------------------
const mockCtx = {
  fillStyle: '', strokeStyle: '', lineWidth: 1, font: '',
  textAlign: '', textBaseline: '', globalAlpha: 1,
  fillRect: vi.fn(), strokeRect: vi.fn(), fillText: vi.fn(),
  beginPath: vi.fn(), closePath: vi.fn(), moveTo: vi.fn(),
  lineTo: vi.fn(), arcTo: vi.fn(), ellipse: vi.fn(),
  fill: vi.fn(), stroke: vi.fn(), save: vi.fn(), restore: vi.fn(),
  scale: vi.fn(), drawImage: vi.fn(),
};
class MockOffscreenCanvas {
  width: number; height: number;
  constructor(w: number, h: number) { this.width = w; this.height = h; }
  getContext() { return mockCtx; }
  convertToBlob() { return Promise.resolve(new Blob(['fake'], { type: 'image/jpeg' })); }
}
vi.stubGlobal('OffscreenCanvas', MockOffscreenCanvas);

const { renderGraphic } = await import('@/lib/hmi/renderer');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SOURCE_FILES_AVAILABLE = existsSync(SOURCE_DIR);
const XLSX_AVAILABLE = existsSync(XLSX_PATH);

function countTypes(objs: any[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const o of objs) {
    counts[o.objectType] = (counts[o.objectType] || 0) + 1;
    if (o.children) {
      for (const [k, v] of Object.entries(countTypes(o.children))) {
        counts[k] = (counts[k] || 0) + (v as number);
      }
    }
  }
  return counts;
}

function loadHtm(name: string): string {
  return readFileSync(join(SOURCE_DIR, `${name}.htm`), 'utf-8');
}

// ---------------------------------------------------------------------------
// Per-file parse + extract + render tests
// ---------------------------------------------------------------------------

describe.skipIf(!SOURCE_FILES_AVAILABLE)('Real HMI source files — parse symmetry', () => {
  for (const [name, snap] of Object.entries(SNAPSHOTS)) {
    describe(`${name}.htm`, () => {
      let graphic: ReturnType<typeof parseHMIFile>;

      it('parses without error', () => {
        const htm = loadHtm(name);
        expect(() => {
          graphic = parseHMIFile(htm, `${name}.htm`);
        }).not.toThrow();
        expect(graphic).toBeDefined();
      });

      it('returns correct graphic name', () => {
        const htm = loadHtm(name);
        graphic = parseHMIFile(htm, `${name}.htm`);
        expect(graphic.name).toBe(name);
      });

      it(`has dimensions ${snap.width}×${snap.height}`, () => {
        const htm = loadHtm(name);
        graphic = parseHMIFile(htm, `${name}.htm`);
        expect(graphic.width).toBe(snap.width);
        expect(graphic.height).toBe(snap.height);
      });

      it(`has ${snap.topLevelObjects} top-level object(s)`, () => {
        const htm = loadHtm(name);
        graphic = parseHMIFile(htm, `${name}.htm`);
        expect(graphic.objects).toHaveLength(snap.topLevelObjects);
      });

      it('matches snapshotted object-type counts', () => {
        const htm = loadHtm(name);
        graphic = parseHMIFile(htm, `${name}.htm`);
        const actual = countTypes(graphic.objects);
        for (const [type, expected] of Object.entries(snap.types)) {
          expect(actual[type], `count of ${type}`).toBe(expected);
        }
      });

      it('extracts navigation links without error', () => {
        const htm = loadHtm(name);
        graphic = parseHMIFile(htm, `${name}.htm`);
        let result: ReturnType<typeof extractDataAndLinks>;
        expect(() => {
          result = extractDataAndLinks(graphic);
        }).not.toThrow();
        expect(result!.navigationLinks).toHaveLength(snap.links);
        expect(result!.pointTags).toHaveLength(0); // native format, no CSS DataValues
      });

      it('renders without error (structural smoke test)', () => {
        const htm = loadHtm(name);
        graphic = parseHMIFile(htm, `${name}.htm`);
        expect(() => renderGraphic(graphic, { scale: 1.0 })).not.toThrow();
      });
    });
  }
});

// ---------------------------------------------------------------------------
// HMI Insight reference: P2K5.xlsx symmetry
// ---------------------------------------------------------------------------

describe.skipIf(!SOURCE_FILES_AVAILABLE || !XLSX_AVAILABLE)('P2K5.xlsx — HMI Insight symmetry', () => {
  it('xlsx file is readable and has expected sheets', async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.readFile(XLSX_PATH);
    expect(wb.SheetNames).toContain('Tags By Graphic');
    expect(wb.SheetNames).toContain('Graphics By Tag');
  });

  it('all graphics in xlsx correspond to parseable .htm source files', async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.readFile(XLSX_PATH);
    const ws = wb.Sheets['Tags By Graphic'];
    const rows = XLSX.utils.sheet_to_json<{ Graphic: string; Tag: string }>(ws);

    const graphicNames = [...new Set(rows.map((r) => r.Graphic))].sort();
    expect(graphicNames.length).toBeGreaterThan(0);

    for (const graphicName of graphicNames) {
      const htmPath = join(SOURCE_DIR, `${graphicName}.htm`);
      expect(existsSync(htmPath), `${graphicName}.htm should exist in source dir`).toBe(true);
    }
  });

  it('each graphic in xlsx parses successfully', async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.readFile(XLSX_PATH);
    const ws = wb.Sheets['Tags By Graphic'];
    const rows = XLSX.utils.sheet_to_json<{ Graphic: string; Tag: string }>(ws);

    const graphicNames = [...new Set(rows.map((r) => r.Graphic))].sort();
    for (const graphicName of graphicNames) {
      const htm = readFileSync(join(SOURCE_DIR, `${graphicName}.htm`), 'utf-8');
      let graphic: ReturnType<typeof parseHMIFile>;
      expect(() => {
        graphic = parseHMIFile(htm, `${graphicName}.htm`);
      }, `${graphicName}.htm should parse without error`).not.toThrow();
      expect(graphic!.name).toBe(graphicName);
      expect(graphic!.width).toBeGreaterThan(0);
      expect(graphic!.height).toBeGreaterThan(0);
    }
  });

  it('tag names in xlsx are present in .htm file raw content', async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.readFile(XLSX_PATH);
    const ws = wb.Sheets['Tags By Graphic'];
    const rows = XLSX.utils.sheet_to_json<{ Graphic: string; Tag: string }>(ws);

    // Group tags by graphic
    const byGraphic = new Map<string, string[]>();
    for (const { Graphic, Tag } of rows) {
      if (!byGraphic.has(Graphic)) byGraphic.set(Graphic, []);
      byGraphic.get(Graphic)!.push(Tag);
    }

    for (const [graphicName, expectedTags] of byGraphic) {
      const htmContent = readFileSync(join(SOURCE_DIR, `${graphicName}.htm`), 'utf-8');
      for (const tag of expectedTags) {
        // Tags appear as `Point?Tag:14FC0100` or in onclick attributes
        expect(htmContent, `${graphicName}.htm should reference tag ${tag}`).toContain(tag);
      }
    }
  });

  it('Tags By Graphic sheet has expected row count (regression guard)', async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.readFile(XLSX_PATH);
    const ws = wb.Sheets['Tags By Graphic'];
    const rows = XLSX.utils.sheet_to_json<{ Graphic: string; Tag: string }>(ws);
    // Baseline: 922 data rows (923 total including header)
    expect(rows.length).toBe(922);
  });
});
