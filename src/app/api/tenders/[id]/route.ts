import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, tenders } from "@/lib/db";

const updateSchema = z.object({
  status: z.string().optional(),
  goDecision: z.enum(["a_evaluer", "go", "sous_conditions", "no_go"]).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const input = updateSchema.parse(await request.json());
    const [updated] = await db.update(tenders).set({ ...input, updatedAt: new Date() }).where(eq(tenders.id, (await params).id)).returning();
    if (!updated) return Response.json({ error: "AO introuvable" }, { status: 404 });
    return Response.json(updated);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}
