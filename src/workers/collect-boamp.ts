import { sql } from "@/lib/db";
import { collectBoamp } from "@/modules/connectors/boamp";

try {
  const result = await collectBoamp();
  console.log(JSON.stringify(result));
} finally {
  await sql.end();
}
