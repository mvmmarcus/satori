import { expect, test } from "@playwright/test";
import { moduleQuestions } from "../../lib/content/module";

const Q = moduleQuestions();
const right = (i: number) => Q[i].choices!.find((c) => c.correct)!.label;
const wrong = (i: number) => Q[i].choices!.find((c) => !c.correct)!.label;

test.beforeAll(async ({ request }) => {
  const up = await request.get("/").then((r) => r.ok()).catch(() => false);
  test.skip(!up, "Start the dev server first: npm run dev (http://localhost:3001)");
});

test("take a module, see the replay, open drills", async ({ page }) => {
  await page.goto("/module");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: "Start the module" }).click();

  await expect(page.getByTestId("timer")).toBeVisible();
  await page.getByTestId(`choice-${right(0)}`).click();
  await page.getByTestId("next").click();

  // q2: right, then wrong → second-guess
  await page.getByTestId(`choice-${right(1)}`).click();
  await page.getByTestId(`choice-${wrong(1)}`).click();
  await page.getByTestId("mark-review").click();
  await page.getByTestId("desmos-toggle").click();

  await page.reload(); // state survives a refresh
  await expect(page.getByTestId(`choice-${wrong(1)}`)).toHaveAttribute("aria-checked", "true");

  await page.getByTestId("finish").click();
  await page.getByTestId("confirm-finish").click();

  await expect(page).toHaveURL(/\/replay$/);
  await expect(page.getByTestId("score")).toBeVisible();
  await expect(page.getByTestId("tile-q1")).toHaveAttribute("data-kind", /correct|brilliant/);
  await expect(page.getByTestId("tile-q2")).toHaveAttribute("data-kind", "second-guess");
  await expect(page.getByTestId("scouting-report")).toBeVisible();

  await page.getByTestId("drills-cta").click();
  await expect(page).toHaveURL(/\/drills$/);
  await expect(page.getByTestId("drill-q2")).toBeVisible();
});

test("replay-without-session-redirects", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/replay");
  await expect(page).toHaveURL(/\/\?notice=no-session$/);
  await expect(page.getByRole("status")).toContainText("Finish a module first");
});
