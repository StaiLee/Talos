import { readFile } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { db, documents } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const [document] = await db.select().from(documents).where(eq(documents.id, (await params).id)).limit(1);
  if (!document) return Response.json({ error: "Document introuvable" }, { status: 404 });
  const file = await readFile(document.storagePath);
  return new Response(new Uint8Array(file), { headers: { "content-type": document.mimeType, "content-disposition": `attachment; filename="${document.filename.replace(/"/g, "")}"` } });
}
