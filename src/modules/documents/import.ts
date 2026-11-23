import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db, documents } from "@/lib/db";
import { classifyDocument, detectDocument, storeBuffer } from "./storage";
import { extractDocument } from "./extract";

export async function importDocument(tenderId: string, file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length === 0) throw new Error("Le fichier est vide");
  if (buffer.length > 100 * 1024 * 1024) throw new Error("Le fichier dépasse 100 Mo");
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  const [existing] = await db.select().from(documents).where(and(eq(documents.tenderId, tenderId), eq(documents.sha256, sha256))).limit(1);
  if (existing) return ["extrait", "ocr_effectue"].includes(existing.status) ? existing : extractDocument(existing.id);
  const detected = detectDocument(buffer, file.name);
  const stored = await storeBuffer(tenderId, file.name, buffer);
  const [document] = await db.insert(documents).values({
    tenderId,
    kind: classifyDocument(file.name),
    filename: file.name,
    mimeType: detected.mimeType,
    ...stored,
  }).returning();
  return extractDocument(document.id);
}
