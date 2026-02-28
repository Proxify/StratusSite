import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { TestimonialCard } from "@/components/TestimonialCard";

const mockTestimonial = {
  quote: "The Stratus Suite is incredible.",
  author: "Fahim Khan",
  company: "Motiva Enterprises LLC",
};

describe("TestimonialCard", () => {
  it("renders the quote text", () => {
    render(<TestimonialCard testimonial={mockTestimonial} />);
    expect(
      screen.getByText(/The Stratus Suite is incredible./)
    ).toBeInTheDocument();
  });

  it("renders the author name", () => {
    render(<TestimonialCard testimonial={mockTestimonial} />);
    expect(screen.getByText(/Fahim Khan/)).toBeInTheDocument();
  });

  it("renders the company name", () => {
    render(<TestimonialCard testimonial={mockTestimonial} />);
    expect(screen.getByText(/Motiva Enterprises LLC/)).toBeInTheDocument();
  });
});
