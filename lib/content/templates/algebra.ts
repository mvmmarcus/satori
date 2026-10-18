import type { QuestionTemplate } from "@/lib/content/types";
import { defineTemplate, frac, mcq, PAR, poly } from "./helpers";

const linSolve = defineTemplate({
  id: "lin-solve", skill: "linear-equations", domain: "algebra", difficulty: "easy",
  parSeconds: PAR.easy, desmosFast: false, format: "mcq",
  params: { a: { min: 2, max: 9 }, x: { min: 2, max: 12 }, b: { min: 1, max: 20 } },
  canonicalParams: { a: 4, x: 7, b: 9 },
  render: ({ a, x, b }) => {
    const c = a * x + b;
    return {
      stem: `If $${a}x + ${b} = ${c}$, what is the value of $x$?`,
      choices: mcq(String(x), [
        [frac(c + b, a), "sign-error"],
        [String(c - b), "forgot-to-divide"],
        [frac(c - a * b, a), "divided-before-subtracting"],
      ]),
      answer: String(x),
      solution: [`Subtract ${b} from both sides: $${a}x = ${c - b}$.`, `Divide both sides by ${a}: $x = ${x}$.`],
    };
  },
  check: ({ a, x, b }) => {
    const c = a * x + b;
    for (let v = -100; v <= 100; v++) if (a * v + b === c) return String(v);
    return "none";
  },
  fallbackNotes: {
    "sign-error": "You added the constant instead of subtracting it. Undo +b with −b on both sides before dividing.",
    "forgot-to-divide": "You isolated the x-term but stopped there. The question asks for x, so finish by dividing by the coefficient.",
    "divided-before-subtracting": "You divided only part of the equation. Move the constant first, then divide the whole side.",
  },
});

const slopeTwoPoints = defineTemplate({
  id: "slope-two-points", skill: "linear-functions", domain: "algebra", difficulty: "easy",
  parSeconds: PAR.easy, desmosFast: false, format: "mcq",
  params: {
    x1: { min: -5, max: 5 }, dx: { min: 1, max: 6 },
    m: { choices: [-4, -3, -2, -1, 1, 2, 3, 4] }, y1: { min: -6, max: 6 },
  },
  canonicalParams: { x1: 1, dx: 2, m: 3, y1: -2 },
  constraint: ({ x1, dx }) => 2 * x1 + dx !== 0,
  render: ({ x1, dx, m, y1 }) => {
    const x2 = x1 + dx, y2 = y1 + m * dx;
    return {
      stem: `A line in the $xy$-plane passes through the points $(${x1}, ${y1})$ and $(${x2}, ${y2})$. What is the slope of the line?`,
      choices: mcq(String(m), [
        [frac(dx, m * dx), "inverted-rise-run"],
        [String(-m), "subtracted-in-opposite-order"],
        [frac(y1 + y2, x1 + x2), "added-coordinates"],
      ]),
      answer: String(m),
      solution: [
        `Slope = (change in $y$) / (change in $x$) = $\\frac{${y2} - (${y1})}{${x2} - (${x1})}$.`,
        `That is $\\frac{${y2 - y1}}{${dx}} = ${m}$.`,
      ],
    };
  },
  check: ({ x1, dx, m, y1 }) => frac(y1 - (y1 + m * dx), x1 - (x1 + dx)),
  fallbackNotes: {
    "inverted-rise-run": "You put the change in x on top. Slope is rise over run: change in y divided by change in x.",
    "subtracted-in-opposite-order": "You subtracted the y-values in one order and the x-values in the other. Keep the same point first in both.",
    "added-coordinates": "You added coordinates instead of subtracting them. Slope measures a change, so it uses differences.",
  },
});

