import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Footer } from "@/components/Footer";

describe("Footer", () => {
  it("renders copyright text", () => {
    render(<Footer />);
    expect(screen.getByText(/stratus software/i)).toBeInTheDocument();
  });

  it("renders footer navigation links", () => {
    render(<Footer />);
    const nav = screen.getByRole("navigation");
    expect(nav).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /products/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /pricing/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /about/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /contact/i })).toBeInTheDocument();
  });
});
