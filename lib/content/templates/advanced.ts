import type { QuestionTemplate } from "@/lib/content/types";
import { defineTemplate, mcq, PAR, poly } from "./helpers";

const expEvaluate = defineTemplate({
  id: "exp-evaluate", skill: "exponents", domain: "advanced-math", difficulty: "easy",
  parSeconds: PAR.easy, desmosFast: false, format: "spr",
  params: { a: { min: 2, max: 5 }, b: { choices: [2, 3] }, n: { min: 2, max: 4 } },
  canonicalParams: { a: 3, b: 2, n: 3 },
  render: ({ a, b, n }) => ({
    stem: `The function $f$ is defined by $f(x) = ${a}(${b})^x$. What is the value of $f(${n})$?`,
    answer: String(a * b ** n),
    solution: [`Substitute: $f(${n}) = ${a} \\cdot ${b}^{${n}}$.`, `$${b}^{${n}} = ${b ** n}$, so $f(${n}) = ${a * b ** n}$.`],
  }),
  check: ({ a, b, n }) => {
    let v = a;
    for (let i = 0; i < n; i++) v *= b;
    return String(v);
  },
});

const quadRoots = defineTemplate({
  id: "quad-roots", skill: "quadratics", domain: "advanced-math", difficulty: "medium",
  parSeconds: PAR.medium, desmosFast: true, format: "spr",
  params: { r1: { min: 1, max: 9 }, r2: { min: -9, max: -1 } },
  canonicalParams: { r1: 5, r2: -3 },
  constraint: ({ r1, r2 }) => r1 + r2 !== 0,
  render: ({ r1, r2 }) => {
    const p = -(r1 + r2), q = r1 * r2;
    return {
      stem: `What is the positive solution to $${poly([[1, "x^2"], [p, "x"], [q, ""]])} = 0$?`,
      answer: String(r1),
      solution: [
        `Factor: $(x - ${r1})(x ${r2 < 0 ? "+" : "-"} ${Math.abs(r2)}) = 0$.`,
        `The solutions are $x = ${r1}$ and $x = ${r2}$; the positive one is ${r1}.`,
        `Fast route: graph the quadratic in Desmos and read the positive $x$-intercept.`,
      ],
    };
  },
  check: ({ r1, r2 }) => {
    const p = -(r1 + r2), q = r1 * r2;
    return String((-p + Math.sqrt(p * p - 4 * q)) / 2);
  },
});

const quadVertex = defineTemplate({
  id: "quad-vertex", skill: "quadratics", domain: "advanced-math", difficulty: "medium",
  parSeconds: PAR.medium, desmosFast: true, format: "mcq",
  params: { h: { min: 1, max: 8 }, c: { min: -20, max: 30 } },
  canonicalParams: { h: 3, c: 4 },
  render: ({ h, c }) => ({
    stem: `The function $f$ is defined by $f(x) = ${poly([[1, "x^2"], [-2 * h, "x"], [c, ""]])}$. What is the minimum value of $f(x)$?`,
    choices: mcq(String(c - h * h), [
      [String(h), "reported-x-of-vertex"],
      [String(c), "used-constant-as-minimum"],
      [String(c + h * h), "sign-error"],
    ]),
    answer: String(c - h * h),
    solution: [
      `The vertex is at $x = -\\frac{b}{2a} = ${h}$.`,
      `$f(${h}) = ${h * h} - ${2 * h * h} + ${c} = ${c - h * h}$.`,
      `Fast route: graph $f$ in Desmos and tap the minimum point.`,
    ],
  }),
  check: ({ h, c }) => {
    let best = Infinity;
    for (let x = -50; x <= 50; x++) best = Math.min(best, x * x - 2 * h * x + c);
    return String(best);
  },
  fallbackNotes: {
    "reported-x-of-vertex": "You found where the minimum happens (x) instead of the minimum value (y). Plug x back into f.",
    "used-constant-as-minimum": "The constant is f(0), not the minimum. The minimum is at the vertex, x = −b/2a.",
    "sign-error": "You added h² instead of subtracting it. Evaluate f at the vertex carefully, term by term.",
  },
});

const growth = (r: number) => ((100 + r) / 100).toFixed(2);

