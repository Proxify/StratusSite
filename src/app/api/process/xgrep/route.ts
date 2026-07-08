import { auth } from '@/auth';
import { xGrep, type XGrepOptions } from '@/lib/littledrop/xgrep';

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

  // Parse options
  const optionsRaw = formData.get('options');
  let options: XGrepOptions;
  try {
    options = JSON.parse(typeof optionsRaw === 'string' ? optionsRaw : '{}') as XGrepOptions;
  } catch {
    return Response.json({ error: 'Invalid options JSON' }, { status: 400 });
  }

  if (!options.keyword?.trim()) {
    return Response.json({ error: 'keyword is required' }, { status: 400 });
  }

  // Read uploaded files
  const fileEntries = formData.getAll('files') as File[];
  if (fileEntries.length === 0) {
    return Response.json({ error: 'No files provided' }, { status: 400 });
  }

  const files = await Promise.all(
    fileEntries.map(async (f) => ({ name: f.name, content: await f.text() }))
  );

  try {
    const result = xGrep(files, options);
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Search failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
