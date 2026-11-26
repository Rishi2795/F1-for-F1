import { describe, expect, it } from "vitest";
import { timeAgo } from "./timeago";

const NOW = new Date("2026-11-25T12:00:00Z");
describe("timeAgo", () => {
  it("reads naturally at each scale", () => {
    expect(timeAgo("2026-11-25T11:59:40Z", NOW)).toBe("just now");
    expect(timeAgo("2026-11-25T11:55:00Z", NOW)).toBe("5 min ago");
    expect(timeAgo("2026-11-25T09:00:00Z", NOW)).toBe("3 h ago");
    expect(timeAgo("2026-11-24T11:00:00Z", NOW)).toBe("1 day ago");
    expect(timeAgo("2026-11-22T12:00:00Z", NOW)).toBe("3 days ago");
    expect(timeAgo("2026-11-01T12:00:00Z", NOW)).toBe("1 Nov");
  });
  it("never shows a time in the future, and ignores a broken date", () => {
    expect(timeAgo("2026-11-25T13:00:00Z", NOW)).toBe("just now");
    expect(timeAgo("garbage", NOW)).toBe("");
  });
});
