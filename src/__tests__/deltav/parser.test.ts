import { describe, it, expect } from 'vitest';
import { parseDVFile, parseGemChildren } from '@/lib/deltav/parser';
import { ConversionType, LiveTheme, LiveValueSource } from '@/lib/deltav/types';
import type {
  DVRectangle,
  DVEllipse,
  DVText,
  DVDataLink,
  DVGem,
  DVGroup,
  DVLine,
  DVArc,
} from '@/lib/deltav/types';

// ---------------------------------------------------------------------------
// Minimal fixture builders
// ---------------------------------------------------------------------------

function minimalGraphic(objects = '', theme = 'DEFAULT', w = 10000, h = 8000): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<LiveGraphic Name="TestDisplay" Width="${w}" Height="${h}" BackColor="#FFD0D0D0" Theme="${theme}">
  <Objects>${objects}</Objects>
</LiveGraphic>`;
}

function rect(
  name = 'Rect1',
  left = 720,
  top = 360,
  width = 1440,
  height = 720,
  extras = ''
): string {
  return `<LiveRectangle Name="${name}" Left="${left}" Top="${top}" Width="${width}" Height="${height}" ${extras}>
    <FillColor Source="Direct" Value="#FFFF0000" />
    <BorderColor Source="Direct" Value="#FF000000" />
    <BorderWidth Source="Direct" Value="2" />
    <Visible Source="Direct" Value="true" />
    <Opacity Source="Direct" Value="100" />
  </LiveRectangle>`;
}

// ---------------------------------------------------------------------------
// parseDVFile tests
// ---------------------------------------------------------------------------

describe('parseDVFile — basic parsing', () => {
  it('parses graphic name from file name', () => {
    const graphic = parseDVFile(minimalGraphic(), 'MyDisplay.di.ahc');
    expect(graphic.name).toBe('MyDisplay');
  });

  it('strips .di.ahc extension from name', () => {
    const graphic = parseDVFile(minimalGraphic(), 'FIC101.di.ahc');
    expect(graphic.name).toBe('FIC101');
  });

  it('strips .ahc extension from name', () => {
    const graphic = parseDVFile(minimalGraphic(), 'Test.ahc');
    expect(graphic.name).toBe('Test');
  });

  it('converts EMU width to pixels using RENDER divisor (7200)', () => {
    const graphic = parseDVFile(minimalGraphic('', 'DEFAULT', 72000, 57600), 'test.di.ahc', ConversionType.RENDER);
    expect(graphic.width).toBe(10);  // 72000 / 7200 = 10
    expect(graphic.height).toBe(8);  // 57600 / 7200 = 8
  });

  it('converts EMU using RADDICAL divisor (10800)', () => {
    const graphic = parseDVFile(minimalGraphic('', 'DEFAULT', 108000, 54000), 'test.di.ahc', ConversionType.RADDICAL);
    expect(graphic.width).toBe(10);  // 108000 / 10800 = 10
    expect(graphic.height).toBe(5);
  });

  it('converts EMU using PROCESS_BOOK divisor (5700)', () => {
    const graphic = parseDVFile(minimalGraphic('', 'DEFAULT', 57000, 28500), 'test.di.ahc', ConversionType.PROCESS_BOOK);
    expect(graphic.width).toBe(10);
    expect(graphic.height).toBe(5);
  });

  it('parses theme attribute', () => {
    const graphic = parseDVFile(minimalGraphic('', 'DG'), 'test.di.ahc');
    expect(graphic.theme).toBe(LiveTheme.DG);
  });

  it('defaults theme to DEFAULT when attribute missing', () => {
    const xml = `<LiveGraphic Width="7200" Height="7200"><Objects></Objects></LiveGraphic>`;
    const graphic = parseDVFile(xml, 'test.di.ahc');
    expect(graphic.theme).toBe(LiveTheme.DEFAULT);
  });

  it('parses background color from BackColor attribute', () => {
    const graphic = parseDVFile(minimalGraphic(), 'test.di.ahc');
    expect(graphic.backgroundColor).toBeTruthy();
  });

  it('throws on invalid XML', () => {
    expect(() => parseDVFile('<not>valid<xml>', 'bad.di.ahc')).toThrow();
  });
});

describe('parseDVFile — LiveRectangle', () => {
  const xml = minimalGraphic(rect('MyRect', 7200, 3600, 14400, 7200));

  it('parses a Rectangle object', () => {
    const graphic = parseDVFile(xml, 'test.di.ahc');
    const rects = graphic.objects.filter((o) => o.objectType === 'Rectangle');
    expect(rects.length).toBe(1);
  });

  it('converts EMU coordinates to pixels', () => {
    const graphic = parseDVFile(xml, 'test.di.ahc', ConversionType.RENDER);
    const r = graphic.objects.find((o) => o.objectType === 'Rectangle') as DVRectangle;
    expect(r.left).toBe(1);   // 7200 / 7200 = 1
    expect(r.top).toBe(1);    // 3600 / 7200 = 0.5 → Math.round(0.5) = 1
    expect(r.width).toBe(2);  // 14400 / 7200 = 2
    expect(r.height).toBe(1); // 7200 / 7200 = 1
  });

  it('parses name attribute', () => {
    const graphic = parseDVFile(xml, 'test.di.ahc');
    const r = graphic.objects.find((o) => o.objectType === 'Rectangle') as DVRectangle;
    expect(r.name).toBe('MyRect');
  });

  it('parses FillColor as Direct LiveValue', () => {
    const graphic = parseDVFile(xml, 'test.di.ahc');
    const r = graphic.objects.find((o) => o.objectType === 'Rectangle') as DVRectangle;
    expect(r.fillColor.source).toBe(LiveValueSource.Direct);
    expect(r.fillColor.value).toBe('#FFFF0000');
  });

  it('parses BorderWidth as Direct LiveValue', () => {
    const graphic = parseDVFile(xml, 'test.di.ahc');
    const r = graphic.objects.find((o) => o.objectType === 'Rectangle') as DVRectangle;
    expect(r.borderWidth.source).toBe(LiveValueSource.Direct);
    expect(r.borderWidth.value).toBe('2');
  });
});

describe('parseDVFile — ThemeRef LiveValues', () => {
  it('parses ThemeRef FillColor', () => {
    const xml = minimalGraphic(`
      <LiveRectangle Name="R" Left="0" Top="0" Width="7200" Height="7200">
        <FillColor Source="ThemeRef" ThemeVariable="GL.Library.S_FillColor" DefaultValue="#FFC0C0C0" />
        <BorderColor Source="Direct" Value="#FF000000" />
        <Visible Source="Direct" Value="true" />
        <Opacity Source="Direct" Value="100" />
      </LiveRectangle>`);

    const graphic = parseDVFile(xml, 'test.di.ahc');
    const r = graphic.objects.find((o) => o.objectType === 'Rectangle') as DVRectangle;
    expect(r.fillColor.source).toBe(LiveValueSource.ThemeRef);
    expect(r.fillColor.themeVariable).toBe('GL.Library.S_FillColor');
    expect(r.fillColor.defaultValue).toBe('#FFC0C0C0');
  });
});

describe('parseDVFile — LiveEllipse', () => {
  it('parses an Ellipse object', () => {
    const xml = minimalGraphic(`
      <LiveEllipse Name="E1" Left="0" Top="0" Width="7200" Height="7200">
        <FillColor Source="Direct" Value="#FF0000FF" />
        <BorderColor Source="Direct" Value="#FF000000" />
        <Visible Source="Direct" Value="true" />
        <Opacity Source="Direct" Value="100" />
      </LiveEllipse>`);

    const graphic = parseDVFile(xml, 'test.di.ahc');
    const ellipses = graphic.objects.filter((o) => o.objectType === 'Ellipse') as DVEllipse[];
    expect(ellipses.length).toBe(1);
    expect(ellipses[0].name).toBe('E1');
  });
});

describe('parseDVFile — LiveText', () => {
  it('parses a Text object', () => {
    const xml = minimalGraphic(`
      <LiveText Name="Txt1" Left="0" Top="0" Width="14400" Height="3600" HorizontalAlignment="Center">
        <Text Source="Direct" Value="Hello DeltaV" />
        <TextColor Source="Direct" Value="#FF404040" />
        <FontFamily Source="Direct" Value="Arial" />
        <FontSize Source="Direct" Value="14" />
        <FillColor Source="Direct" Value="transparent" />
        <BorderColor Source="Direct" Value="transparent" />
        <Visible Source="Direct" Value="true" />
        <Opacity Source="Direct" Value="100" />
      </LiveText>`);

    const graphic = parseDVFile(xml, 'test.di.ahc');
    const texts = graphic.objects.filter((o) => o.objectType === 'Text') as DVText[];
    expect(texts.length).toBe(1);
    expect(texts[0].text.value).toBe('Hello DeltaV');
    expect(texts[0].horizontalAlignment).toBe('Center');
    expect(texts[0].fontFamily.value).toBe('Arial');
  });
});

describe('parseDVFile — LiveDataLink', () => {
  it('parses a DataLink with GemRef tag', () => {
    const xml = minimalGraphic(`
      <LiveDataLink Name="DL1" Left="0" Top="0" Width="14400" Height="3600">
        <Tag Source="GemRef" GemVariable="Tag" DefaultValue="" />
        <Text Source="Direct" Value="" />
        <TextColor Source="Direct" Value="#FF404040" />
        <FontFamily Source="Direct" Value="Arial" />
        <FontSize Source="Direct" Value="12" />
        <FillColor Source="Direct" Value="transparent" />
        <BorderColor Source="Direct" Value="transparent" />
        <Visible Source="Direct" Value="true" />
        <Opacity Source="Direct" Value="100" />
      </LiveDataLink>`);

    const graphic = parseDVFile(xml, 'test.di.ahc');
    const dl = graphic.objects.find((o) => o.objectType === 'DataLink') as DVDataLink;
    expect(dl).toBeDefined();
    expect(dl.tag.source).toBe(LiveValueSource.GemRef);
    expect(dl.tag.gemVariable).toBe('Tag');
  });

  it('parses a DataLink with Formula tag (DLSYS)', () => {
    const xml = minimalGraphic(`
      <LiveDataLink Name="DL2" Left="0" Top="0" Width="7200" Height="3600">
        <Tag Source="Formula" Formula="DLSYS[&quot;UNIT1/FIC101/PV.CV&quot;]" DefaultValue="0" />
        <Text Source="Direct" Value="" />
        <TextColor Source="Direct" Value="#FF404040" />
        <FontFamily Source="Direct" Value="Arial" />
        <FontSize Source="Direct" Value="12" />
        <FillColor Source="Direct" Value="transparent" />
        <BorderColor Source="Direct" Value="transparent" />
        <Visible Source="Direct" Value="true" />
        <Opacity Source="Direct" Value="100" />
      </LiveDataLink>`);

    const graphic = parseDVFile(xml, 'test.di.ahc');
    const dl = graphic.objects.find((o) => o.objectType === 'DataLink') as DVDataLink;
    expect(dl).toBeDefined();
    expect(dl.tag.source).toBe(LiveValueSource.Formula);
    expect(dl.tag.formula).toContain('DLSYS');
  });
});

describe('parseDVFile — LiveArc', () => {
  it('parses an Arc with start/sweep angles', () => {
    const xml = minimalGraphic(`
      <LiveArc Name="Arc1" Left="0" Top="0" Width="7200" Height="7200" StartAngle="0" SweepAngle="270">
        <FillColor Source="Direct" Value="transparent" />
        <BorderColor Source="Direct" Value="#FF000000" />
        <BorderWidth Source="Direct" Value="2" />
        <Visible Source="Direct" Value="true" />
        <Opacity Source="Direct" Value="100" />
      </LiveArc>`);

    const graphic = parseDVFile(xml, 'test.di.ahc');
    const arc = graphic.objects.find((o) => o.objectType === 'Arc') as DVArc;
    expect(arc).toBeDefined();
    expect(arc.startAngle).toBe(0);
    expect(arc.sweepAngle).toBe(270);
  });
});

describe('parseDVFile — LiveGem', () => {
  it('parses a Gem instance with variables', () => {
    const xml = minimalGraphic(`
      <LiveGem Name="PID1" GemName="PIDFaceplate" Left="7200" Top="3600" Width="14400" Height="21600">
        <FillColor Source="Direct" Value="transparent" />
        <BorderColor Source="Direct" Value="transparent" />
        <Visible Source="Direct" Value="true" />
        <Opacity Source="Direct" Value="100" />
        <Variables>
          <Variable Name="Tag" Value="FIC101" />
          <Variable Name="FriendlyName" Value="Flow Controller" />
        </Variables>
        <OverrideInfos>
          <OverrideInfo ChildPath="Label" PropertyName="Text" Value="FIC-101" />
        </OverrideInfos>
      </LiveGem>`);

    const graphic = parseDVFile(xml, 'test.di.ahc');
    const gem = graphic.objects.find((o) => o.objectType === 'Gem') as DVGem;
    expect(gem).toBeDefined();
    expect(gem.gemName).toBe('PIDFaceplate');
    expect(gem.variables['Tag']).toBe('FIC101');
    expect(gem.variables['FriendlyName']).toBe('Flow Controller');
    expect(gem.overrides).toHaveLength(1);
    expect(gem.overrides[0].childPath).toBe('Label');
    expect(gem.overrides[0].propertyName).toBe('Text');
    expect(gem.overrides[0].value).toBe('FIC-101');
  });
});

describe('parseDVFile — LiveGroup', () => {
  it('parses a Group with children', () => {
    const xml = minimalGraphic(`
      <LiveGroup Name="G1" Left="0" Top="0" Width="28800" Height="14400">
        <FillColor Source="Direct" Value="transparent" />
        <BorderColor Source="Direct" Value="transparent" />
        <Visible Source="Direct" Value="true" />
        <Opacity Source="Direct" Value="100" />
        <Objects>
          ${rect('ChildRect1')}
          ${rect('ChildRect2')}
        </Objects>
      </LiveGroup>`);

    const graphic = parseDVFile(xml, 'test.di.ahc');
    const group = graphic.objects.find((o) => o.objectType === 'Group') as DVGroup;
    expect(group).toBeDefined();
    expect(group.children).toHaveLength(2);
    expect(group.children[0].objectType).toBe('Rectangle');
    expect(group.children[1].objectType).toBe('Rectangle');
  });
});

describe('parseDVFile — multiple objects', () => {
  it('parses multiple top-level objects', () => {
    const xml = minimalGraphic(`
      ${rect('R1')}
      ${rect('R2')}
      ${rect('R3')}`);

    const graphic = parseDVFile(xml, 'test.di.ahc');
    expect(graphic.objects).toHaveLength(3);
  });

  it('handles empty Objects list', () => {
    const graphic = parseDVFile(minimalGraphic(), 'test.di.ahc');
    expect(graphic.objects).toHaveLength(0);
  });
});
