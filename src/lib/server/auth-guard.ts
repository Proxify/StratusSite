import { auth } from '@/auth';

/**
 * Subscription guard for /api/process/* routes.
 * Returns a 403 response to send back, or null when the request may proceed.
 * DEV_BYPASS_AUTH=true skips the check — same escape hatch the /app layout
 * and middleware use for local development before OAuth/Stripe are configured.
 */
export async function requireSubscription(): Promise<Response | null> {
  if (process.env.DEV_BYPASS_AUTH === 'true') return null;
  const session = await auth();
  if (!session?.user?.subscriptionActive) {
    return Response.json({ error: 'Subscription required' }, { status: 403 });
  }
  return null;
}
