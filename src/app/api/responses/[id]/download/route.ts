import { readFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db, responses } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const [response] = await db.select().from(responses).where(eq(responses.id, (await params).id)).limit(1);
  if (!response) return Response.json({ error: "Document introuvable" }, { status: 404 });
  const file = await readFile(response.storagePath);
  const mime = path.extname(response.filename) === ".pdf" ? "application/pdf" : path.extname(response.filename) === ".xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return new Response(new Uint8Array(file), { headers: { "content-type": mime, "content-disposition": `attachment; filename="${response.filename.replace(/"/g, "")}"` } });
}
