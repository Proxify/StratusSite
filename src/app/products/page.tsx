import Link from "next/link";
import { products } from "@/lib/products";
import { FadeInSection } from "@/components/FadeInSection";

export const metadata = {
  title: "Products — Stratus Software",
  description:
    "Explore the Stratus Suite: HMI Insight, HMI Markup, and DeltaV Render.",
};

export default function ProductsPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-navy px-6 py-24">
        <div className="mx-auto max-w-4xl text-center">
          <FadeInSection>
            <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
              Our Products
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">
              Three modules. One mission. Streamline every aspect of your DCS
              engineering workflow.
            </p>
          </FadeInSection>
        </div>
      </section>

      {/* Product sections */}
      {products.map((product, index) => (
        <section
          key={product.slug}
          className={`px-6 py-24 ${index % 2 === 0 ? "bg-navy-light" : "bg-navy"}`}
        >
          <div className="mx-auto max-w-7xl">
            <FadeInSection>
              <div className="grid items-start gap-12 md:grid-cols-2">
                <div>
                  <div className="mb-4 text-5xl">{product.icon}</div>
                  <h2 className="text-3xl font-bold tracking-tight">
                    {product.name}
                  </h2>
                  <p className="mt-2 text-lg font-medium text-accent">
                    {product.tagline}
                  </p>
                  <p className="mt-4 text-muted">{product.description}</p>
                  <Link
                    href={`/products/${product.slug}`}
                    className="mt-8 inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
                  >
                    Learn More
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
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>
                </div>
                <div>
                  <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
                    Key Features
                  </h3>
                  <ul className="space-y-3">
                    {product.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-3 text-muted"
                      >
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
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </FadeInSection>
          </div>
        </section>
      ))}
    </>
  );
}
