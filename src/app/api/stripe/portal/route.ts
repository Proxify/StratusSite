import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createPortalSession } from "@/lib/stripe";
import { getStripeCustomerId } from "@/lib/db";

export async function POST() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const customerId = await getStripeCustomerId(session.user.id);
  if (!customerId) {
    return NextResponse.json({ error: "No billing account found" }, { status: 400 });
  }

  const origin = process.env.NEXTAUTH_URL ?? "https://stratussoftware.net";
  const portal = await createPortalSession({
    customerId,
    returnUrl: `${origin}/dashboard`,
  });

  return NextResponse.json({ url: portal.url });
}
