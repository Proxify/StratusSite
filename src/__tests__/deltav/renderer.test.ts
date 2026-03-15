import { describe, it, expect } from 'vitest';
import { renderDVGraphicToSVG } from '@/lib/deltav/renderer';
import { parseDVFile } from '@/lib/deltav/parser';
import { LiveTheme, LiveValueSource, ConversionType } from '@/lib/deltav/types';
import { directValue } from '@/lib/deltav/live-value';
import type { DVGraphic, DVRectangle, DVText, DVDataLink } from '@/lib/deltav/types';

function minimalGraphic(objects = '', theme = 'DEFAULT'): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<LiveGraphic Name="Test" Width="720000" Height="576000" BackColor="#FFD0D0D0" Theme="${theme}">
  <Objects>${objects}</Objects>
</LiveGraphic>`;
}

function makeGraphic(objects = ''): DVGraphic {
  return parseDVFile(minimalGraphic(objects), 'test.di.ahc', ConversionType.RENDER);
}

// ---------------------------------------------------------------------------
// SVG structure
// ---------------------------------------------------------------------------

describe('renderDVGraphicToSVG — SVG structure', () => {
  it('produces a valid SVG string', () => {
    const graphic = makeGraphic();
    const svg = renderDVGraphicToSVG(graphic);
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });

  it('includes xmlns attribute', () => {
    const graphic = makeGraphic();
    const svg = renderDVGraphicToSVG(graphic);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it('uses graphic dimensions as width/height', () => {
    const graphic = makeGraphic();
    const svg = renderDVGraphicToSVG(graphic);
    expect(svg).toContain(`width="${graphic.width}"`);
    expect(svg).toContain(`height="${graphic.height}"`);
  });

  it('respects option width/height overrides', () => {
    const graphic = makeGraphic();
    const svg = renderDVGraphicToSVG(graphic, { width: 1024, height: 768 });
    expect(svg).toContain('width="1024"');
    expect(svg).toContain('height="768"');
  });

  it('includes a background rect', () => {
    const graphic = makeGraphic();
    const svg = renderDVGraphicToSVG(graphic);
    expect(svg).toMatch(/<rect[^>]+fill=/);
  });

  it('generates viewBox attribute', () => {
    const graphic = makeGraphic();
    const svg = renderDVGraphicToSVG(graphic);
    expect(svg).toContain('viewBox');
  });
});

// ---------------------------------------------------------------------------
// Shape rendering
// ---------------------------------------------------------------------------

describe('renderDVGraphicToSVG — Rectangle', () => {
  const xml = minimalGraphic(`
    <LiveRectangle Name="R1" Left="7200" Top="7200" Width="14400" Height="7200">
      <FillColor Source="Direct" Value="#FFFF0000" />
      <BorderColor Source="Direct" Value="#FF000000" />
      <BorderWidth Source="Direct" Value="2" />
      <Visible Source="Direct" Value="true" />
      <Opacity Source="Direct" Value="100" />
    </LiveRectangle>`);

  it('renders a rect element', () => {
    const graphic = parseDVFile(xml, 'test.di.ahc');
    const svg = renderDVGraphicToSVG(graphic);
    expect(svg).toContain('<rect');
  });

  it('includes fill color', () => {
    const graphic = parseDVFile(xml, 'test.di.ahc');
    const svg = renderDVGraphicToSVG(graphic);
    expect(svg).toMatch(/fill="rgb\(255, 0, 0\)"/);
  });
});

describe('renderDVGraphicToSVG — Ellipse', () => {
  const xml = minimalGraphic(`
    <LiveEllipse Name="E1" Left="7200" Top="7200" Width="14400" Height="14400">
      <FillColor Source="Direct" Value="#FF0000FF" />
      <BorderColor Source="Direct" Value="#FF000000" />
      <BorderWidth Source="Direct" Value="1" />
      <Visible Source="Direct" Value="true" />
      <Opacity Source="Direct" Value="100" />
    </LiveEllipse>`);

  it('renders an ellipse element', () => {
    const graphic = parseDVFile(xml, 'test.di.ahc');
    const svg = renderDVGraphicToSVG(graphic);
    expect(svg).toContain('<ellipse');
  });

  it('includes cx/cy attributes', () => {
    const graphic = parseDVFile(xml, 'test.di.ahc');
    const svg = renderDVGraphicToSVG(graphic);
    expect(svg).toContain('cx=');
    expect(svg).toContain('cy=');
  });
});

describe('renderDVGraphicToSVG — Arc', () => {
  const xml = minimalGraphic(`
    <LiveArc Name="A1" Left="0" Top="0" Width="14400" Height="14400" StartAngle="0" SweepAngle="180">
      <FillColor Source="Direct" Value="transparent" />
      <BorderColor Source="Direct" Value="#FF000000" />
      <BorderWidth Source="Direct" Value="2" />
      <Visible Source="Direct" Value="true" />
      <Opacity Source="Direct" Value="100" />
    </LiveArc>`);

  it('renders a path element for Arc', () => {
    const graphic = parseDVFile(xml, 'test.di.ahc');
    const svg = renderDVGraphicToSVG(graphic);
    expect(svg).toContain('<path');
    expect(svg).toContain('A ');  // SVG arc command
  });
});

describe('renderDVGraphicToSVG — Text', () => {
  const xml = minimalGraphic(`
    <LiveText Name="T1" Left="0" Top="0" Width="14400" Height="7200" HorizontalAlignment="Center">
      <Text Source="Direct" Value="Hello &amp; World" />
      <TextColor Source="Direct" Value="#FF404040" />
      <FontFamily Source="Direct" Value="Arial" />
      <FontSize Source="Direct" Value="14" />
      <FillColor Source="Direct" Value="transparent" />
      <BorderColor Source="Direct" Value="transparent" />
      <Visible Source="Direct" Value="true" />
      <Opacity Source="Direct" Value="100" />
    </LiveText>`);

  it('renders a text element', () => {
    const graphic = parseDVFile(xml, 'test.di.ahc');
    const svg = renderDVGraphicToSVG(graphic);
    expect(svg).toContain('<text');
  });

  it('escapes XML entities in text content', () => {
    const graphic = parseDVFile(xml, 'test.di.ahc');
    const svg = renderDVGraphicToSVG(graphic);
    expect(svg).toContain('&amp;');
  });

  it('uses text-anchor middle for Center alignment', () => {
    const graphic = parseDVFile(xml, 'test.di.ahc');
    const svg = renderDVGraphicToSVG(graphic);
    expect(svg).toContain('text-anchor="middle"');
  });
});

describe('renderDVGraphicToSVG — DataLink', () => {
  const xml = minimalGraphic(`
    <LiveDataLink Name="DL1" Left="7200" Top="3600" Width="14400" Height="3600">
      <Tag Source="Direct" Value="UNIT1/FIC101.PV" />
      <Text Source="Direct" Value="" />
      <TextColor Source="Direct" Value="#FF404040" />
      <FontFamily Source="Direct" Value="Arial" />
      <FontSize Source="Direct" Value="12" />
      <FillColor Source="Direct" Value="transparent" />
      <BorderColor Source="Direct" Value="transparent" />
      <Visible Source="Direct" Value="true" />
      <Opacity Source="Direct" Value="100" />
    </LiveDataLink>`);

  it('renders a group with data-tag attribute', () => {
    const graphic = parseDVFile(xml, 'test.di.ahc');
    const svg = renderDVGraphicToSVG(graphic);
    expect(svg).toContain('data-tag=');
    expect(svg).toContain('UNIT1/FIC101.PV');
  });
});

describe('renderDVGraphicToSVG — visibility', () => {
  const xml = minimalGraphic(`
    <LiveRectangle Name="Hidden" Left="0" Top="0" Width="7200" Height="7200">
      <FillColor Source="Direct" Value="#FFFF0000" />
      <BorderColor Source="Direct" Value="#FF000000" />
      <BorderWidth Source="Direct" Value="1" />
      <Visible Source="Direct" Value="false" />
      <Opacity Source="Direct" Value="100" />
    </LiveRectangle>`);

  it('omits invisible objects', () => {
    const graphic = parseDVFile(xml, 'test.di.ahc');
    const svg = renderDVGraphicToSVG(graphic);
    // Background rect exists, but no shape rect for the invisible object
    const rectCount = (svg.match(/<rect/g) ?? []).length;
    expect(rectCount).toBe(1); // only background
  });
});

describe('renderDVGraphicToSVG — theme override', () => {
  it('uses provided theme option instead of graphic theme', () => {
    const graphic = parseDVFile(minimalGraphic('', 'DEFAULT'), 'test.di.ahc');
    // Just verify it renders without error for both themes
    const svgLight = renderDVGraphicToSVG(graphic, { theme: LiveTheme.DEFAULT });
    const svgDark = renderDVGraphicToSVG(graphic, { theme: LiveTheme.DG });
    expect(svgLight).toContain('<svg');
    expect(svgDark).toContain('<svg');
  });
});

describe('renderDVGraphicToSVG — unresolved gem placeholder', () => {
  const xml = minimalGraphic(`
    <LiveGem Name="Gem1" GemName="MissingGem" Left="0" Top="0" Width="14400" Height="14400">
      <FillColor Source="Direct" Value="transparent" />
      <BorderColor Source="Direct" Value="transparent" />
      <Visible Source="Direct" Value="true" />
      <Opacity Source="Direct" Value="100" />
      <Variables />
      <OverrideInfos />
    </LiveGem>`);

  it('renders dashed placeholder for unresolved gem', () => {
    const graphic = parseDVFile(xml, 'test.di.ahc');
    const svg = renderDVGraphicToSVG(graphic);
    expect(svg).toContain('stroke-dasharray');
  });
});
