import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
// Header itself is an async server component (wraps auth()) — test the
// client component that renders the actual markup.
import { HeaderClient } from "@/components/HeaderClient";

describe("Header", () => {
  it("renders the logo text", () => {
    render(<HeaderClient user={null} />);
    expect(screen.getByText("Stratus")).toBeInTheDocument();
  });

  it("renders navigation links", () => {
    render(<HeaderClient user={null} />);
    expect(screen.getByRole("link", { name: /products/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /pricing/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /about/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /contact/i })).toBeInTheDocument();
  });

  it("renders the Sign In CTA when signed out", () => {
    render(<HeaderClient user={null} />);
    expect(
      screen.getAllByRole("link", { name: /sign in/i }).length
    ).toBeGreaterThan(0);
  });

  it("has a sticky header", () => {
    render(<HeaderClient user={null} />);
    const header = screen.getByRole("banner");
    expect(header.className).toContain("sticky");
  });
});
