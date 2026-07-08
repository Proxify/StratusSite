import '@/lib/server/dom';
import { NextRequest, NextResponse } from 'next/server';
import { requireSubscription } from '@/lib/server/auth-guard';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { parseDVFile } from '@/lib/deltav/parser';
import { renderDVGraphicToSVG } from '@/lib/deltav/renderer';
import { loadGemLibrary, resolveGems, extractTagsFromObject } from '@/lib/deltav/gem-resolver';
import { parseTheme } from '@/lib/deltav/theme';
import { ConversionType, type GemLibrary } from '@/lib/deltav/types';

export const runtime = 'nodejs';
export const maxDuration = 300;

interface DVProcessSettings {
  conversionType?: ConversionType;
  theme?: string;
  imageScale?: number;
}

/**
 * Server-side DeltaV Live conversion: parse .di.ahc displays (resolving gems
 * from any uploaded .gc.ahc libraries), render to SVG, rasterize to PNG, and
 * extract DataLink tags.
 */
export async function POST(req: NextRequest) {
  const guard = await requireSubscription();
  if (guard) return guard;

  const formData = await req.formData();
  const displayFiles = formData.getAll('displays').filter((f): f is File => f instanceof File);
  const gemFiles = formData.getAll('gems').filter((f): f is File => f instanceof File);
  if (displayFiles.length === 0) {
    return NextResponse.json({ error: 'No display files provided' }, { status: 400 });
  }

  let settings: DVProcessSettings = {};
  const rawSettings = formData.get('settings');
  if (typeof rawSettings === 'string') {
    try {
      settings = JSON.parse(rawSettings);
    } catch {
      return NextResponse.json({ error: 'Invalid settings JSON' }, { status: 400 });
    }
  }

  const mode = settings.conversionType ?? ConversionType.RENDER;
  const theme = parseTheme(settings.theme ?? null);
  const scale = settings.imageScale ?? 1;

  // Merge all uploaded gem libraries into one lookup
  const library: GemLibrary = { gems: new Map() };
  const gemErrors: string[] = [];
  for (const file of gemFiles) {
    try {
      const lib = loadGemLibrary(await file.text(), mode);
      for (const [name, def] of lib.gems) library.gems.set(name, def);
    } catch (err) {
      gemErrors.push(
        `${file.name}: ${err instanceof Error ? err.message : 'failed to load gem library'}`
      );
    }
  }

  const results = [];
  for (const file of displayFiles) {
    const fileName = file.name.replace(/\.di\.ahc$/i, '');
    try {
      const parsed = parseDVFile(await file.text(), file.name, mode);
      const graphic = library.gems.size > 0 ? resolveGems(parsed, library) : parsed;

      const svg = renderDVGraphicToSVG(graphic, { theme });

      let imageBase64: string | undefined;
      try {
        const img = await loadImage(Buffer.from(svg));
        const canvas = createCanvas(Math.round(img.width * scale), Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);
        imageBase64 = canvas.toBuffer('image/png').toString('base64');
      } catch {
        // Rasterization is best-effort — the SVG itself is still returned
      }

      const tagLinks = graphic.objects.flatMap((obj) =>
        extractTagsFromObject(obj, library, theme)
      );

      results.push({
        fileName,
        width: graphic.width,
        height: graphic.height,
        theme: graphic.theme,
        svg,
        imageBase64,
        tagLinks,
      });
    } catch (err) {
      results.push({
        fileName,
        error: err instanceof Error ? err.message : 'Failed to process file',
      });
    }
  }

  return NextResponse.json({ results, gemErrors, gemCount: library.gems.size });
}
