import { auth } from '@/auth';
import { processAssocDisplay, type AssocOptions } from '@/lib/littledrop/associated-display';

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

  const fileEntry = formData.get('file') as File | null;
  if (!fileEntry) return Response.json({ error: 'No file provided' }, { status: 400 });

  const nativeLocation =
    (formData.get('nativeLocation') as string | null)?.trim() || 'NATIVE:\\WINDOW\\';
  const generateCleanup = formData.get('generateCleanup') === 'true';

  const content = await fileEntry.text();
  const options: AssocOptions = { nativeLocation, generateCleanup };

  try {
    const report = processAssocDisplay(content, options);
    return Response.json(report);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Processing failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
