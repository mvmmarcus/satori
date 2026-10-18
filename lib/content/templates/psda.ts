import type { QuestionTemplate } from "@/lib/content/types";
import { defineTemplate, mcq, PAR } from "./helpers";

const pct = (x: number) => `${Math.round(x * 10) / 10}%`;

const percentChange = defineTemplate({
  id: "percent-change", skill: "percent", domain: "psda", difficulty: "easy",
  parSeconds: PAR.easy, desmosFast: false, format: "mcq",
  params: { P: { min: 20, max: 200, step: 10 }, k: { choices: [10, 15, 20, 25, 30, 40, 50] } },
  canonicalParams: { P: 60, k: 25 },
  constraint: ({ P, k }) => (P * k) % 100 === 0,
  render: ({ P, k }) => {
    const N = P + (P * k) / 100;
    return {
      stem: `The price of a jacket increased from ${P} dollars to ${N} dollars. By what percent did the price increase?`,
      choices: mcq(pct(k), [
        [pct(((N - P) / N) * 100), "percent-of-new-not-original"],
        [pct(N - P), "used-difference-as-percent"],
        [pct((N / P) * 100), "reported-new-as-percent-of-old"],
      ]),
      answer: pct(k),
      solution: [
        `Percent change = (change ÷ original) × 100 = $\\frac{${N - P}}{${P}} \\times 100$.`,
        `That is ${pct(k)}.`,
      ],
    };
  },
  check: ({ P, k }) => {
    const N = P * (1 + k / 100);
    return pct((N / P - 1) * 100);
  },
  fallbackNotes: {
    "percent-of-new-not-original": "Percent change is always measured against the original value, not the new one.",
    "used-difference-as-percent": "The dollar change isn't a percent. Divide it by the original price, then multiply by 100.",
    "reported-new-as-percent-of-old": "That's the new price as a percent of the old. The increase is that minus 100%.",
  },
});

const meanMissing = defineTemplate({
  id: "mean-missing", skill: "statistics", domain: "psda", difficulty: "medium",
  parSeconds: PAR.medium, desmosFast: false, format: "spr",
  params: { m: { min: 10, max: 30 }, a: { min: 1, max: 40 }, b: { min: 1, max: 40 }, c: { min: 1, max: 40 }, d: { min: 1, max: 40 } },
  canonicalParams: { m: 18, a: 12, b: 25, c: 9, d: 20 },
  constraint: ({ m, a, b, c, d }) => {
    const x = 5 * m - (a + b + c + d);
    return x > 0 && x < 100;
  },
  render: ({ m, a, b, c, d }) => {
    const sum = a + b + c + d, x = 5 * m - sum;
    return {
      stem: `The mean of five numbers is ${m}. Four of the numbers are ${a}, ${b}, ${c}, and ${d}. What is the fifth number?`,
      answer: String(x),
      solution: [`The five numbers add up to $5 \\times ${m} = ${5 * m}$.`, `The four known numbers add up to ${sum}, so the fifth is $${5 * m} - ${sum} = ${x}$.`],
    };
  },
  check: ({ m, a, b, c, d }) => {
    for (let x = 0; x < 200; x++) if ((a + b + c + d + x) / 5 === m) return String(x);
    return "none";
  },
});

const unitRate = defineTemplate({
  id: "unit-rate", skill: "ratios", domain: "psda", difficulty: "medium",
  parSeconds: PAR.medium, desmosFast: false, format: "spr",
  params: { r: { min: 20, max: 40 }, G: { min: 2, max: 8 }, k: { min: 3, max: 15 } },
  canonicalParams: { r: 32, G: 5, k: 7 },
  constraint: ({ G, k }) => G !== k,
  render: ({ r, G, k }) => ({
    stem: `A car travels ${r * G} miles using ${G} gallons of gasoline. At this rate, how many gallons does the car need to travel ${r * k} miles?`,
    answer: String(k),
    solution: [`Rate: $${r * G} \\div ${G} = ${r}$ miles per gallon.`, `Gallons needed: $${r * k} \\div ${r} = ${k}$.`],
  }),
  check: ({ r, G, k }) => String((r * k * G) / (r * G)),
});

export const PSDA: QuestionTemplate[] = [percentChange, meanMissing, unitRate];
