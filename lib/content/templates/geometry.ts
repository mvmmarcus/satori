import type { QuestionTemplate } from "@/lib/content/types";
import { defineTemplate, mcq, PAR, poly, texFrac } from "./helpers";

const rectScaleArea = defineTemplate({
  id: "rect-scale-area", skill: "area-scaling", domain: "geometry-trig", difficulty: "easy",
  parSeconds: PAR.easy, desmosFast: false, format: "mcq",
  params: { L: { min: 3, max: 12 }, W: { min: 2, max: 10 }, k: { min: 2, max: 4 } },
  canonicalParams: { L: 6, W: 4, k: 3 },
  render: ({ L, W, k }) => ({
    stem: `A rectangle has length ${L} centimeters and width ${W} centimeters. A new rectangle is made by multiplying the length and the width by ${k}. What is the area, in square centimeters, of the new rectangle?`,
    choices: mcq(String(k * k * L * W), [
      [String(k * L * W), "scaled-area-linearly"],
      [String(2 * (k * L + k * W)), "computed-perimeter"],
      [String((L + k) * (W + k)), "added-instead-of-multiplied"],
    ]),
    answer: String(k * k * L * W),
    solution: [`New dimensions: $${k * L}$ by $${k * W}$.`, `Area $= ${k * L} \\times ${k * W} = ${k * k * L * W}$, which is $${k}^2 = ${k * k}$ times the original.`],
  }),
  check: ({ L, W, k }) => String(L * k * (W * k)),
  fallbackNotes: {
    "scaled-area-linearly": "Scaling both sides by k scales the area by k², not k. Both dimensions grow.",
    "computed-perimeter": "That's the perimeter. Area multiplies length by width.",
    "added-instead-of-multiplied": "The dimensions were multiplied by k, not increased by k. Re-read the operation in the stem.",
  },
});

const TRIPLES = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25]];

const rightTriTrig = defineTemplate({
  id: "right-tri-trig", skill: "trigonometry", domain: "geometry-trig", difficulty: "medium",
  parSeconds: PAR.medium, desmosFast: false, format: "mcq",
  params: { i: { min: 0, max: 3 }, s: { min: 1, max: 3 }, swap: { min: 0, max: 1 } },
  canonicalParams: { i: 1, s: 1, swap: 0 },
  render: ({ i, s, swap }) => {
    const [p, q, h] = TRIPLES[i];
    const [a, b] = swap ? [q * s, p * s] : [p * s, q * s];
    const c = h * s;
    return {
      stem: `In right triangle $ABC$, angle $C$ is a right angle, $BC = ${a}$, $AC = ${b}$, and $AB = ${c}$. What is the value of $\\sin A$?`,
      choices: mcq(`$${texFrac(a, c)}$`, [
        [`$${texFrac(b, c)}$`, "used-cosine"],
        [`$${texFrac(a, b)}$`, "used-tangent"],
        [`$${texFrac(c, a)}$`, "inverted-ratio"],
      ]),
      answer: `$${texFrac(a, c)}$`,
      solution: [`$\\sin A = \\frac{\\text{opposite}}{\\text{hypotenuse}}$. The side opposite $A$ is $BC = ${a}$.`, `$\\sin A = \\frac{${a}}{${c}} = ${texFrac(a, c)}$.`],
    };
  },
  check: ({ i, swap }) => {
    const [p, q, h] = TRIPLES[i];
    return `$\\frac{${swap ? q : p}}{${h}}$`;
  },
  fallbackNotes: {
    "used-cosine": "That's the adjacent side over the hypotenuse, which is cosine. Sine uses the opposite side.",
    "used-tangent": "That's opposite over adjacent, which is tangent. Sine divides by the hypotenuse.",
    "inverted-ratio": "Sine is opposite over hypotenuse; you flipped it. Sine of an acute angle is always less than 1.",
  },
});

const circleRadius = defineTemplate({
  id: "circle-radius", skill: "circles", domain: "geometry-trig", difficulty: "hard",
  parSeconds: PAR.hard, desmosFast: true, format: "mcq",
  params: { h: { min: -5, max: 5 }, k: { min: -5, max: 5 }, r: { min: 3, max: 9 } },
  canonicalParams: { h: 2, k: -3, r: 5 },
  constraint: ({ h, k, r }) => h !== 0 && k !== 0 && r * r > h * h + k * k,
  render: ({ h, k, r }) => {
    const D = -2 * h, E = -2 * k, F = h * h + k * k - r * r;
    return {
      stem: `The equation of a circle in the $xy$-plane is $${poly([[1, "x^2"], [D, "x"], [1, "y^2"], [E, "y"], [F, ""]])} = 0$. What is the radius of the circle?`,
      choices: mcq(String(r), [
        [String(r * r), "forgot-square-root"],
        [String(2 * r), "used-diameter"],
        [`$\\sqrt{${-F}}$`, "forgot-completing-square-constants"],
      ]),
      answer: String(r),
      solution: [
        `Complete the square: $(x ${h < 0 ? "+" : "-"} ${Math.abs(h)})^2 + (y ${k < 0 ? "+" : "-"} ${Math.abs(k)})^2 = ${-F} + ${h * h} + ${k * k} = ${r * r}$.`,
        `The radius is $\\sqrt{${r * r}} = ${r}$.`,
        `Fast route: type the equation into Desmos and read the circle's size from the grid.`,
      ],
    };
  },
  check: ({ h, k, r }) => {
    const D = -2 * h, E = -2 * k, F = h * h + k * k - r * r;
    return String(Math.sqrt((D * D) / 4 + (E * E) / 4 - F));
  },
  fallbackNotes: {
    "forgot-square-root": "The right side after completing the square is r², not r. Take the square root.",
    "used-diameter": "The question asks for the radius, half the diameter. Re-read what's being asked.",
    "forgot-completing-square-constants": "When you complete the square you add h² and k² to both sides. Don't leave them out.",
  },
});

export const GEOMETRY: QuestionTemplate[] = [rectScaleArea, rightTriTrig, circleRadius];
