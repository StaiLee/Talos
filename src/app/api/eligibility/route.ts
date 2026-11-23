import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, eligibilityChecks } from "@/lib/db";
import { storageRoot } from "@/modules/documents/storage";
import { checkSfrEligibility } from "@/modules/eligibility/sfr";
import path from "node:path";

const checkSchema = z.object({
  tenderId: z.string().uuid().optional(),
  address: z.string().min(6),
  operator: z.enum(["sfr", "orange", "helios"]),
});

export async function GET(request: Request) {
  const tenderId = new URL(request.url).searchParams.get("tenderId");
  const rows = tenderId ? await db.select().from(eligibilityChecks).where(eq(eligibilityChecks.tenderId, tenderId)).orderBy(desc(eligibilityChecks.createdAt)) : await db.select().from(eligibilityChecks).orderBy(desc(eligibilityChecks.createdAt)).limit(100);
  return Response.json(rows);
}

export async function POST(request: Request) {
  let checkId = "";
  try {
    const input = checkSchema.parse(await request.json());
    const [check] = await db.insert(eligibilityChecks).values(input).returning();
    checkId = check.id;
    if (input.operator !== "sfr") {
      const summary = input.operator === "orange" ? "Connecteur Orange à configurer avec les accès Paritel" : "Helios nécessite l’accès au réseau interne Paritel";
      const [updated] = await db.update(eligibilityChecks).set({ status: "a_configurer", summary, checkedAt: new Date() }).where(eq(eligibilityChecks.id, check.id)).returning();
      return Response.json(updated, { status: 202 });
    }
    const evidencePath = path.join(storageRoot, "eligibility", `${check.id}.png`);
    const result = await checkSfrEligibility(input.address, evidencePath);
    const [updated] = await db.update(eligibilityChecks).set({ ...result, evidencePath, checkedAt: new Date() }).where(eq(eligibilityChecks.id, check.id)).returning();
    return Response.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (checkId) await db.update(eligibilityChecks).set({ status: "erreur", summary: message, checkedAt: new Date() }).where(eq(eligibilityChecks.id, checkId));
    return Response.json({ error: message }, { status: 500 });
  }
}
