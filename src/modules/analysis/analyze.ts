import { eq } from "drizzle-orm";
import { z } from "zod";
import { activityEvents, db, documents, requirements, tenders } from "@/lib/db";
import { generateStructured } from "@/modules/ai/client";

const analysisSchema = z.object({
  summary: z.string(),
  requirements: z.array(z.object({
    label: z.string(),
    description: z.string(),
    category: z.string(),
    mandatory: z.boolean(),
    evidence: z.string(),
  })),
  criteria: z.array(z.object({ label: z.string(), weight: z.number().nullable() })),
  subcontractingAllowed: z.boolean().nullable(),
  lots: z.array(z.string()),
});

function categoryFor(text: string) {
  if (/GTR|GTI|SLA|maintenance|incident|intervention/i.test(text)) return "Support et niveaux de service";
  if (/DC1|DC2|DUME|acte d.engagement|signature|Chorus|candidature/i.test(text)) return "Administratif";
  if (/crit[èe]re|pond[ée]ration|prix/i.test(text)) return "Évaluation et prix";
  if (/visite|pr[ée]visite|d[ée]lai|planning|date limite/i.test(text)) return "Planning et organisation";
  if (/sous-traitance|groupement|lot/i.test(text)) return "Forme du marché";
  return "Technique";
}

function heuristicRequirements(documentList: (typeof documents.$inferSelect)[]) {
  const seen = new Set<string>();
  const extracted: { tenderId: string; sourceDocumentId: string; category: string; label: string; description: string; mandatory: boolean; status: string; confidence: number; evidence: string }[] = [];
  for (const document of documentList) {
    const lines = (document.extractedText ?? "").split(/\n|(?<=[.!?])\s+/).map((line) => line.trim()).filter((line) => line.length >= 35 && line.length <= 900);
    for (const line of lines) {
      if (!/obligatoire|exig|doit|doivent|devront|interdit|GTR|GTI|SLA|crit[èe]re|pond[ée]ration|DC1|DC2|DUME|Chorus|pr[ée]visite|sous-traitance|date limite/i.test(line)) continue;
      const key = line.toLowerCase().replace(/\W/g, "").slice(0, 180);
      if (seen.has(key)) continue;
      seen.add(key);
      extracted.push({
        tenderId: document.tenderId!,
        sourceDocumentId: document.id,
        category: categoryFor(line),
        label: line.slice(0, 110),
        description: line,
        mandatory: /obligatoire|exig|doit|doivent|devront|interdit/i.test(line),
        status: "a_verifier",
        confidence: 62,
        evidence: line.slice(0, 400),
      });
      if (extracted.length >= 60) return extracted;
    }
  }
  return extracted;
}

export async function analyzeTender(tenderId: string) {
  const [tender] = await db.select().from(tenders).where(eq(tenders.id, tenderId)).limit(1);
  if (!tender) throw new Error("AO introuvable");
  const documentList = await db.select().from(documents).where(eq(documents.tenderId, tenderId));
  const readable = documentList.filter((document) => document.status === "extrait" && document.extractedText);
  if (!readable.length) throw new Error("Aucun document exploitable. Importer un DCE ou traiter l’OCR.");
  const heuristic = heuristicRequirements(readable);
  const corpus = readable.map((document) => `DOCUMENT: ${document.filename}\n${document.extractedText}`).join("\n\n").slice(0, 90_000);
  const ai = await generateStructured({
    operation: "analyse_dce",
    tenderId,
    schema: analysisSchema,
    prompt: `Tu analyses un dossier d'appel d'offres pour Paritel. N'invente aucune exigence. Extrais uniquement les exigences explicitement présentes, avec une courte preuve textuelle. Signale les critères, lots et règles de sous-traitance lorsqu'ils sont documentés.\n\n${corpus}`,
  });
  const aiRequirements = (ai?.requirements ?? []).map((requirement) => ({
    tenderId,
    sourceDocumentId: readable[0].id,
    category: requirement.category,
    label: requirement.label,
    description: requirement.description,
    mandatory: requirement.mandatory,
    status: "a_verifier",
    confidence: 88,
    evidence: requirement.evidence,
  }));
  const all = [...aiRequirements, ...heuristic].slice(0, 80);
  await db.delete(requirements).where(eq(requirements.tenderId, tenderId));
  if (all.length) await db.insert(requirements).values(all);
  await db.update(tenders).set({
    status: tender.status === "detecte" ? "en_cours" : tender.status,
    goDecision: "sous_conditions",
    metadata: { ...tender.metadata, analysis: ai ? { summary: ai.summary, criteria: ai.criteria, subcontractingAllowed: ai.subcontractingAllowed, lots: ai.lots } : { mode: "regles", note: "Analyse IA non configurée" }, analyzedAt: new Date().toISOString() },
    updatedAt: new Date(),
  }).where(eq(tenders.id, tenderId));
  await db.insert(activityEvents).values({ tenderId, type: "analyse", message: `${all.length} exigences extraites · ${ai ? "IA + règles" : "règles déterministes"}`, metadata: { documents: readable.length } });
  return { requirements: all.length, ai: Boolean(ai), documents: readable.length };
}
