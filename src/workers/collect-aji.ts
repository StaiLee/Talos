import { sql } from "@/lib/db";
import { collectAji } from "@/modules/connectors/aji";

try {
  console.log(JSON.stringify(await collectAji()));
} finally {
  await sql.end();
}
