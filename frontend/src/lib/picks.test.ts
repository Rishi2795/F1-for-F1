import { describe, expect, it } from "vitest";
import { scorePodium } from "./picks";

describe("scorePodium", () => {
  it("gives 3 for the right place and 1 for a podium finisher in the wrong place", () => {
    expect(scorePodium(["VER", "NOR", "LEC"], ["VER", "NOR", "LEC"])).toBe(9);
    expect(scorePodium(["VER", "NOR", "LEC"], ["NOR", "VER", "LEC"])).toBe(5);
    expect(scorePodium(["VER", "NOR", "LEC"], ["HAM", "RUS", "PIA"])).toBe(0);
    expect(scorePodium(["VER", "HAM"], ["VER", "NOR", "HAM"])).toBe(4);
  });
});
