import { and, eq, gte } from "drizzle-orm";
import { aiUsage, db } from "@/lib/db";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const tenderId = params.get("tenderId");
  const since = new Date(params.get("since") ?? "");
  if (!tenderId || Number.isNaN(since.getTime())) return Response.json({ error: "Paramètres tenderId et since requis" }, { status: 400 });
  const rows = await db.select().from(aiUsage).where(and(eq(aiUsage.tenderId, tenderId), gte(aiUsage.createdAt, since)));
  const costs: Record<string, number> = {};
  for (const row of rows) costs[row.currency] = (costs[row.currency] ?? 0) + Number(row.costEuros);
  return Response.json({
    calls: rows.length,
    inputTokens: rows.reduce((sum, row) => sum + row.inputTokens, 0),
    outputTokens: rows.reduce((sum, row) => sum + row.outputTokens, 0),
    cachedTokens: rows.reduce((sum, row) => sum + row.cachedTokens, 0),
    costs,
    model: rows.at(-1)?.model ?? null,
  });
}
