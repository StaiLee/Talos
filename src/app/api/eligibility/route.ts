import { desc, eq } from "drizzle-orm";
import path from "node:path";
import { z } from "zod";
import { db, eligibilityChecks } from "@/lib/db";
import { storageRoot } from "@/modules/documents/storage";
import { checkSfrEligibility } from "@/modules/eligibility/sfr";

const checkSchema = z.object({
  tenderId: z.string().uuid().optional(),
  address: z.string().min(6),
  operator: z.enum(["sfr", "orange", "helios"]),
});

type CheckInput = z.infer<typeof checkSchema>;

async function runCheck(id: string, input: CheckInput) {
  try {
    if (input.operator !== "sfr") {
      const summary = input.operator === "orange" ? "Connecteur Orange à configurer avec les accès Paritel" : "Helios nécessite l’accès au réseau interne Paritel";
      await db.update(eligibilityChecks).set({ status: "a_configurer", summary, checkedAt: new Date() }).where(eq(eligibilityChecks.id, id));
      return;
    }
    const evidencePath = path.join(storageRoot, "eligibility", `${id}.png`);
    const result = await checkSfrEligibility(input.address, evidencePath);
    await db.update(eligibilityChecks).set({ ...result, evidencePath, checkedAt: new Date() }).where(eq(eligibilityChecks.id, id));
  } catch (error) {
    await db.update(eligibilityChecks).set({ status: "erreur", summary: error instanceof Error ? error.message : String(error), checkedAt: new Date() }).where(eq(eligibilityChecks.id, id));
  }
}

export async function GET(request: Request) {
  const tenderId = new URL(request.url).searchParams.get("tenderId");
  const rows = tenderId ? await db.select().from(eligibilityChecks).where(eq(eligibilityChecks.tenderId, tenderId)).orderBy(desc(eligibilityChecks.createdAt)) : await db.select().from(eligibilityChecks).orderBy(desc(eligibilityChecks.createdAt)).limit(100);
  return Response.json(rows);
}

export async function POST(request: Request) {
  try {
    const input = checkSchema.parse(await request.json());
    const [check] = await db.insert(eligibilityChecks).values(input).returning();
    setImmediate(() => { void runCheck(check.id, input); });
    return Response.json(check, { status: 202 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}
