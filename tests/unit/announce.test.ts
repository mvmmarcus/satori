import { expect, test } from "vitest";
import { timeAnnouncement } from "@/lib/module/announce";

test("announces only at a few thresholds, so screen readers aren't flooded", () => {
  expect(timeAnnouncement(20 * 60_000)).toBeNull();
  expect(timeAnnouncement(4 * 60_000 + 59_000)).toBe("5 minutes left");
  expect(timeAnnouncement(2 * 60_000)).toBe("5 minutes left");
  expect(timeAnnouncement(59_000)).toBe("1 minute left");
  expect(timeAnnouncement(29_000)).toBe("30 seconds left");
  // same bucket → same string, so the live region text doesn't change every second
  expect(timeAnnouncement(3 * 60_000)).toBe(timeAnnouncement(3 * 60_000 - 1000));
});
