import { eq } from "drizzle-orm";
import { db, sql, tenders } from "@/lib/db";
import { cleanText } from "@/modules/connectors/text";

const rows = await db.select().from(tenders);
let updated = 0;
for (const row of rows) {
  const cleaned = {
    title: cleanText(row.title),
    buyer: cleanText(row.buyer),
    city: row.city ? cleanText(row.city) : null,
    description: row.description ? cleanText(row.description) : null,
  };
  if (cleaned.title !== row.title || cleaned.buyer !== row.buyer || cleaned.city !== row.city || cleaned.description !== row.description) {
    await db.update(tenders).set({ ...cleaned, updatedAt: new Date() }).where(eq(tenders.id, row.id));
    updated += 1;
  }
}
console.log(`Descriptions et titres nettoyés : ${updated}`);
await sql.end();
