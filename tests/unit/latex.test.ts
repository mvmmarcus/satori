import { expect, test } from "vitest";
import { repairLatex, repairStrings } from "@/lib/ai/latex";

test("restores TeX commands that JSON turned into control characters", () => {
  // "\frac" and "\text" arrive as form-feed + "rac" and tab + "ext" when the model forgets to escape
  expect(repairLatex("choosing $\frac{5}{12}$ shows")).toBe("choosing $\\frac{5}{12}$ shows");
  expect(repairLatex("$\text{SOH}$")).toBe("$\\text{SOH}$");
  expect(repairLatex("$\beta$ and $\nu$")).toBe("$\\beta$ and $\\nu$");
});

test("leaves real newlines outside math alone and correct TeX untouched", () => {
  expect(repairLatex("Line one.\nLine two with $\\sin A$.")).toBe("Line one.\nLine two with $\\sin A$.");
});

test("repairStrings walks nested objects and arrays", () => {
  expect(repairStrings({ a: ["$\frac{1}{2}$"], b: { c: "ok" }, n: 3, z: null })).toEqual({ a: ["$\\frac{1}{2}$"], b: { c: "ok" }, n: 3, z: null });
});
