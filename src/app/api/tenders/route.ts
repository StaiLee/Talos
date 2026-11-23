import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, sources, tenders } from "@/lib/db";
import { detectDomains, relevanceScore } from "@/modules/connectors/relevance";

const createSchema = z.object({
  title: z.string().min(3),
  buyer: z.string().min(2),
  reference: z.string().optional(),
  city: z.string().optional(),
  department: z.string().optional(),
  deadline: z.string().optional(),
  url: z.string().url().optional().or(z.literal("")),
  description: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const input = createSchema.parse(await request.json());
    const [source] = await db.select().from(sources).where(eq(sources.slug, "manuel")).limit(1);
    if (!source) throw new Error("Source manuelle absente");
    const domains = detectDomains(`${input.title} ${input.description ?? ""}`);
    const [created] = await db.insert(tenders).values({
      ...input,
      url: input.url || null,
      deadline: input.deadline ? new Date(input.deadline) : null,
      sourceId: source.id,
      externalId: `MAN-${Date.now()}`,
      domains,
      score: relevanceScore(`${input.title} ${input.description ?? ""}`, domains),
      status: "en_cours",
    }).returning();
    return Response.json(created, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}
