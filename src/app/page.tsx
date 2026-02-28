import Link from "next/link";
import { products, testimonials } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import { TestimonialCard } from "@/components/TestimonialCard";
import { FadeInSection } from "@/components/FadeInSection";

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy px-6 py-24 md:py-36">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--color-accent)_0%,_transparent_70%)] opacity-[0.07]" />
        <div className="relative mx-auto max-w-4xl text-center">
          <FadeInSection>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight md:text-6xl lg:text-7xl">
              Industrial Automation,{" "}
              <span className="text-accent">Modernized</span>
            </h1>
          </FadeInSection>
          <FadeInSection delay="animate-delay-100">
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted md:text-xl">
              Purpose-built tools for DCS engineers working with Honeywell
              Experion, TDC, and Emerson DeltaV systems. Capture, document, and
              render — faster than ever.
            </p>
          </FadeInSection>
          <FadeInSection delay="animate-delay-200">
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/products"
                className="rounded-lg bg-accent px-8 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
              >
                Explore Products
              </Link>
              <Link
                href="/contact"
                className="rounded-lg border border-white/20 px-8 py-3.5 text-sm font-semibold text-white transition-colors hover:border-white/40 hover:bg-white/5"
              >
                Get in Touch
              </Link>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* Products */}
      <section className="bg-navy-light px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <FadeInSection>
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                The Stratus Suite
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-muted">
                Three powerful modules designed to streamline every aspect of
                your DCS workflow.
              </p>
            </div>
          </FadeInSection>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {products.map((product, i) => (
              <FadeInSection
                key={product.slug}
                delay={
                  i === 0
                    ? ""
                    : i === 1
                      ? "animate-delay-100"
                      : "animate-delay-200"
                }
              >
                <ProductCard product={product} />
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-surface px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <FadeInSection>
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
                Trusted by Industry Engineers
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-gray-500">
                See what DCS professionals are saying about the Stratus Suite.
              </p>
            </div>
          </FadeInSection>
          <div className="mt-16 grid gap-8 md:grid-cols-2">
            {testimonials.map((testimonial, i) => (
              <FadeInSection
                key={testimonial.author}
                delay={i === 0 ? "" : "animate-delay-100"}
              >
                <TestimonialCard testimonial={testimonial} />
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-navy px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <FadeInSection>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Ready to modernize your workflow?
            </h2>
            <p className="mt-4 text-lg text-muted">
              Get started with Stratus and see the difference automation makes
              in your DCS projects.
            </p>
            <div className="mt-10">
              <Link
                href="/contact"
                className="rounded-lg bg-accent px-8 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
              >
                Get Started Today
              </Link>
            </div>
          </FadeInSection>
        </div>
      </section>
    </>
  );
}
