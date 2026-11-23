import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateObject } from "ai";
import { z } from "zod";
import { aiUsage, db } from "@/lib/db";

type TokenUsage = {
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
  inputTokenDetails?: { cacheReadTokens?: number };
};

export function aiConfigured() {
  return Boolean(process.env.AI_API_KEY && process.env.AI_MODEL && process.env.AI_BASE_URL);
}

async function recordUsage({ usage, operation, tenderId, baseURL, model }: { usage?: TokenUsage; operation: string; tenderId?: string; baseURL: string; model: string }) {
  if (!usage) return;
  const inputTokens = usage.inputTokens ?? 0;
  const outputTokens = usage.outputTokens ?? 0;
  const cachedTokens = usage.cachedInputTokens ?? usage.inputTokenDetails?.cacheReadTokens ?? 0;
  const inputPrice = Number(process.env.AI_INPUT_PRICE_PER_MTOK ?? 0);
  const cachedInputPrice = process.env.AI_CACHED_INPUT_PRICE_PER_MTOK ? Number(process.env.AI_CACHED_INPUT_PRICE_PER_MTOK) : inputPrice * 0.1;
  const outputPrice = Number(process.env.AI_OUTPUT_PRICE_PER_MTOK ?? 0);
  const cost = ((inputTokens - cachedTokens) * inputPrice + cachedTokens * cachedInputPrice + outputTokens * outputPrice) / 1_000_000;
  await db.insert(aiUsage).values({ tenderId, operation, provider: baseURL, model, inputTokens, outputTokens, cachedTokens, costEuros: cost.toFixed(6), currency: process.env.AI_CURRENCY ?? "EUR" });
}

export async function generateStructured<T>({ operation, schema, prompt, tenderId, fast = false, maxOutputTokens = 6_000 }: { operation: string; schema: z.ZodType<T>; prompt: string; tenderId?: string; fast?: boolean; maxOutputTokens?: number }) {
  if (!aiConfigured()) return null;
  const baseURL = process.env.AI_BASE_URL!;
  const provider = createOpenAICompatible({ name: "talos-api", baseURL, apiKey: process.env.AI_API_KEY! });
  const model = fast ? process.env.AI_MODEL_FAST || process.env.AI_MODEL! : process.env.AI_MODEL!;
  const jsonSchema = JSON.stringify(z.toJSONSchema(schema));
  try {
    const result = await generateObject({
      model: provider(model),
      schema,
      prompt: `${prompt}\n\nSchéma JSON obligatoire, avec exactement ces noms et types de champs:\n${jsonSchema}\n\nRéponds uniquement avec un objet JSON valide respectant ce schéma. N'ajoute aucune clé racine comme type ou json_object.`,
      temperature: 0.1,
      maxOutputTokens,
      providerOptions: baseURL.includes("deepseek.com") ? { talosApi: { thinking: { type: "disabled" } } } : undefined,
    });
    await recordUsage({ usage: result.usage, operation, tenderId, baseURL, model });
    return result.object;
  } catch (error) {
    const usage = (error as { usage?: TokenUsage }).usage;
    await recordUsage({ usage, operation: `${operation}_erreur`, tenderId, baseURL, model });
    throw error;
  }
}
