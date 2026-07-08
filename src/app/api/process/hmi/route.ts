import '@/lib/server/dom';
import { NextRequest, NextResponse } from 'next/server';
import { requireSubscription } from '@/lib/server/auth-guard';
import { createCanvas, type Canvas } from '@napi-rs/canvas';
import { parseHMIFile } from '@/lib/hmi/parser';
import { renderGraphic } from '@/lib/hmi/renderer';
import { extractDataAndLinks } from '@/lib/hmi/extractor';
import { ConversionType, DEFAULT_IMAGE_SCALE } from '@/lib/hmi/types';

export const runtime = 'nodejs';
export const maxDuration = 300;

interface HMIProcessSettings {
  conversionType?: ConversionType;
  piServerName?: string;
  imageScale?: number;
  /** Map serialized as entries — Map itself doesn't survive JSON */
  tagConversionEntries?: [string, string][];
}

/**
 * Server-side HMI conversion: parse .htm files, extract tags/nav links, and
 * render each graphic to a JPEG. Returns JSON results the client UI displays
 * and feeds to its export formatters.
 */
export async function POST(req: NextRequest) {
  const guard = await requireSubscription();
  if (guard) return guard;

  const formData = await req.formData();
  const files = formData.getAll('files').filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 });
  }

  let settings: HMIProcessSettings = {};
  const rawSettings = formData.get('settings');
  if (typeof rawSettings === 'string') {
    try {
      settings = JSON.parse(rawSettings);
    } catch {
      return NextResponse.json({ error: 'Invalid settings JSON' }, { status: 400 });
    }
  }

  const scale = settings.imageScale ?? DEFAULT_IMAGE_SCALE;
  const tagConversionMap = new Map(settings.tagConversionEntries ?? []);

  const results = [];
  for (const file of files) {
    const fileName = file.name.replace(/\.htm$/i, '');
    try {
      const content = await file.text();
      const graphic = parseHMIFile(content, file.name);

      const { pointTags, navigationLinks } = extractDataAndLinks(graphic, {
        tagConversionMap,
        conversionType: settings.conversionType ?? ConversionType.RENDER,
        historianServerName: settings.piServerName,
      });

      let imageBase64: string | undefined;
      try {
        const canvas = renderGraphic(graphic, { scale }, (w, h) => createCanvas(w, h));
        imageBase64 = (canvas as unknown as Canvas).toBuffer('image/jpeg', 92).toString('base64');
      } catch {
        // Rendering is best-effort — tags/links are still useful without it
      }

      results.push({ fileName, graphic, pointTags, navigationLinks, imageBase64 });
    } catch (err) {
      results.push({
        fileName,
        error: err instanceof Error ? err.message : 'Failed to process file',
      });
    }
  }

  return NextResponse.json({ results });
}
