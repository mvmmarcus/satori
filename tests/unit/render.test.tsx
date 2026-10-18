import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { ScoutingReport } from "@/components/replay/ScoutingReport";
import { CoachNoteText } from "@/components/replay/CoachNoteText";

const noop = () => {};

test("scouting report renders model math with KaTeX, not raw dollars", () => {
  const html = renderToStaticMarkup(
    <ScoutingReport
      loading={false}
      onFocus={noop}
      onPick={noop}
      data={{ headline: "Watch $x^2$", patterns: [{ title: "Signs", questionIds: ["q9"], explanation: "Solve $x = 5$" }], habits: ["Check $2x$", "b", "c"] }}
    />,
  );
  expect(html).toContain("katex");
  expect(html).not.toContain("$x");
});

test("coach note renders math with KaTeX", () => {
  const html = renderToStaticMarkup(<CoachNoteText text="You wrote $x = 3$." />);
  expect(html).toContain("katex");
  expect(html).not.toContain("$x");
});