const linWordCost = defineTemplate({
  id: "lin-word-cost", skill: "linear-models", domain: "algebra", difficulty: "easy",
  parSeconds: PAR.easy, desmosFast: false, format: "mcq",
  params: { F: { min: 20, max: 90, step: 5 }, r: { min: 15, max: 60, step: 5 } },
  canonicalParams: { F: 40, r: 25 },
  constraint: ({ F, r }) => F !== r,
  render: ({ F, r }) => ({
    stem: `A gym charges a one-time sign-up fee of ${F} dollars plus ${r} dollars per month. Which equation gives the total cost $C$, in dollars, of a membership for $m$ months?`,
    choices: mcq(`$C = ${r}m + ${F}$`, [
      [`$C = ${F}m + ${r}$`, "swapped-rate-and-fixed"],
      [`$C = ${r + F}m$`, "fee-charged-every-month"],
      [`$C = ${r}m - ${F}$`, "subtracted-fixed-fee"],
    ]),
    answer: `$C = ${r}m + ${F}$`,
    solution: [
      `The monthly charge grows with $m$, so it is the rate: $${r}m$.`,
      `The sign-up fee is paid once, so it is the constant: $C = ${r}m + ${F}$.`,
    ],
  }),
  check: ({ F, r }) => `$C = ${r}m + ${F}$`,
  fallbackNotes: {
    "swapped-rate-and-fixed": "You swapped the roles. Whatever repeats each month multiplies m; the one-time fee is the constant.",
    "fee-charged-every-month": "You charged the sign-up fee every month. A one-time fee is added once, not multiplied by m.",
    "subtracted-fixed-fee": "The fee adds to the cost. Read the sign of each piece from the story before writing the equation.",
  },
});

function sysTerms(a: number, b: number) {
  return poly([[a, "x"], [b, ""]]);
}

const systemSubstitution = defineTemplate({
  id: "system-substitution", skill: "systems", domain: "algebra", difficulty: "medium",
  parSeconds: PAR.medium, desmosFast: true, format: "mcq",
  params: { x0: { min: -6, max: 6 }, a: { min: 1, max: 5 }, c: { min: -5, max: -1 }, b: { min: -9, max: 9 } },
  canonicalParams: { x0: 3, a: 2, c: -1, b: -4 },
  constraint: ({ x0, a, c, b }) => a + c !== 0 && a * x0 + b !== x0,
  render: ({ x0, a, c, b }) => {
    const d = (a - c) * x0 + b, y0 = a * x0 + b;
    return {
      stem: `$y = ${sysTerms(a, b)}$\n\n$y = ${sysTerms(c, d)}$\n\nThe solution to the system of equations above is $(x, y)$. What is the value of $x$?`,
      choices: mcq(String(x0), [
        [String(y0), "reported-y-instead-of-x"],
        [frac(d + b, a - c), "sign-error"],
        [frac(d - b, a + c), "added-slopes"],
      ]),
      answer: String(x0),
      solution: [
        `Set the right sides equal: $${sysTerms(a, b)} = ${sysTerms(c, d)}$.`,
        `Collect terms: $${a - c}x = ${d - b}$, so $x = ${x0}$.`,
        `Fast route: graph both lines in Desmos and read the $x$-coordinate of the intersection.`,
      ],
    };
  },
  check: ({ x0, a, c, b }) => {
    const d = (a - c) * x0 + b;
    for (let v = -100; v <= 100; v++) if (a * v + b === c * v + d) return String(v);
    return "none";
  },
  fallbackNotes: {
    "reported-y-instead-of-x": "You solved the system but reported y. Re-read what the question asks for before choosing.",
    "sign-error": "A sign slipped when you moved the constant across. Write the subtraction step out explicitly.",
    "added-slopes": "You added the x-coefficients instead of subtracting them when you combined the equations.",
  },
});

const linInequality = defineTemplate({
  id: "lin-inequality", skill: "inequalities", domain: "algebra", difficulty: "medium",
  parSeconds: PAR.medium, desmosFast: false, format: "mcq",
  params: { a: { min: 2, max: 6 }, k: { min: -8, max: 8 }, c: { min: -10, max: 10 } },
  canonicalParams: { a: 3, k: 4, c: 2 },
  constraint: ({ k }) => k !== 0,
  render: ({ a, k, c }) => {
    const b = c + a * k;
    return {
      stem: `Which of the following describes all solutions to $${poly([[-a, "x"], [b, ""]])} \\le ${c}$?`,
      choices: mcq(`$x \\ge ${k}$`, [
        [`$x \\le ${k}$`, "forgot-to-flip-inequality"],
        [`$x \\ge ${-k}$`, "sign-error"],
        [`$x \\le ${-k}$`, "flip-and-sign-error"],
      ]),
      answer: `$x \\ge ${k}$`,
      solution: [
        `Subtract ${b}: $${-a}x \\le ${c - b}$.`,
        `Divide by ${-a} and flip the inequality because you divided by a negative: $x \\ge ${k}$.`,
      ],
    };
  },
  check: ({ a, k, c }) => {
    const b = c + a * k;
    const ok = (x: number) => -a * x + b <= c;
    return ok(k) && ok(k + 1) && !ok(k - 1) ? `$x \\ge ${k}$` : "unexpected";
  },
  fallbackNotes: {
    "forgot-to-flip-inequality": "Dividing by a negative number flips the inequality sign. Test one value to confirm the direction.",
    "sign-error": "The boundary value has the wrong sign. Recheck the subtraction before you divide.",
    "flip-and-sign-error": "Two slips: the boundary's sign and the direction. Plug a test value back in to catch both.",
  },
});

