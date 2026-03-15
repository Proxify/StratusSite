import { describe, it, expect } from 'vitest';
import { loadGemLibrary, resolveGems, extractTagsFromObject } from '@/lib/deltav/gem-resolver';
import { parseDVFile } from '@/lib/deltav/parser';
import { ConversionType, LiveTheme, LiveValueSource } from '@/lib/deltav/types';
import type { DVGem, DVDataLink } from '@/lib/deltav/types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SIMPLE_GEM_LIB = `<?xml version="1.0" encoding="UTF-8"?>
<GemLibrary>
  <GemDefinition Name="PIDFaceplate" Width="14400" Height="21600">
    <GraphicVariables>
      <Variable Name="Tag" DefaultValue="" />
      <Variable Name="FriendlyName" DefaultValue="Untitled" />
    </GraphicVariables>
    <Objects>
      <LiveRectangle Name="Background" Left="0" Top="0" Width="14400" Height="21600">
        <FillColor Source="ThemeRef" ThemeVariable="GL.Library.S_FillColor" DefaultValue="#FFC0C0C0" />
        <BorderColor Source="Direct" Value="#FF000000" />
        <BorderWidth Source="Direct" Value="1" />
        <Visible Source="Direct" Value="true" />
        <Opacity Source="Direct" Value="100" />
      </LiveRectangle>
      <LiveText Name="Label" Left="0" Top="0" Width="14400" Height="3600">
        <Text Source="GemRef" GemVariable="FriendlyName" DefaultValue="" />
        <TextColor Source="ThemeRef" ThemeVariable="GL.Library.S_TextColor" DefaultValue="#FF404040" />
        <FontFamily Source="Direct" Value="Arial" />
        <FontSize Source="Direct" Value="12" />
        <FillColor Source="Direct" Value="transparent" />
        <BorderColor Source="Direct" Value="transparent" />
        <Visible Source="Direct" Value="true" />
        <Opacity Source="Direct" Value="100" />
      </LiveText>
      <LiveDataLink Name="TagDisplay" Left="0" Top="3600" Width="14400" Height="3600">
        <Tag Source="GemRef" GemVariable="Tag" DefaultValue="" />
        <Text Source="Direct" Value="" />
        <TextColor Source="Direct" Value="#FF404040" />
        <FontFamily Source="Direct" Value="Arial" />
        <FontSize Source="Direct" Value="12" />
        <FillColor Source="Direct" Value="transparent" />
        <BorderColor Source="Direct" Value="transparent" />
        <Visible Source="Direct" Value="true" />
        <Opacity Source="Direct" Value="100" />
      </LiveDataLink>
    </Objects>
  </GemDefinition>
</GemLibrary>`;

const DISPLAY_XML = `<?xml version="1.0" encoding="UTF-8"?>
<LiveGraphic Name="TestDisplay" Width="720000" Height="576000" BackColor="#FFD0D0D0" Theme="DEFAULT">
  <Objects>
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
        <OverrideInfo ChildPath="Label" PropertyName="Text" Value="FIC-101 OVERRIDE" />
      </OverrideInfos>
    </LiveGem>
  </Objects>
