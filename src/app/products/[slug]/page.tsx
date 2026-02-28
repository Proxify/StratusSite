import Link from "next/link";
import { notFound } from "next/navigation";
import { products, getProduct } from "@/lib/products";
import { FadeInSection } from "@/components/FadeInSection";

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) return {};
  return {
    title: `${product.name} — Stratus Software`,
    description: product.tagline,
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProduct(slug);

  if (!product) {
    notFound();
  }

  return (
    <>
      {/* Hero */}
      <section className="bg-navy px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <FadeInSection>
            <Link
              href="/products"
              className="mb-8 inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-white"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              All Products
            </Link>
            <div className="mb-6 text-6xl">{product.icon}</div>
            <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
              {product.name}
            </h1>
            <p className="mt-4 text-xl text-accent">{product.tagline}</p>
            <p className="mt-6 max-w-3xl text-lg text-muted">
              {product.description}
            </p>
          </FadeInSection>
        </div>
      </section>

      {/* Features */}
      <section className="bg-navy-light px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <FadeInSection>
            <h2 className="text-2xl font-bold tracking-tight">Features</h2>
          </FadeInSection>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {product.features.map((feature, i) => (
              <FadeInSection
                key={feature}
                delay={i % 2 === 0 ? "" : "animate-delay-100"}
              >
                <div className="rounded-xl border border-white/10 p-6">
                  <div className="flex items-start gap-3">
                    <svg
                      className="mt-0.5 h-5 w-5 flex-shrink-0 text-accent"
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
                    <span className="text-muted">{feature}</span>
                  </div>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-navy px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <FadeInSection>
            <h2 className="text-3xl font-bold tracking-tight">
              Ready to get started with {product.name}?
            </h2>
            <p className="mt-4 text-lg text-muted">
              Contact us to learn how {product.name} can streamline your
              workflow.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/contact"
                className="rounded-lg bg-accent px-8 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
              >
                Request a Demo
              </Link>
              <Link
                href="/pricing"
                className="rounded-lg border border-white/20 px-8 py-3.5 text-sm font-semibold text-white transition-colors hover:border-white/40 hover:bg-white/5"
              >
                View Pricing
              </Link>
            </div>
          </FadeInSection>
        </div>
      </section>
    </>
  );
}
