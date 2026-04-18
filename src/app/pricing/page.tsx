import { auth } from "@/auth";
import Link from "next/link";
import { FadeInSection } from "@/components/FadeInSection";
import { SubscribeButton } from "@/components/auth/SubscribeButton";

export const metadata = {
  title: "Pricing — Stratus Software",
  description: "Platform access for industrial automation teams.",
};

const features = [
  "HMI Insight — Honeywell Experion .htm converter",
  "DeltaV Render — Emerson DeltaV Live .di.ahc converter",
  "Render to high-quality JPEG images",
  "Combined PDF documentation packages",
  "Tag inventory Excel exports",
  "Navigation map exports",
  "Unlimited file conversions",
  "Priority support",
];

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; canceled?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;
  const isAuthenticated = !!session?.user;
  const hasSubscription = session?.user?.subscriptionActive ?? false;

  return (
    <>
      {/* Hero */}
      <section className="bg-navy px-6 py-24">
        <div className="mx-auto max-w-4xl text-center">
          <FadeInSection>
            <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
              Platform Access
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">
              Full access to the Stratus toolset for your engineering team. One
              plan, everything included.
            </p>
          </FadeInSection>
        </div>
      </section>

      {/* Notifications */}
      {params.message === "subscribe" && (
        <div className="bg-accent/10 px-6 py-4 text-center text-sm text-accent">
          A subscription is required to access the tools.{" "}
          <a href="#plan" className="underline">
            Subscribe below →
          </a>
        </div>
      )}
      {params.canceled && (
        <div className="bg-yellow-500/10 px-6 py-4 text-center text-sm text-yellow-400">
          Checkout was canceled — no charge was made.
        </div>
      )}

      {/* Pricing card */}
      <section id="plan" className="bg-navy-light px-6 py-24">
        <div className="mx-auto max-w-lg">
          <FadeInSection>
            <div className="relative rounded-2xl border border-accent bg-navy p-10 shadow-2xl shadow-accent/10">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-accent px-4 py-1 text-xs font-semibold text-white">
                All tools included
              </div>

              <h2 className="text-2xl font-bold text-white">Stratus Platform</h2>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-5xl font-extrabold text-white">$2,000</span>
                <span className="text-muted">/month</span>
              </div>
              <p className="mt-3 text-sm text-muted">
                Billed monthly. Cancel anytime.
              </p>

              <ul className="mt-8 space-y-3">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-muted">
                    <svg
                      className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-10">
                {hasSubscription ? (
                  <Link
                    href="/app"
                    className="block w-full rounded-lg bg-accent px-6 py-4 text-center text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
                  >
                    Access Your Tools →
                  </Link>
                ) : (
                  <SubscribeButton
                    isAuthenticated={isAuthenticated}
                    className="block w-full rounded-lg bg-accent px-6 py-4 text-center text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
                  >
                    {isAuthenticated ? "Subscribe Now" : "Sign In to Subscribe"}
                  </SubscribeButton>
                )}
              </div>

              <p className="mt-4 text-center text-xs text-muted">
                Secure checkout powered by Stripe
              </p>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* Enterprise / contact */}
      <section className="bg-navy px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <FadeInSection>
            <h2 className="text-3xl font-bold tracking-tight">
              Need a custom arrangement?
            </h2>
            <p className="mt-4 text-lg text-muted">
              Enterprise pricing, on-premise deployment, and multi-org licensing
              are available. Let&apos;s talk.
            </p>
            <div className="mt-10">
              <Link
                href="/contact"
                className="rounded-lg border border-white/20 px-8 py-3.5 text-sm font-semibold text-white transition-colors hover:border-white/40 hover:bg-white/5"
              >
                Contact Sales
              </Link>
            </div>
          </FadeInSection>
        </div>
      </section>
    </>
  );
}
