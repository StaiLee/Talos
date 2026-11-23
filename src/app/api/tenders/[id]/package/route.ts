import { readFile } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { strToU8, zipSync } from "fflate";
import { db, responses, sources, tenders } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row] = await db.select({ tender: tenders, sourceName: sources.name }).from(tenders).leftJoin(sources, eq(tenders.sourceId, sources.id)).where(eq(tenders.id, id)).limit(1);
  if (!row) return Response.json({ error: "AO introuvable" }, { status: 404 });
  const responseRows = await db.select().from(responses).where(eq(responses.tenderId, id));
  if (!responseRows.length) return Response.json({ error: "Générez d’abord le dossier de réponse" }, { status: 400 });
  const dce = row.tender.metadata.dce as { submission?: string; address?: string } | undefined;
  const guide = [
    "TALOS · GUIDE DE DÉPÔT",
    `Consultation : ${row.tender.title}`,
    `Acheteur : ${row.tender.buyer}`,
    `Source : ${row.sourceName ?? "Manuelle"}`,
    `Lien : ${row.tender.url ?? "À compléter"}`,
    `Échéance : ${formatDateTime(row.tender.deadline)}`,
    `Adresse du site : ${dce?.address ?? "À confirmer"}`,
    `Canal de remise : ${dce?.submission ?? "Consulter le règlement de consultation"}`,
    "",
    "AVANT DÉPÔT",
    "1. Relire le RC, le CCTP et les éventuels rectificatifs.",
    "2. Valider chaque exigence obligatoire dans Talos.",
    "3. Compléter et valider les prix, délais, GTR/SLA et exclusions.",
    "4. Vérifier les pièces administratives, signatures et formats demandés.",
    "5. Faire valider le dossier par le responsable Paritel habilité.",
    "6. Déposer sur la plateforme ou par le canal prévu par l’acheteur.",
    "7. Conserver la preuve de dépôt puis passer le dossier au statut Déposé.",
    "",
    "Les agents IA préparent et contrôlent le dossier. La signature et la remise finale restent soumises à validation humaine.",
    `Dossier généré le ${formatDateTime(new Date())} · BROUILLON`,
  ].join("\n");
  const archive: Record<string, Uint8Array> = { "00-GUIDE-DE-DEPOT.txt": strToU8(guide) };
  for (const response of responseRows) archive[`reponse/${response.filename}`] = await readFile(response.storagePath);
  const content = zipSync(archive, { level: 6 });
  return new Response(content as unknown as BodyInit, { headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="Talos-depot-${row.tender.reference ?? row.tender.id}.zip"` } });
}
