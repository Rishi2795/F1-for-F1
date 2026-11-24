import { describe, expect, it } from "vitest";
import { contrast, readableOnDark } from "./color";

describe("colour helpers", () => {
  it("computes WCAG contrast", () => {
    expect(contrast("#ffffff", "#000000")).toBeCloseTo(21, 0);
    expect(contrast("#777777", "#777777")).toBe(1);
    expect(contrast("nope", "#000000")).toBe(1); // bad input never throws
  });

  it("leaves colours that are already visible untouched", () => {
    for (const c of ["#FF8000", "#E80020", "#27F4D2", "#3671C6"]) expect(readableOnDark(c)).toBe(c);
  });

  it("lifts a too-dark brand colour to at least 3:1 without turning it grey", () => {
    const navy = "#0600EF"; // Red Bull 2021 navy: 2.2:1 on the page surface
    expect(contrast(navy, "#050505")).toBeLessThan(3);
    const lifted = readableOnDark(navy);
    expect(contrast(lifted, "#050505")).toBeGreaterThanOrEqual(3);
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(lifted.slice(i, i + 2), 16));
    expect(b).toBeGreaterThan(r); // still blue
    expect(b).toBeGreaterThan(g);
  });

  it("passes through values it cannot parse", () => {
    expect(readableOnDark("rebeccapurple")).toBe("rebeccapurple");
  });
});
