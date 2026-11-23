import { desc, eq } from "drizzle-orm";
import { db, documents, eligibilityChecks, sources, tenders } from "@/lib/db";
import { retrieveDce } from "@/modules/documents/retrieve";

const terminalStatuses = new Set(["archive", "depose", "gagne", "perdu_non_retenu", "perdu_soutenance"]);

export async function prepareDemo(tenderId?: string) {
  const rows = await db.select({ tender: tenders, sourceName: sources.name, sourceSlug: sources.slug }).from(tenders).leftJoin(sources, eq(tenders.sourceId, sources.id));
  const documentRows = await db.select({ tenderId: documents.tenderId, status: documents.status }).from(documents);
  const eligibilityRows = await db.select().from(eligibilityChecks).orderBy(desc(eligibilityChecks.createdAt));
  const candidates = rows.filter((row) => !terminalStatuses.has(row.tender.status) && !/reconditionn|acquisition de t[ée]l[ée]phones mobiles/i.test(row.tender.title));
  const readableCount = (id: string) => documentRows.filter((document) => document.tenderId === id && ["extrait", "ocr_effectue"].includes(document.status)).length;
  const ranked = candidates.filter((row) => readableCount(row.tender.id) > 0 || (row.sourceSlug === "aji" && Boolean(row.tender.url))).sort((a, b) => {
    const aAddress = Boolean((a.tender.metadata.dce as { address?: string } | undefined)?.address);
    const bAddress = Boolean((b.tender.metadata.dce as { address?: string } | undefined)?.address);
    const aRank = (a.tender.score ?? 0) * 100 + Math.min(readableCount(a.tender.id), 5) * 100 + Number(aAddress) * 1_000;
    const bRank = (b.tender.score ?? 0) * 100 + Math.min(readableCount(b.tender.id), 5) * 100 + Number(bAddress) * 1_000;
    return bRank - aRank;
  });
  const selected = tenderId ? rows.find((row) => row.tender.id === tenderId) : ranked[0];
  if (!selected) throw new Error(tenderId ? "Appel d’offres introuvable" : "Aucun appel d’offres disponible pour la démonstration");
  if (!readableCount(selected.tender.id)) {
    if (selected.sourceSlug !== "aji") throw new Error("Cette offre ne contient aucun DCE lisible. Choisissez une offre AJI ou importez ses documents.");
    await retrieveDce(selected.tender.id);
  }
  const documentList = await db.select().from(documents).where(eq(documents.tenderId, selected.tender.id));
  const readable = documentList.filter((document) => ["extrait", "ocr_effectue"].includes(document.status) && document.extractedText);
  if (!readable.length) throw new Error("Aucun texte exploitable dans le DCE. Vérifiez les documents ou l’OCR.");
  const [latestEligibility] = eligibilityRows.filter((check) => check.tenderId === selected.tender.id);
  const dce = selected.tender.metadata.dce as { address?: string } | undefined;
  return {
    tender: {
      id: selected.tender.id,
      title: selected.tender.title,
      buyer: selected.tender.buyer,
      reference: selected.tender.reference,
      deadline: selected.tender.deadline,
      sourceName: selected.sourceName ?? "Import manuel",
    },
    documentCount: documentList.length,
    readableDocuments: readable.length,
    address: dce?.address ?? "",
    eligibility: latestEligibility ?? null,
  };
}
