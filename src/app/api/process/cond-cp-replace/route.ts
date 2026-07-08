import { auth } from '@/auth';
import { processHtmContent, type ReplaceConfig } from '@/lib/littledrop/cond-cp-replace';

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

  const configRaw = formData.get('config');
  let config: ReplaceConfig;
  try {
    config = JSON.parse(typeof configRaw === 'string' ? configRaw : '{}') as ReplaceConfig;
  } catch {
    return Response.json({ error: 'Invalid config JSON' }, { status: 400 });
  }

  if (!config.cond1?.cpName?.trim() || !config.changeCPName?.trim()) {
    return Response.json({ error: 'cond1.cpName and changeCPName are required' }, { status: 400 });
  }

  const fileEntries = formData.getAll('files') as File[];
  if (fileEntries.length === 0)
    return Response.json({ error: 'No files provided' }, { status: 400 });

  try {
    const results = await Promise.all(
      fileEntries.map(async (f) => {
        const content = await f.text();
        const { changed, content: modifiedContent, replacements } = processHtmContent(
          content,
          config
        );
        return { fileName: f.name, changed, replacements, modifiedContent };
      })
    );
    return Response.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Processing failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