</LiveGraphic>`;

// ---------------------------------------------------------------------------
// loadGemLibrary
// ---------------------------------------------------------------------------

describe('loadGemLibrary', () => {
  it('loads gem definitions from library XML', () => {
    const lib = loadGemLibrary(SIMPLE_GEM_LIB, ConversionType.RENDER);
    expect(lib.gems.size).toBe(1);
    expect(lib.gems.has('PIDFaceplate')).toBe(true);
  });

  it('parses gem name', () => {
    const lib = loadGemLibrary(SIMPLE_GEM_LIB);
    const def = lib.gems.get('PIDFaceplate');
    expect(def?.name).toBe('PIDFaceplate');
  });

  it('parses gem dimensions', () => {
    const lib = loadGemLibrary(SIMPLE_GEM_LIB, ConversionType.RENDER);
    const def = lib.gems.get('PIDFaceplate');
    expect(def?.width).toBe(2);   // 14400 / 7200
    expect(def?.height).toBe(3);  // 21600 / 7200
  });

  it('parses graphic variables', () => {
    const lib = loadGemLibrary(SIMPLE_GEM_LIB);
    const def = lib.gems.get('PIDFaceplate');
    expect(def?.variables).toHaveLength(2);
    expect(def?.variables[0].name).toBe('Tag');
    expect(def?.variables[1].name).toBe('FriendlyName');
    expect(def?.variables[1].defaultValue).toBe('Untitled');
  });

  it('parses gem children', () => {
    const lib = loadGemLibrary(SIMPLE_GEM_LIB);
    const def = lib.gems.get('PIDFaceplate');
    expect(def?.children.length).toBeGreaterThan(0);
  });

  it('returns empty library for empty XML', () => {
    const lib = loadGemLibrary('<GemLibrary></GemLibrary>');
    expect(lib.gems.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// resolveGems
// ---------------------------------------------------------------------------

describe('resolveGems', () => {
  it('resolves gem children from library', () => {
    const lib = loadGemLibrary(SIMPLE_GEM_LIB, ConversionType.RENDER);
    const graphic = parseDVFile(DISPLAY_XML, 'test.di.ahc', ConversionType.RENDER);
    const resolved = resolveGems(graphic, lib);

    const gem = resolved.objects.find((o) => o.objectType === 'Gem') as DVGem;
    expect(gem).toBeDefined();
    expect(gem.children).toBeDefined();
    expect(gem.children!.length).toBeGreaterThan(0);
  });

  it('substitutes GemRef variables in children', () => {
    const lib = loadGemLibrary(SIMPLE_GEM_LIB, ConversionType.RENDER);
    const graphic = parseDVFile(DISPLAY_XML, 'test.di.ahc', ConversionType.RENDER);
    const resolved = resolveGems(graphic, lib);

    const gem = resolved.objects.find((o) => o.objectType === 'Gem') as DVGem;
    const dl = gem.children?.find((c) => c.objectType === 'DataLink') as DVDataLink;
    expect(dl).toBeDefined();
    // After substitution, GemRef "Tag" should resolve to "FIC101"
    expect(dl.tag.source).toBe(LiveValueSource.Direct);
    expect(dl.tag.value).toBe('FIC101');
  });

  it('applies property overrides to gem children', () => {
    const lib = loadGemLibrary(SIMPLE_GEM_LIB, ConversionType.RENDER);
    const graphic = parseDVFile(DISPLAY_XML, 'test.di.ahc', ConversionType.RENDER);
    const resolved = resolveGems(graphic, lib);

    const gem = resolved.objects.find((o) => o.objectType === 'Gem') as DVGem;
    const label = gem.children?.find((c) => c.name === 'Label');
    expect(label).toBeDefined();
    if (label && label.objectType === 'Text') {
      expect(label.text.value).toBe('FIC-101 OVERRIDE');
    }
  });

  it('leaves unresolved gems intact when library missing gem', () => {
    const lib = loadGemLibrary('<GemLibrary></GemLibrary>');
    const graphic = parseDVFile(DISPLAY_XML, 'test.di.ahc');
    const resolved = resolveGems(graphic, lib);

    const gem = resolved.objects.find((o) => o.objectType === 'Gem') as DVGem;
    expect(gem).toBeDefined();
    expect(gem.children).toBeUndefined();
  });

  it('does not mutate the original graphic', () => {
    const lib = loadGemLibrary(SIMPLE_GEM_LIB);
    const graphic = parseDVFile(DISPLAY_XML, 'test.di.ahc');
    const original = graphic.objects.find((o) => o.objectType === 'Gem') as DVGem;
    resolveGems(graphic, lib);
    // Original should still have no children (resolveGems returns new object)
    expect(original.children).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// extractTagsFromObject
// ---------------------------------------------------------------------------

describe('extractTagsFromObject', () => {
  it('extracts tag from DataLink object', () => {
    const dl: DVDataLink = {
      objectType: 'DataLink',
      name: 'DL1',
      left: 0, top: 0, width: 100, height: 20,
      rotation: 0, flipX: false, flipY: false,
      visible: { source: LiveValueSource.Direct, value: 'true' },
      fillColor: { source: LiveValueSource.Direct, value: 'transparent' },
      borderColor: { source: LiveValueSource.Direct, value: 'transparent' },
      borderWidth: { source: LiveValueSource.Direct, value: '0' },
      opacity: { source: LiveValueSource.Direct, value: '100' },
      tag: { source: LiveValueSource.Direct, value: 'UNIT1/FIC101.PV' },
      text: { source: LiveValueSource.Direct, value: '' },
      textColor: { source: LiveValueSource.Direct, value: '#FF404040' },
      fontFamily: { source: LiveValueSource.Direct, value: 'Arial' },
      fontSize: { source: LiveValueSource.Direct, value: '12' },
    };

    const lib = loadGemLibrary('<GemLibrary></GemLibrary>');
    const tags = extractTagsFromObject(dl, lib, LiveTheme.DEFAULT);
    expect(tags).toHaveLength(1);
    expect(tags[0].tagname).toBe('UNIT1/FIC101.PV');
    expect(tags[0].objectName).toBe('DL1');
  });

  it('extracts tags from gem children', () => {
    const lib = loadGemLibrary(SIMPLE_GEM_LIB, ConversionType.RENDER);
    const graphic = parseDVFile(DISPLAY_XML, 'test.di.ahc', ConversionType.RENDER);
    const resolved = resolveGems(graphic, lib);

    const gem = resolved.objects.find((o) => o.objectType === 'Gem') as DVGem;
    const tags = extractTagsFromObject(gem, lib, LiveTheme.DEFAULT);
    expect(tags.length).toBeGreaterThan(0);
    expect(tags[0].gemName).toBe('PIDFaceplate');
  });
});
