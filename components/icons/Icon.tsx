import type { SVGProps } from "react";

const PATHS = {
  check: <path d="M3.5 8.5l3 3 6-7" />,
  spark: <path d="M8 1.8l1.6 4.6 4.6 1.6-4.6 1.6L8 14.2l-1.6-4.6L1.8 8l4.6-1.6z" />,
  cross: <path d="M4 4l8 8M12 4l-8 8" />,
  clock: <><circle cx="8" cy="8" r="6" /><path d="M8 4.8V8l2.2 1.6" /></>,
  undo: <><path d="M4.5 6.5H10a3 3 0 010 6H6.5" /><path d="M6.8 4.2L4.5 6.5l2.3 2.3" /></>,
  calc: <><rect x="3.5" y="1.8" width="9" height="12.4" rx="1.5" /><path d="M5.8 4.8h4.4M6 8.2h.01M8 8.2h.01M10 8.2h.01M6 11h.01M8 11h.01M10 11h.01" /></>,
  question: <><path d="M5.8 6a2.3 2.3 0 114 1.5c-.9.6-1.8 1.1-1.8 2.3" /><path d="M8 12.6h.01" /></>,
  fast: <path d="M2.5 4l4.5 4-4.5 4M8.5 4l4.5 4-4.5 4" />,
  blank: <circle cx="8" cy="8" r="5.5" strokeDasharray="2.2 2.2" />,
  skip: <path d="M3 4l5 4-5 4M11.5 4v8" />,
  chevronLeft: <path d="M10 3.5L5.5 8l4.5 4.5" />,
  chevronRight: <path d="M6 3.5l4.5 4.5L6 12.5" />,
  chevronDown: <path d="M3.5 6l4.5 4.5L12.5 6" />,
  flag: <><path d="M4 14V2.5" /><path d="M4 3h7.5l-1.8 2.8L11.5 8.5H4" /></>,
  eye: <><path d="M1.5 8s2.4-4.5 6.5-4.5S14.5 8 14.5 8 12.1 12.5 8 12.5 1.5 8 1.5 8z" /><circle cx="8" cy="8" r="1.8" /></>,
  eyeOff: <><path d="M2 2l12 12" /><path d="M6.4 3.8A6.6 6.6 0 018 3.5c4.1 0 6.5 4.5 6.5 4.5a11 11 0 01-1.9 2.5M4 5.3A11.3 11.3 0 001.5 8S3.9 12.5 8 12.5a6.2 6.2 0 002.6-.6" /></>,
  strike: <><path d="M2.5 8h11" /><path d="M10.5 4.5c-.6-.7-1.5-1-2.6-1-1.6 0-2.7.8-2.7 2 0 .7.3 1.2 1 1.5M5.5 11.3c.6.8 1.6 1.2 2.8 1.2 1.7 0 2.8-.9 2.8-2.1 0-.4-.1-.8-.3-1.1" /></>,
  arrowRight: <path d="M2.5 8h10.5M9 4l4 4-4 4" />,
  send: <path d="M2.5 8h9M8 4l4 4-4 4" />,
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 16, ...rest }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      {PATHS[name]}
    </svg>
  );
}
