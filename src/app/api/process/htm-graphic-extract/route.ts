import { requireSubscription } from '@/lib/server/auth-guard';
import { extractFromFiles } from '@/lib/littledrop/htm-graphic-extract/extractor';
import type { ExtractionOptions } from '@/lib/littledrop/htm-graphic-extract/types';

export async function POST(request: Request) {
  const guard = await requireSubscription();
  if (guard) return guard;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const fileEntries = formData.getAll('files') as File[];
  if (fileEntries.length === 0)
    return Response.json({ error: 'No files provided' }, { status: 400 });

  const optRaw = formData.get('options');
  let options: ExtractionOptions = {};
  if (typeof optRaw === 'string') {
    try {
      options = JSON.parse(optRaw) as ExtractionOptions;
    } catch {
      // ignore malformed options, use defaults
    }
  }

  const files = await Promise.all(
    fileEntries.map(async (f) => ({ name: f.name, content: await f.text() }))
  );

  try {
    const result = extractFromFiles(files, options);
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Extraction failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
