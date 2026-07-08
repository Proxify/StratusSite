import { requireSubscription } from '@/lib/server/auth-guard';
import { extractTagsFromText, buildAllTagLists } from '@/lib/littledrop/available-tags/tag-list-builder';

export async function POST(request: Request) {
  const guard = await requireSubscription();
  if (guard) return guard;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const tagFormat = formData.get('tagFormat');
  if (typeof tagFormat !== 'string' || !tagFormat.trim())
    return Response.json({ error: 'tagFormat is required' }, { status: 400 });

  const fileEntries = formData.getAll('files') as File[];
  if (fileEntries.length === 0)
    return Response.json({ error: 'No files provided' }, { status: 400 });

  const files = await Promise.all(fileEntries.map(async f => ({ name: f.name, content: await f.text() })));

  try {
    const tagSet = new Set<string>();
    for (const f of files) {
      for (const tag of extractTagsFromText(f.content, tagFormat)) tagSet.add(tag);
    }

    const result = buildAllTagLists(Array.from(tagSet), tagFormat);
    return Response.json({ tagFormat, fileCount: files.length, tagCount: tagSet.size, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Processing failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
