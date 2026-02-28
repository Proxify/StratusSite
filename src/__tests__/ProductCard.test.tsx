import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ProductCard } from "@/components/ProductCard";

const mockProduct = {
  slug: "hmi-insight",
  name: "HMI Insight",
  tagline: "Automate your DCS documentation workflow",
  description: "A comprehensive suite of automation tools.",
  features: ["Feature 1", "Feature 2"],
  icon: "📊",
};

describe("ProductCard", () => {
  it("renders the product name", () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText("HMI Insight")).toBeInTheDocument();
  });

  it("renders the product tagline", () => {
    render(<ProductCard product={mockProduct} />);
    expect(
      screen.getByText("Automate your DCS documentation workflow")
    ).toBeInTheDocument();
  });

  it("renders the product icon", () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText("📊")).toBeInTheDocument();
  });

  it("links to the product detail page", () => {
    render(<ProductCard product={mockProduct} />);
    const link = screen.getByRole("link", { name: /learn more/i });
    expect(link).toHaveAttribute("href", "/products/hmi-insight");
  });
});
