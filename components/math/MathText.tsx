import katex from "katex";
import { Fragment } from "react";

function renderInline(text: string) {
  // Split on $...$; odd indices are math.
  return text.split(/\$([^$]+)\$/g).map((part, i) =>
    i % 2 ? (
      <span key={i} dangerouslySetInnerHTML={{ __html: katex.renderToString(part, { throwOnError: false }) }} />
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

/** Renders text with inline $math$; blank lines become separate paragraphs. */
export function MathText({ text, className, as: Tag = "div" }: { text: string; className?: string; as?: "div" | "span" }) {
  const paras = text.split(/\n{2,}/);
  if (Tag === "span" || paras.length === 1) return <Tag className={className}>{renderInline(text)}</Tag>;
  return (
    <div className={className}>
      {paras.map((p, i) => (
        <p key={i} className="my-2 first:mt-0 last:mb-0">{renderInline(p)}</p>
      ))}
    </div>
  );
}
