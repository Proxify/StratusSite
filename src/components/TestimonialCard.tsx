import type { Testimonial } from "@/lib/products";

interface TestimonialCardProps {
  testimonial: Testimonial;
}

export function TestimonialCard({ testimonial }: TestimonialCardProps) {
  return (
    <blockquote className="rounded-2xl border border-gray-200 bg-white p-8">
      <svg
        className="mb-4 h-8 w-8 text-accent/30"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151C7.546 6.068 5.983 8.789 5.983 11h4v10H0z" />
      </svg>
      <p className="text-lg leading-relaxed text-gray-700">
        &ldquo;{testimonial.quote}&rdquo;
      </p>
      <footer className="mt-6">
        <p className="font-semibold text-gray-900">{testimonial.author}</p>
        <p className="text-sm text-gray-500">{testimonial.company}</p>
      </footer>
    </blockquote>
  );
}
