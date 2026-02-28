import Link from "next/link";
import { FadeInSection } from "@/components/FadeInSection";

export const metadata = {
  title: "Pricing — Stratus Software",
  description: "Simple, transparent pricing for teams of all sizes.",
};

const tiers = [
  {
    name: "Starter",
    price: "$499",
    period: "/month",
    description: "For small teams getting started with DCS automation.",
    features: [
      "1 product module",
      "Up to 5 users",
      "Standard support",
      "Basic reporting",
      "Email assistance",
    ],
    cta: "Get Started",
    highlight: false,
  },
  {
    name: "Professional",
    price: "$999",
    period: "/month",
    description: "For growing teams that need the full Stratus Suite.",
    features: [
      "All 3 product modules",
      "Up to 25 users",
      "Priority support",
      "Advanced reporting & analytics",
      "Custom output templates",
      "API access",
    ],
    cta: "Get Started",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For large organizations with complex requirements.",
    features: [
      "All 3 product modules",
      "Unlimited users",
      "Dedicated support engineer",
      "Custom integrations",
      "On-premise deployment option",
      "SLA guarantee",
      "Training & onboarding",
    ],
    cta: "Contact Sales",
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-navy px-6 py-24">
        <div className="mx-auto max-w-4xl text-center">
          <FadeInSection>
            <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
              Simple, Transparent Pricing
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">
              Choose the plan that fits your team. No hidden fees, no surprises.
            </p>
          </FadeInSection>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="bg-navy-light px-6 py-24">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-3">
          {tiers.map((tier, i) => (
            <FadeInSection
              key={tier.name}
              delay={
                i === 0
                  ? ""
                  : i === 1
                    ? "animate-delay-100"
                    : "animate-delay-200"
              }
            >
              <div
                className={`relative flex h-full flex-col rounded-2xl border p-8 ${
                  tier.highlight
                    ? "border-accent bg-navy shadow-lg shadow-accent/10"
                    : "border-white/10 bg-navy"
                }`}
              >
                {tier.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-accent px-4 py-1 text-xs font-semibold text-white">
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-bold">{tier.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold">{tier.price}</span>
                  {tier.period && (
                    <span className="text-muted">{tier.period}</span>
                  )}
                </div>
                <p className="mt-4 text-sm text-muted">{tier.description}</p>
                <ul className="mt-8 flex-1 space-y-3">
                  {tier.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-3 text-sm text-muted"
                    >
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
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/contact"
                  className={`mt-8 block rounded-lg px-6 py-3 text-center text-sm font-semibold transition-colors ${
                    tier.highlight
                      ? "bg-accent text-white hover:bg-accent-hover"
                      : "border border-white/20 text-white hover:border-white/40 hover:bg-white/5"
                  }`}
                >
                  {tier.cta}
                </Link>
              </div>
            </FadeInSection>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-navy px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <FadeInSection>
            <h2 className="text-3xl font-bold tracking-tight">
              Questions? Let&apos;s chat.
            </h2>
            <p className="mt-4 text-lg text-muted">
              We&apos;re happy to walk you through our pricing and help you find
              the right plan for your team.
            </p>
            <div className="mt-10">
              <Link
                href="/contact"
                className="rounded-lg bg-accent px-8 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
              >
                Contact Us
              </Link>
            </div>
          </FadeInSection>
        </div>
      </section>
    </>
  );
}
