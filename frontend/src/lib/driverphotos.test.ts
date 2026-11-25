import { describe, expect, it } from "vitest";
import { avatarStyle, framing, type Photo } from "./driverphotos";

describe("framing", () => {
  const photo = (over: Partial<Photo> = {}): Photo => ({ file: "x.jpg", credit: "a", licence: "CC BY 4.0", face: [0.5, 0.4], width: 1000, height: 1500, ...over });
  it("puts the face a third of the way down when the picture is taller than the box", () => {
    // a 2:3 portrait in a square box shows two thirds of its height; a face at 40% sits at 38% of the box when pos = 2.5%... check the maths
    const pos = framing(photo(), 1, 0.38);
    const py = parseFloat(pos.split(" ")[1]) / 100;
    const visible = 1000 / 1500; // share of the height that shows
    const faceInBox = (0.4 - py * (1 - visible)) / visible;
    expect(faceInBox).toBeCloseTo(0.38, 2);
  });
  it("centres the face sideways when the picture is wider than the box", () => {
    const pos = framing(photo({ width: 1500, height: 1000, face: [0.3, 0.4] }), 0.75, 0.38);
    const px = parseFloat(pos.split(" ")[0]) / 100;
    const visible = 0.75 / 1.5;
    expect((0.3 - px * (1 - visible)) / visible).toBeCloseTo(0.5, 2);
  });
  it("never leaves the picture, and falls back to the hand-set focus without a face", () => {
    expect(framing(photo({ face: [0.02, 0.01] }), 1)).toMatch(/^[\d.]+% [\d.]+%$/);
    expect(framing(photo({ face: undefined, focus: "30% 20%" }), 1)).toBe("30% 20%");
  });
  it("zooms an avatar onto the face without showing empty space", () => {
    const s = avatarStyle(photo({ width: 1500, height: 1000, face: [0.3, 0.4] }), 40);
    const [w, h] = s.backgroundSize.split(" ").map(parseFloat);
    const [left, top] = s.backgroundPosition.split(" ").map(parseFloat);
    expect(w).toBeGreaterThanOrEqual(40);
    expect(h).toBeGreaterThanOrEqual(40);
    expect(left).toBeLessThanOrEqual(0);
    expect(top).toBeLessThanOrEqual(0);
    expect(left + w).toBeGreaterThanOrEqual(40);
    expect(top + h).toBeGreaterThanOrEqual(40);
  });
});
