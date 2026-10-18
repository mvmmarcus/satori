export type ProviderName = "anthropic" | "openai";

type Env = Record<string, string | undefined>;

/** Which AI provider to use, or null for offline mode. An explicit choice never silently switches providers. */
export function resolveProvider(env: Env = process.env): ProviderName | null {
  const has = { anthropic: !!env.ANTHROPIC_API_KEY, openai: !!env.OPENAI_API_KEY };
  const wanted = env.AI_PROVIDER?.trim().toLowerCase();
  if (wanted) return wanted === "anthropic" || wanted === "openai" ? (has[wanted] ? wanted : null) : null;
  if (has.anthropic) return "anthropic";
  if (has.openai) return "openai";
  return null;
}