const expGrowth = defineTemplate({
  id: "exp-growth", skill: "exponential-models", domain: "advanced-math", difficulty: "medium",
  parSeconds: PAR.medium, desmosFast: false, format: "mcq",
  params: { P: { min: 200, max: 900, step: 50 }, r: { min: 2, max: 9 } },
  canonicalParams: { P: 500, r: 4 },
  render: ({ P, r }) => ({
    stem: `A town had a population of ${P} people in 2020. The population increases by ${r}% each year. Which function gives the population $p(t)$, $t$ years after 2020?`,
    choices: mcq(`$p(t) = ${P}(${growth(r)})^t$`, [
      [`$p(t) = ${P}(0.0${r})^t$`, "used-rate-not-growth-factor"],
      [`$p(t) = ${P}(${1 + r})^t$`, "percent-not-converted"],
      [`$p(t) = ${P} + ${r}t$`, "linear-instead-of-exponential"],
    ]),
    answer: `$p(t) = ${P}(${growth(r)})^t$`,
    solution: [
      `A ${r}% increase multiplies the population by $1 + 0.0${r} = ${growth(r)}$ each year.`,
      `Repeated multiplication gives $p(t) = ${P}(${growth(r)})^t$.`,
    ],
  }),
  check: ({ P, r }) => `$p(t) = ${P}(${(1 + r / 100).toFixed(2)})^t$`,
  fallbackNotes: {
    "used-rate-not-growth-factor": "Multiplying by 0.0r shrinks the population. Growth by r% means multiplying by 1 + r/100.",
    "percent-not-converted": "Convert the percent to a decimal first: r% is r/100, so the factor is 1 + r/100.",
    "linear-instead-of-exponential": "A percent change each year compounds, so the model is exponential, not linear.",
  },
});

const funcComposition = defineTemplate({
  id: "func-composition", skill: "functions", domain: "advanced-math", difficulty: "medium",
  parSeconds: PAR.medium, desmosFast: false, format: "mcq",
  params: { a: { min: 2, max: 5 }, b: { min: -6, max: 6 }, c: { min: 1, max: 9 }, n: { min: 2, max: 4 } },
  canonicalParams: { a: 3, b: 2, c: 5, n: 3 },
  render: ({ a, b, c, n }) => {
    const f = (x: number) => a * x + b, g = (x: number) => x * x - c;
    return {
      stem: `The functions $f$ and $g$ are defined by $f(x) = ${poly([[a, "x"], [b, ""]])}$ and $g(x) = ${poly([[1, "x^2"], [-c, ""]])}$. What is the value of $f(g(${n}))$?`,
      choices: mcq(String(f(g(n))), [
        [String(g(f(n))), "composed-in-wrong-order"],
        [String(f(n) * g(n)), "multiplied-functions"],
        [String(f(n) + g(n)), "added-functions"],
      ]),
      answer: String(f(g(n))),
      solution: [`Work inside out: $g(${n}) = ${n * n} - ${c} = ${g(n)}$.`, `Then $f(${g(n)}) = ${a}(${g(n)}) ${b < 0 ? "-" : "+"} ${Math.abs(b)} = ${f(g(n))}$.`],
    };
  },
  check: ({ a, b, c, n }) => String(a * n * n - a * c + b),
  fallbackNotes: {
    "composed-in-wrong-order": "f(g(n)) means apply g first, then f. Work from the inside out.",
    "multiplied-functions": "Composition is not multiplication. Feed the output of g into f.",
    "added-functions": "Composition is not addition. Compute g(n), then use that number as the input to f.",
  },
});

const quadDiscriminant = defineTemplate({
  id: "quad-discriminant", skill: "quadratics", domain: "advanced-math", difficulty: "hard",
  parSeconds: PAR.hard, desmosFast: true, format: "mcq",
  params: { s: { min: 2, max: 9 } },
  canonicalParams: { s: 5 },
  render: ({ s }) => ({
    stem: `In the equation $x^2 + kx + ${s * s} = 0$, $k$ is a positive constant. If the equation has exactly one real solution, what is the value of $k$?`,
    choices: mcq(String(2 * s), [
      [String(s), "forgot-factor-of-2"],
      [String(4 * s * s), "forgot-square-root"],
      [String(s * s), "used-constant-term"],
    ]),
    answer: String(2 * s),
    solution: [
      `Exactly one real solution means the discriminant is zero: $k^2 - 4(${s * s}) = 0$.`,
      `$k^2 = ${4 * s * s}$, and $k > 0$, so $k = ${2 * s}$.`,
      `Fast route: graph $y = x^2 + kx + ${s * s}$ with a slider for $k$ and find where it just touches the x-axis.`,
    ],
  }),
  check: ({ s }) => String(Math.sqrt(4 * s * s)),
  fallbackNotes: {
    "forgot-factor-of-2": "From k² = 4c, k = 2√c. You dropped the 2 when taking the square root.",
    "forgot-square-root": "You solved for k² but reported it as k. Take the square root at the end.",
    "used-constant-term": "The constant term is c, not k. Set the discriminant b² − 4ac to zero and solve for b.",
  },
});

