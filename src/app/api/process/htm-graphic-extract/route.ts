import { auth } from '@/auth';
import { extractFromFiles } from '@/lib/littledrop/htm-graphic-extract/extractor';
import type { ExtractionOptions } from '@/lib/littledrop/htm-graphic-extract/types';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.subscriptionActive)
    return Response.json({ error: 'Subscription required' }, { status: 403 });

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
