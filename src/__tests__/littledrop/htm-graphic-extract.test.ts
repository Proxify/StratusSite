// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { extractFromFiles } from '@/lib/littledrop/htm-graphic-extract/extractor';
import type { UploadedFile } from '@/lib/littledrop/htm-graphic-extract/types';

const fixturesDir = resolve(process.cwd(), 'src/__tests__/fixtures');

function loadFixture(name: string): UploadedFile {
  return { name, content: readFileSync(resolve(fixturesDir, name), 'utf-8') };
}

describe('extractFromFiles', () => {
  describe('basic extraction', () => {
    it('returns empty result for no htm files', () => {
      const r = extractFromFiles([{ name: 'other.xml', content: '<x/>' }]);
      expect(r.graphics).toHaveLength(0);
      expect(r.stats.graphicCount).toBe(0);
    });

    it('strips extension for graphic name', () => {
      const r = extractFromFiles([{ name: 'MY_GFX.htm', content: '<HTML><BODY></BODY></HTML>' }]);
      expect(r.graphics[0].graphicName).toBe('MY_GFX');
    });

    it('returns stats object with correct shape', () => {
      const r = extractFromFiles([]);
      expect(r.stats).toMatchObject({
        graphicCount: 0,
        tagCount: 0,
        shapeCount: 0,
        scriptCount: 0,
        customScriptCount: 0,
      });
    });
  });

  describe('fixture: honeywell-graphic.htm', () => {
    const file = loadFixture('honeywell-graphic.htm');
    const result = extractFromFiles([file]);
    const g = result.graphics[0];

    it('parses one graphic', () => {
      expect(result.graphics).toHaveLength(1);
      expect(g.graphicName).toBe('honeywell-graphic');
    });

    it('extracts title from parameters', () => {
      expect(g.title).toBe('Feed Flow Control');
    });

    it('extracts tags sorted alphabetically', () => {
      // FIC101.OP, FIC101.PV, P201.PV, P201.SP
      expect(g.tags).toContain('FIC101.PV');
      expect(g.tags).toContain('P201.PV');
      expect(g.tags).toContain('P201.SP');
      // tags are sorted
      expect(g.tags).toEqual([...g.tags].sort());
    });

    it('extracts shapes', () => {
      const names = g.shapes.map((s) => s.shapeName);
      expect(names).toContain('ScRect001');
      expect(names).toContain('ScPump01');
      expect(names).toContain('ScPB001');
    });

    it('extracts shape file names', () => {
      const rect = g.shapes.find((s) => s.shapeName === 'ScRect001');
      expect(rect?.shapeFileName).toBe('HscRect001');
    });

    it('extracts all 4 scripts', () => {
      expect(result.stats.scriptCount).toBe(4);
      const scriptNames = result.scripts.map((s) => s.shapeName);
      expect(scriptNames).toContain('ScRect001');
      expect(scriptNames).toContain('ScCustom01');
    });

    it('identifies the custom script (non-exempt)', () => {
      // ScCustom01 event=onclick with custom logic — not in exempt list
      expect(result.stats.customScriptCount).toBe(1);
      expect(result.customScripts[0].shapeName).toBe('ScCustom01');
    });

    it('exempts onshapeload scripts', () => {
      const exempt = result.scripts.filter((s) => s.shapeName === 'ScRect001');
      const inCustom = result.customScripts.some((s) => s.shapeName === 'ScRect001');
      expect(exempt).toHaveLength(1);
      expect(inCustom).toBe(false);
    });
  });

  describe('multi-file extraction', () => {
    it('processes multiple htm files and sorts by name', () => {
      const files: UploadedFile[] = [
        { name: 'ZETA.htm', content: '<HTML><BODY><DIV id=Sh001  src=".\\ZETA_files\\Rect.sha" parameters="Rect?tagname:Z.PV"></DIV></BODY></HTML>' },
        { name: 'ALPHA.htm', content: '<HTML><BODY><DIV id=Sh002  src=".\\ALPHA_files\\Rect.sha" parameters="Rect?tagname:A.PV"></DIV></BODY></HTML>' },
      ];
      const r = extractFromFiles(files);
      expect(r.graphics).toHaveLength(2);
      expect(r.graphics[0].graphicName).toBe('ALPHA');
      expect(r.graphics[1].graphicName).toBe('ZETA');
    });
  });

  describe('parameter parsing', () => {
    it('handles duplicate tag references (de-duplication)', () => {
      const htm = `<HTML><BODY>
<DIV id=Sh001  src=".\\G_files\\R.sha" parameters="R?tagname:TAG.PV">
</DIV>
<DIV id=Sh002  src=".\\G_files\\R.sha" parameters="R?tagname:TAG.PV">
</DIV>
</BODY></HTML>`;
      const r = extractFromFiles([{ name: 'G.htm', content: htm }]);
      expect(r.graphics[0].tags.filter((t) => t === 'TAG.PV')).toHaveLength(1);
    });

    it('ignores dash-only tag values', () => {
      const htm = `<HTML><BODY><DIV id=Sh001  src=".\\G_files\\R.sha" parameters="R?tagname:-"></DIV></BODY></HTML>`;
      const r = extractFromFiles([{ name: 'G.htm', content: htm }]);
      expect(r.graphics[0].tags).toHaveLength(0);
    });
  });

  describe('static text', () => {
    it('ignores textboxes when includeStaticText is false (default)', () => {
      const htm = `<HTML><BODY>
<DIV id=textbox001 class="hvg.textbox" style="">Some text<</DIV>
</BODY></HTML>`;
      const r = extractFromFiles([{ name: 'G.htm', content: htm }]);
      expect(r.graphics[0].textBoxes).toHaveLength(0);
    });
  });

  describe('exempt list', () => {
    it('exempts scripts containing window.external.Parent.RequestTask', () => {
      const htm = `<HTML><BODY>
<script language=vbscript for=Sh001 event=onclick>dim x
window.external.Parent.RequestTask "OVERVIEW"
</script>
</BODY></HTML>`;
      const r = extractFromFiles([{ name: 'G.htm', content: htm }]);
      expect(r.customScripts).toHaveLength(0);
    });
  });
});
