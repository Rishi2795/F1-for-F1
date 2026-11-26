import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Photo } from "../src/lib/driverphotos";

// Reads the real files, so it lives outside src/ (the app build does not know about Node).
const registry = JSON.parse(readFileSync("public/drivers/credits.json", "utf-8")) as { photos: Record<string, Photo> };
const ALLOWED = /^(CC0|Public domain|CC BY(-SA)? [234]\.\d)/i;

describe("the photo registry", () => {
  it("only holds pictures we may show: a real file, an author, a free licence and its source", () => {
    const entries = Object.entries(registry.photos);
    for (const [code, p] of entries) {
      expect(existsSync(`public/drivers/${p.file}`), `${code}: file ${p.file}`).toBe(true);
      expect(p.credit.trim().length, `${code}: author`).toBeGreaterThan(1);
      expect(p.licence, `${code}: licence`).toMatch(ALLOWED);
      expect(p.licence, `${code}: no NC/ND`).not.toMatch(/NC|ND/);
      expect(p.source, `${code}: Commons page`).toMatch(/^https:\/\/commons\.wikimedia\.org\//);
      if (p.face) expect(p.face.every((v) => v >= 0 && v <= 1), `${code}: face inside the picture`).toBe(true);
    }
  });
});

