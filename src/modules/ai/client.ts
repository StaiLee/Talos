import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateObject } from "ai";
import type { z } from "zod";
import { aiUsage, db } from "@/lib/db";

export function aiConfigured() {
  return Boolean(process.env.AI_API_KEY && process.env.AI_MODEL && process.env.AI_BASE_URL);
}

export async function generateStructured<T>({ operation, schema, prompt, tenderId, fast = false }: { operation: string; schema: z.ZodType<T>; prompt: string; tenderId?: string; fast?: boolean }) {
  if (!aiConfigured()) return null;
  const provider = createOpenAICompatible({ name: "talos-api", baseURL: process.env.AI_BASE_URL!, apiKey: process.env.AI_API_KEY! });
  const model = fast ? process.env.AI_MODEL_FAST || process.env.AI_MODEL! : process.env.AI_MODEL!;
  const result = await generateObject({ model: provider(model), schema, prompt, temperature: 0.1 });
  const usage = result.usage;
  const inputTokens = usage.inputTokens ?? 0;
  const outputTokens = usage.outputTokens ?? 0;
  const cachedTokens = (usage as typeof usage & { cachedInputTokens?: number }).cachedInputTokens ?? 0;
  const inputPrice = Number(process.env.AI_INPUT_PRICE_PER_MTOK ?? 0);
  const outputPrice = Number(process.env.AI_OUTPUT_PRICE_PER_MTOK ?? 0);
  const cost = ((inputTokens - cachedTokens) * inputPrice + cachedTokens * inputPrice * 0.1 + outputTokens * outputPrice) / 1_000_000;
  await db.insert(aiUsage).values({ tenderId, operation, provider: process.env.AI_BASE_URL!, model, inputTokens, outputTokens, cachedTokens, costEuros: cost.toFixed(6) });
  return result.object;
}
