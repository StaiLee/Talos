import { auditDemoResponse } from "@/modules/demo/audit";

export const maxDuration = 300;

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    return Response.json(await auditDemoResponse((await params).id));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
