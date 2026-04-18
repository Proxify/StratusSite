import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createCheckoutSession } from "@/lib/stripe";
import { getStripeCustomerId } from "@/lib/db";

export async function POST() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existingCustomerId = await getStripeCustomerId(session.user.id);
  const origin = process.env.NEXTAUTH_URL ?? "https://stratussoftware.net";

  const checkout = await createCheckoutSession({
    userId: session.user.id,
    userEmail: session.user.email!,
    existingCustomerId,
    successUrl: `${origin}/dashboard?success=true`,
    cancelUrl: `${origin}/pricing?canceled=true`,
  });

  return NextResponse.json({ url: checkout.url });
}
