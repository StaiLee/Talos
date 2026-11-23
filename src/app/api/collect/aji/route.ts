import { collectAji } from "@/modules/connectors/aji";

export const maxDuration = 300;

export async function POST() {
  try {
    return Response.json(await collectAji());
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
