import { collectBoamp } from "@/modules/connectors/boamp";

export async function POST() {
  try {
    return Response.json(await collectBoamp());
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
