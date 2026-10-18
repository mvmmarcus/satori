import type { NextConfig } from "next";

const dev = process.env.NODE_ENV !== "production";

// Desmos loads its calculator script, fonts and images from desmos.com, runs workers from blob URLs,
// and compiles expressions with new Function(), so it needs 'unsafe-eval' (verified: without it the
// calculator fails to load). This can't be scoped to /module: browsers keep the CSP of the first page
// loaded, and Next.js navigates client-side, so a student arriving via / would get a broken calculator.
// Next.js inlines its bootstrap scripts, hence 'unsafe-inline' (no nonce: pages are static), which
// already makes 'unsafe-eval' a small marginal exposure.
export function buildCsp({ dev, allowEval }: { dev: boolean; allowEval: boolean }): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' https://www.desmos.com${dev || allowEval ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline' https://www.desmos.com",
    "img-src 'self' data: blob: https://*.desmos.com",
    "font-src 'self' data: https://*.desmos.com",
    `connect-src 'self' https://*.desmos.com${dev ? " ws: wss:" : ""}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

const securityHeaders = [
  { key: "Content-Security-Policy", value: buildCsp({ dev, allowEval: true }) },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

if (!dev) {
  for (const [name, why] of [
    ["SESSION_SECRET", "the AI coach will refuse every request"],
    ["NEXT_PUBLIC_DESMOS_KEY", "the calculator falls back to Desmos's demo key, which isn't licensed for production"],
  ]) {
    if (!process.env[name]) console.warn(`⚠ ${name} is not set: ${why}.`);
  }
}

const nextConfig: NextConfig = {
  cacheComponents: true,
  // The floating dev badge sits on top of the module footer (Finish button).
  devIndicators: false,
  partialPrefetching: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
