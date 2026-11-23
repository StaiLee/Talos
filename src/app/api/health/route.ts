import { sql } from "@/lib/db";

export async function GET() {
  await sql`select 1`;
  return Response.json({ status: "ok", service: "talos", timestamp: new Date().toISOString() });
}
