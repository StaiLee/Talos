import { readFile } from "node:fs/promises";
import mammoth from "mammoth";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { capabilities, db, requirements, responses, tenders } from "@/lib/db";
import { generateStructured } from "@/modules/ai/client";

const auditSchema = z.object({
  verdict: z.enum(["pret_pour_revue", "corrections_requises"]),
  strengths: z.array(z.string()).max(6),
  issues: z.array(z.object({
    severity: z.enum(["critique", "important", "a_verifier"]),
    label: z.string(),
    detail: z.string(),
  })).max(12),
  humanChecks: z.array(z.string()).max(8),
});

export async function auditDemoResponse(tenderId: string) {
  const [tender] = await db.select().from(tenders).where(eq(tenders.id, tenderId)).limit(1);
  if (!tender) throw new Error("Appel d’offres introuvable");
  const [response] = await db.select().from(responses).where(and(eq(responses.tenderId, tenderId), eq(responses.kind, "memoire_docx"))).orderBy(desc(responses.createdAt)).limit(1);
  if (!response) throw new Error("Aucun mémoire Word à contrôler");
  const requirementList = await db.select().from(requirements).where(eq(requirements.tenderId, tenderId));
  const validatedCapabilities = await db.select().from(capabilities).where(eq(capabilities.status, "valide"));
  const responseText = (await mammoth.extractRawText({ buffer: await readFile(response.storagePath) })).value.slice(0, 40_000);
  const audit = await generateStructured({
    operation: "controle_qualite_demo",
    tenderId,
    schema: auditSchema,
    maxOutputTokens: 2_500,
    prompt: `Tu contrôles un projet de réponse Paritel à un appel d'offres. Vérifie que le mémoire répond aux exigences sans inventer de capacité, de prix, de certification ou d'engagement. Signale les validations humaines nécessaires. Ne modifie aucun document et ne considère jamais le dossier comme déposé.\n\nCAPACITÉS VALIDÉES:\n${validatedCapabilities.map((item) => `${item.category}: ${item.label}`).join("\n") || "Aucune"}\n\nEXIGENCES:\n${requirementList.map((item) => `${item.mandatory ? "OBLIGATOIRE" : "STANDARD"} · ${item.description}`).join("\n").slice(0, 30_000)}\n\nMÉMOIRE À CONTRÔLER:\n${responseText}`,
  });
  if (!audit) throw new Error("Le contrôle qualité nécessite la configuration de l’IA.");
  return {
    ...audit,
    responseId: response.id,
    submission: { simulated: true, submitted: false, label: "Envoi simulé · aucune candidature transmise" },
  };
}
