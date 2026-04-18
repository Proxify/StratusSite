import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-02-24.acacia",
});

export const PLATFORM_PRICE_ID = process.env.STRIPE_PRICE_ID_PLATFORM!;

export async function createCheckoutSession({
  userId,
  userEmail,
  existingCustomerId,
  successUrl,
  cancelUrl,
}: {
  userId: string;
  userEmail: string;
  existingCustomerId?: string | null;
  successUrl: string;
  cancelUrl: string;
}) {
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer: existingCustomerId ?? undefined,
    customer_email: existingCustomerId ? undefined : userEmail,
    line_items: [{ price: PLATFORM_PRICE_ID, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId },
    subscription_data: { metadata: { userId } },
    allow_promotion_codes: true,
  });

  return session;
}

export async function createPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string;
  returnUrl: string;
}) {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}