const polyRemainder = defineTemplate({
  id: "poly-remainder", skill: "polynomials", domain: "advanced-math", difficulty: "hard",
  parSeconds: PAR.hard, desmosFast: false, format: "mcq",
  params: { a: { min: -5, max: 5 }, b: { min: -9, max: 9 }, c: { min: -9, max: 9 }, r: { min: 1, max: 3 } },
  canonicalParams: { a: -2, b: 3, c: 4, r: 2 },
  constraint: ({ c }) => c !== 0,
  render: ({ a, b, c, r }) => {
    const p = (x: number) => x ** 3 + a * x * x + b * x + c;
    return {
      stem: `The polynomial $p(x) = ${poly([[1, "x^3"], [a, "x^2"], [b, "x"], [c, ""]])}$ is divided by $x - ${r}$. What is the remainder?`,
      choices: mcq(String(p(r)), [
        [String(p(-r)), "sign-error-in-root"],
        [String(c), "used-constant-term"],
        [String(p(r) - c), "dropped-constant"],
      ]),
      answer: String(p(r)),
      solution: [`By the Remainder Theorem, the remainder when dividing by $x - ${r}$ is $p(${r})$.`, `$p(${r}) = ${r ** 3} ${a < 0 ? "-" : "+"} ${Math.abs(a * r * r)} ${b < 0 ? "-" : "+"} ${Math.abs(b * r)} ${c < 0 ? "-" : "+"} ${Math.abs(c)} = ${p(r)}$.`],
    };
  },
  check: ({ a, b, c, r }) => {
    // Synthetic division: the last carried value is the remainder.
    let acc = 0;
    for (const coef of [1, a, b, c]) acc = acc * r + coef;
    return String(acc);
  },
  fallbackNotes: {
    "sign-error-in-root": "Dividing by x − r means plugging in +r, not −r. The root of x − r is r.",
    "used-constant-term": "The constant term is p(0). The remainder for x − r is p(r).",
    "dropped-constant": "You evaluated p(r) but left off the constant term. Include every term.",
  },
});

const radicalEq = defineTemplate({
  id: "radical-eq", skill: "radicals", domain: "advanced-math", difficulty: "hard",
  parSeconds: PAR.hard, desmosFast: true, format: "mcq",
  params: { t: { min: 2, max: 6 }, b: { min: 0, max: 4 } },
  canonicalParams: { t: 4, b: 1 },
  constraint: ({ t, b }) => t > b + 1 && t * t - t - b !== 0,
  render: ({ t, b }) => {
    const a = t * t - t - b, s = t + b, e = 2 * b + 1 - s;
    return {
      stem: `What is the solution to the equation $\\sqrt{${poly([[1, "x"], [a, ""]])}} = ${poly([[1, "x"], [-b, ""]])}$?`,
      choices: mcq(`$x = ${s}$`, [
        [`$x = ${e}$`, "picked-extraneous-root"],
        [`$x = ${s}$ and $x = ${e}$`, "did-not-check-extraneous"],
        [`$x = ${-a}$`, "set-radicand-to-zero"],
      ]),
      answer: `$x = ${s}$`,
      solution: [
        `Square both sides: $x + ${a} = (x - ${b})^2$, which gives $x = ${s}$ or $x = ${e}$.`,
        `Check: at $x = ${e}$ the right side is $${e - b} < 0$, but a square root can't be negative, so $x = ${e}$ is extraneous.`,
        `Fast route: graph both sides in Desmos; they cross only at $x = ${s}$.`,
      ],
    };
  },
  check: ({ t, b }) => {
    const a = t * t - t - b;
    for (let x = -50; x <= 50; x++) if (x + a >= 0 && x - b >= 0 && Math.sqrt(x + a) === x - b) return `$x = ${x}$`;
    return "none";
  },
  fallbackNotes: {
    "picked-extraneous-root": "Squaring can create fake solutions. Plug each candidate into the original equation.",
    "did-not-check-extraneous": "Both candidates came from squaring, but only one works in the original. Always check.",
    "set-radicand-to-zero": "Setting the inside of the root to zero doesn't solve the equation. Square both sides and solve.",
  },
});

export const ADVANCED: QuestionTemplate[] = [
  expEvaluate, quadRoots, quadVertex, expGrowth, funcComposition, quadDiscriminant, polyRemainder, radicalEq,
];
