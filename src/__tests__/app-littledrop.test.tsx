// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import LittleDropSectionPage from "@/app/app/littledrop/page";

const pageSource = readFileSync(
  resolve(process.cwd(), "src/app/app/littledrop/page.tsx"),
  "utf8"
);

describe("LittleDrop section scaffold", () => {
  it("exports a server component for the section route", () => {
    expect(typeof LittleDropSectionPage).toBe("function");
  });

  it("declares each non-PI / non-Raddical module from the desktop suite", () => {
    const expected = [
      "Associated Display",
      "Available Tags",
      "Cond CP Replace",
      "Config Siphon",
      "EB Explorer",
      "HTM Graphic Extract",
      "xGrep",
    ];
    for (const name of expected) {
      expect(pageSource).toContain(name);
    }
  });

  it("uses next/link for client-side navigation (no full page reloads)", () => {
    expect(pageSource).toContain('from \'next/link\'');
  });

  it("does not surface PI or Raddical features in the ported UI", () => {
    const lower = pageSource.toLowerCase();
    expect(lower).not.toContain("raddical");
    expect(lower).not.toMatch(/\bpi\b/);
  });
});
