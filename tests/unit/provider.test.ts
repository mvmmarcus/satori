import { expect, test } from "vitest";
import { resolveProvider } from "@/lib/ai/provider";

test("explicit AI_PROVIDER wins when its key is present", () => {
  expect(resolveProvider({ AI_PROVIDER: "openai", OPENAI_API_KEY: "k", ANTHROPIC_API_KEY: "k" })).toBe("openai");
  expect(resolveProvider({ AI_PROVIDER: "anthropic", OPENAI_API_KEY: "k", ANTHROPIC_API_KEY: "k" })).toBe("anthropic");
});

test("explicit provider without its key is offline, not a silent switch", () => {
  expect(resolveProvider({ AI_PROVIDER: "openai", ANTHROPIC_API_KEY: "k" })).toBeNull();
});

test("without AI_PROVIDER, use whichever key exists (Anthropic first if both)", () => {
  expect(resolveProvider({ OPENAI_API_KEY: "k" })).toBe("openai");
  expect(resolveProvider({ ANTHROPIC_API_KEY: "k" })).toBe("anthropic");
  expect(resolveProvider({ OPENAI_API_KEY: "k", ANTHROPIC_API_KEY: "k" })).toBe("anthropic");
});

test("no keys → offline; unknown provider name → offline", () => {
  expect(resolveProvider({})).toBeNull();
  expect(resolveProvider({ AI_PROVIDER: "gemini", OPENAI_API_KEY: "k" })).toBeNull();
  expect(resolveProvider({ OPENAI_API_KEY: "" })).toBeNull();
});
