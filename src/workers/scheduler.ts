import { sql } from "@/lib/db";
import { collectAji } from "@/modules/connectors/aji";
import { collectBoamp } from "@/modules/connectors/boamp";

const locks = { boamp: false, aji: false };

async function run(name: keyof typeof locks, collector: () => Promise<unknown>) {
  if (locks[name]) return;
  locks[name] = true;
  try {
    console.log(new Date().toISOString(), name, await collector());
  } catch (error) {
    console.error(name, error);
  } finally {
    locks[name] = false;
  }
}

await run("boamp", collectBoamp);
if (process.env.AJI_ENABLED !== "false") await run("aji", collectAji);
setInterval(() => run("boamp", collectBoamp), 15 * 60 * 1000);
if (process.env.AJI_ENABLED !== "false") setInterval(() => run("aji", collectAji), 60 * 60 * 1000);
process.on("SIGTERM", async () => {
  await sql.end();
  process.exit(0);
});
