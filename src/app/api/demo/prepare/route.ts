import { z } from "zod";
import { prepareDemo } from "@/modules/demo/prepare";

export const maxDuration = 300;

const inputSchema = z.object({ tenderId: z.string().uuid().optional() });

export async function POST(request: Request) {
  try {
    const input = inputSchema.parse(await request.json());
    return Response.json(await prepareDemo(input.tenderId));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}
