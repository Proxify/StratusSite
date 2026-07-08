import { requireSubscription } from '@/lib/server/auth-guard';
import { parseEbFile, mergeEbResults } from '@/lib/littledrop/eb-explorer';

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

  try {
    const results = await Promise.all(
      fileEntries.map(async (f) => parseEbFile(await f.text(), f.name))
    );

    const merged = mergeEbResults(results);

    return Response.json({
      files: results.map((r) => r.fileName),
      tags: merged.tags,
      byPointType: merged.byPointType,
      allColumns: merged.allColumns,
      totalTags: merged.tags.length,
      pointTypes: Object.keys(merged.byPointType),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Parse failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
