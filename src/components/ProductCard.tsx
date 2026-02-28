import Link from "next/link";
import type { Product } from "@/lib/products";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <div className="group rounded-2xl border border-white/10 bg-navy-light p-8 transition-all hover:border-accent/50 hover:shadow-lg hover:shadow-accent/5">
      <div className="mb-4 text-4xl">{product.icon}</div>
      <h3 className="text-xl font-bold text-white">{product.name}</h3>
      <p className="mt-2 text-sm text-muted">{product.tagline}</p>
      <Link
        href={`/products/${product.slug}`}
        className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-accent transition-colors hover:text-accent-hover"
      >
        Learn More
        <svg
          className="h-4 w-4 transition-transform group-hover:translate-x-1"
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
  );
}