const interpretSlope = defineTemplate({
  id: "interpret-slope", skill: "linear-models", domain: "algebra", difficulty: "medium",
  parSeconds: PAR.medium, desmosFast: false, format: "mcq",
  params: { r: { min: 12, max: 40 }, s: { min: 50, max: 300, step: 10 } },
  canonicalParams: { r: 18, s: 120 },
  constraint: ({ r, s }) => r !== s,
  render: ({ r, s }) => ({
    stem: `The equation $P = ${r}t + ${s}$ gives the total number of pages $P$ a printer has printed $t$ minutes after a counter is checked. What is the best interpretation of ${r} in this context?`,
    choices: mcq(`The printer prints ${r} pages per minute.`, [
      [`The counter showed ${r} pages when it was checked.`, "confused-slope-and-intercept"],
      [`The printer prints ${s} pages per minute.`, "used-intercept-as-rate"],
      [`It takes the printer ${r} minutes to print one page.`, "inverted-rate"],
    ]),
    answer: `The printer prints ${r} pages per minute.`,
    solution: [
      `${r} multiplies $t$, so it is the change in $P$ per one-minute increase in $t$.`,
      `${s} is the value when $t = 0$: the count when it was checked.`,
    ],
  }),
  check: ({ r }) => `The printer prints ${r} pages per minute.`,
  fallbackNotes: {
    "confused-slope-and-intercept": "The number multiplying t is a rate; the standalone number is the starting value.",
    "used-intercept-as-rate": "You picked the starting value as the rate. The rate is the coefficient of t.",
    "inverted-rate": "Units tell you the direction: pages per minute, not minutes per page. Check units on the slope.",
  },
});

const systemNoSolution = defineTemplate({
  id: "system-no-solution", skill: "systems", domain: "algebra", difficulty: "hard",
  parSeconds: PAR.hard, desmosFast: false, format: "spr",
  params: { a: { min: 1, max: 9 }, b: { choices: [2, 3, 5] }, t: { min: 2, max: 5 }, c: { min: 1, max: 20 }, e: { min: 1, max: 9 } },
  canonicalParams: { a: 3, b: 2, t: 3, c: 7, e: 4 },
  render: ({ a, b, t, c, e }) => {
    const m = b * t, d = c * t + e;
    return {
      stem: `$${poly([[a, "x"], [b, "y"]])} = ${c}$\n\n$kx + ${m}y = ${d}$\n\nIn the system of equations above, $k$ is a constant. If the system has no solution, what is the value of $k$?`,
      answer: String(a * t),
      solution: [
        `No solution means the lines are parallel but different: the coefficients are proportional, the constants are not.`,
        `The $y$-coefficients have ratio $${m} / ${b} = ${t}$, so $k = ${a} \\cdot ${t} = ${a * t}$.`,
        `Check: $${c} \\cdot ${t} = ${c * t} \\ne ${d}$, so the lines are distinct.`,
      ],
    };
  },
  check: ({ a, b, t }) => frac(a * b * t, b),
});

const linInfinite = defineTemplate({
  id: "lin-infinite-solutions", skill: "linear-equations", domain: "algebra", difficulty: "hard",
  parSeconds: PAR.hard, desmosFast: false, format: "spr",
  params: { a: { min: 2, max: 9 }, b: { min: 2, max: 9 }, c: { min: 1, max: 9 } },
  canonicalParams: { a: 4, b: 3, c: 5 },
  render: ({ a, b, c }) => ({
    stem: `$${a}(x - ${b}) + ${c}x = kx - ${a * b}$\n\nIn the equation above, $k$ is a constant. If the equation has infinitely many solutions, what is the value of $k$?`,
    answer: String(a + c),
    solution: [
      `Expand the left side: $${a}x - ${a * b} + ${c}x = ${a + c}x - ${a * b}$.`,
      `Infinitely many solutions means both sides are identical, so $k = ${a + c}$.`,
    ],
  }),
  check: ({ a, b, c }) => {
    const left = (x: number) => a * (x - b) + c * x;
    return String(left(1) - left(0));
  },
});

export const ALGEBRA: QuestionTemplate[] = [
  linSolve, slopeTwoPoints, linWordCost, systemSubstitution,
  linInequality, interpretSlope, systemNoSolution, linInfinite,
];
