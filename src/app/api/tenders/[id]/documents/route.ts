import { importDocument } from "@/modules/documents/import";

export const maxDuration = 300;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const form = await request.formData();
    const files = form.getAll("files").filter((file): file is File => file instanceof File);
    if (!files.length) return Response.json({ error: "Aucun fichier transmis" }, { status: 400 });
    const imported = [];
    for (const file of files) imported.push(await importDocument(id, file));
    return Response.json({ imported: imported.length, statuses: imported.map((document) => document.status) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
