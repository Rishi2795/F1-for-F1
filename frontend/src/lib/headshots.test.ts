import { describe, expect, it } from "vitest";
import { portrait } from "./headshots";

const URL1 = "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers/L/LANNOR01_Lando_Norris/lannor01.png.transform/1col/image.png";

describe("portrait", () => {
  it("asks F1 for the size we need", () => {
    expect(portrait(URL1, 4)).toContain("/4col/image.png");
    expect(portrait(URL1, 2)).toContain("/2col/");
    expect(portrait(URL1, 6)).toContain("/6col/");
  });
  it("drops F1's instruction to serve a silhouette for a missing portrait", () => {
    expect(portrait(URL1, 4)).not.toContain("d_driver_fallback_image");
    expect(portrait(URL1, 4)).toBe("https://media.formula1.com/content/dam/fom-website/drivers/L/LANNOR01_Lando_Norris/lannor01.png.transform/4col/image.png");
  });
  it("also accepts F1's older portraits, which are served from www.formula1.com", () => {
    const old = "https://www.formula1.com/content/dam/fom-website/drivers/N/NYCDEV01_Nyck_De%20Vries/nycdev01.png.transform/1col/image.png";
    expect(portrait(old, 4)).toBe(old.replace("/1col/", "/4col/"));
    expect(portrait(old.replace("www.formula1.com", "www.formula1.com.evil.example"), 4)).toBeNull();
  });
  it("never returns a link that is not an https png on F1's media host", () => {
    expect(portrait(URL1.replace("https:", "http:"), 4)).toBeNull();
    expect(portrait(URL1.replace("media.formula1.com", "example.com"), 4)).toBeNull();
    expect(portrait("https://media.formula1.com.example.com/x.png", 4)).toBeNull();
    expect(portrait("javascript:alert(1)", 4)).toBeNull();
    expect(portrait("https://media.formula1.com/x.svg", 4)).toBeNull();
    expect(portrait(null, 4)).toBeNull();
    expect(portrait("not a url", 4)).toBeNull();
  });
});
