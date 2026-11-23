import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, requirements } from "@/lib/db";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const status = z.enum(["a_verifier", "conforme", "sous_conditions", "non_conforme"]).parse((await request.json()).status);
    const [updated] = await db.update(requirements).set({ status }).where(eq(requirements.id, (await params).id)).returning();
    return Response.json(updated);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}
