import { auth } from '@/auth';
import { parseFhx } from '@/lib/littledrop/config-siphon/parser';
import { buildTables, tablesToXlsx } from '@/lib/littledrop/config-siphon/exporter';
import type { SiphonOptions } from '@/lib/littledrop/config-siphon/types';

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
  let options: SiphonOptions = { format: 'config' };
  if (typeof optionsRaw === 'string') {
    try {
      options = JSON.parse(optionsRaw) as SiphonOptions;
    } catch {
      return Response.json({ error: 'Invalid options JSON' }, { status: 400 });
    }
  }

  // Validate format
  if (options.format && !['config', 'esp', 'json'].includes(options.format)) {
    return Response.json({ error: 'format must be config | esp | json' }, { status: 400 });
  }

  // Read FHX file(s) — take the first one
  const fileEntries = formData.getAll('files') as File[];
  if (fileEntries.length === 0) {
    return Response.json({ error: 'No files provided' }, { status: 400 });
  }

  const fhxContent = await fileEntries[0].text();
  const fileName = fileEntries[0].name.replace(/\.[^.]+$/, '');

  const t0 = Date.now();

  let parsed;
  try {
    parsed = parseFhx(fhxContent);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Parse error';
    return Response.json({ error: msg }, { status: 422 });
  }

  const tables = buildTables(parsed, options);

  if (options.format === 'json') {
    return Response.json({
      tables,
      moduleCount: parsed.controlModules.length,
      classCount: Object.keys(parsed.moduleClassMap).length,
      elapsedMs: Date.now() - t0,
    });
  }

  // xlsx output
  let buf: Uint8Array;
  try {
    buf = await tablesToXlsx(tables);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'xlsx generation failed';
    return Response.json({ error: msg }, { status: 500 });
  }

  // ponytail: ArrayBuffer cast avoids Uint8Array<ArrayBufferLike> vs BlobPart mismatch in TS 5.9
  return new Response(buf.buffer as ArrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fileName}-config-siphon.xlsx"`,
    },
  });
}
