import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq, max } from "drizzle-orm";
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { z } from "zod";
import { capabilities, db, documents, requirements, responses, tenders } from "@/lib/db";
import { storageRoot } from "@/modules/documents/storage";
import { generateStructured } from "@/modules/ai/client";
import { formatDate } from "@/lib/utils";

const responseSchema = z.object({
  introduction: z.string(),
  understanding: z.string(),
  methodology: z.string(),
  support: z.string(),
});

function pdfBuffer(lines: { text: string; heading?: boolean }[]) {
  const pdf = new PDFDocument({ margin: 52, size: "A4" });
  const chunks: Buffer[] = [];
  pdf.on("data", (chunk) => chunks.push(chunk));
  for (const line of lines) {
    if (line.heading) pdf.moveDown(0.7).font("Helvetica-Bold").fontSize(14).fillColor("#0c2340").text(line.text);
    else pdf.font("Helvetica").fontSize(10).fillColor("#253448").text(line.text, { lineGap: 4 });
  }
  pdf.end();
  return new Promise<Buffer>((resolve) => pdf.on("end", () => resolve(Buffer.concat(chunks))));
}

export async function generateResponse(tenderId: string) {
  const [tender] = await db.select().from(tenders).where(eq(tenders.id, tenderId)).limit(1);
  if (!tender) throw new Error("AO introuvable");
  const requirementList = await db.select().from(requirements).where(eq(requirements.tenderId, tenderId));
  const documentList = await db.select().from(documents).where(eq(documents.tenderId, tenderId));
  const capabilityList = await db.select().from(capabilities).where(eq(capabilities.status, "valide"));
  const analysis = tender.metadata.analysis as { summary?: string } | undefined;
  const ai = await generateStructured({
    operation: "redaction_memoire",
    tenderId,
    schema: responseSchema,
    maxOutputTokens: 5_000,
    prompt: `Rédige des paragraphes sobres, précis et professionnels pour un projet de mémoire technique Paritel. N'affirme aucune capacité absente de la liste VALIDÉE et ne fixe aucun prix. Utilise un ton direct, sans superlatifs. Réponds au besoin précis du client et distingue les points restant à valider.\nAO: ${tender.title}\nAcheteur: ${tender.buyer}\nDescription: ${tender.description ?? ""}\nSynthèse: ${analysis?.summary ?? "Non disponible"}\nCapacités Paritel validées: ${capabilityList.map((item) => `${item.category}: ${item.label}`).join("\n") || "Aucune"}\nExigences: ${requirementList.map((item) => item.description).join("\n").slice(0, 35_000)}`,
  });
  const [versionRow] = await db.select({ value: max(responses.version) }).from(responses).where(eq(responses.tenderId, tenderId));
  const version = Number(versionRow?.value ?? 0) + 1;
  const directory = path.join(storageRoot, "responses", tenderId, `v${version}`);
  await mkdir(directory, { recursive: true });
  const base = `Talos_${tender.reference?.replace(/[^a-zA-Z0-9_-]/g, "_") ?? tender.id}_v${version}`;
  const sections = [
    { title: "1. Objet de la réponse", text: ai?.introduction ?? `Paritel présente sa réponse à la consultation « ${tender.title} » portée par ${tender.buyer}. Ce document constitue un projet de travail soumis à validation technique, commerciale et contractuelle.` },
    { title: "2. Compréhension du besoin", text: ai?.understanding ?? tender.description ?? `La consultation est analysée à partir des documents disponibles et des exigences extraites. Les périmètres d’accès, de téléphonie et de services associés seront confirmés lors du cadrage.` },
    { title: "3. Méthodologie de déploiement", text: ai?.methodology ?? "Le projet sera conduit selon une séquence de cadrage, d’audit de l’existant, de validation de l’architecture, de préparation, de déploiement, de recette et de passage en exploitation. Les dépendances vis-à-vis du client et des tiers seront explicitées avant engagement." },
    { title: "4. Support et maintien en conditions opérationnelles", text: ai?.support ?? "Les modalités de support, les plages d’intervention et les niveaux de service seront rattachés aux offres effectivement retenues. Aucun engagement spécifique n’est pris sans validation du périmètre technique et contractuel." },
  ];
  const paragraphs = [
    new Paragraph({ text: "PARITEL · TALOS", heading: HeadingLevel.HEADING_2 }),
    new Paragraph({ text: "PROJET DE MÉMOIRE TECHNIQUE", heading: HeadingLevel.TITLE }),
    new Paragraph({ children: [new TextRun({ text: tender.title, bold: true })] }),
    new Paragraph({ text: `${tender.buyer} · Remise : ${formatDate(tender.deadline)}` }),
    new Paragraph({ children: [new TextRun({ text: "Brouillon — validation Paritel obligatoire avant remise", bold: true, color: "B56316" })] }),
    ...sections.flatMap((section) => [new Paragraph({ text: section.title, heading: HeadingLevel.HEADING_1 }), new Paragraph({ text: section.text })]),
    new Paragraph({ text: "5. Matrice des exigences", heading: HeadingLevel.HEADING_1 }),
    ...(requirementList.length ? requirementList.map((item) => new Paragraph({ text: `${item.mandatory ? "Obligatoire" : "À confirmer"} · ${item.description}`, bullet: { level: 0 } })) : [new Paragraph({ text: "Aucune exigence extraite à ce stade." })]),
  ];
  const docxBuffer = await Packer.toBuffer(new Document({ sections: [{ children: paragraphs }] }));
  const docxPath = path.join(directory, `${base}_memoire.docx`);
  await writeFile(docxPath, docxBuffer);

  const pdfPath = path.join(directory, `${base}_memoire.pdf`);
  await writeFile(pdfPath, await pdfBuffer([
    { text: "PARITEL · PROJET DE MÉMOIRE TECHNIQUE", heading: true },
    { text: tender.title },
    { text: `${tender.buyer} · Remise : ${formatDate(tender.deadline)}` },
    { text: "Brouillon — validation Paritel obligatoire avant remise" },
    ...sections.flatMap((section) => [{ text: section.title, heading: true }, { text: section.text }]),
    { text: `${requirementList.length} exigences intégrées à la matrice de conformité.` },
  ]));

  const workbook = new ExcelJS.Workbook();
  const checklist = workbook.addWorksheet("Conformité");
  checklist.columns = [
    { header: "Catégorie", key: "category", width: 28 },
    { header: "Exigence", key: "description", width: 80 },
    { header: "Obligatoire", key: "mandatory", width: 14 },
    { header: "Statut", key: "status", width: 18 },
    { header: "Preuve", key: "evidence", width: 60 },
  ];
  requirementList.forEach((item) => checklist.addRow({ category: item.category, description: item.description, mandatory: item.mandatory ? "Oui" : "Non", status: "À vérifier", evidence: item.evidence }));
  checklist.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  checklist.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF142B45" } };
  const docsSheet = workbook.addWorksheet("Pièces du dossier");
  docsSheet.columns = [{ header: "Fichier", key: "filename", width: 60 }, { header: "Type", key: "kind", width: 18 }, { header: "Statut", key: "status", width: 18 }];
  documentList.forEach((item) => docsSheet.addRow({ filename: item.filename, kind: item.kind.toUpperCase(), status: item.status }));
  const xlsxPath = path.join(directory, `${base}_conformite.xlsx`);
  await workbook.xlsx.writeFile(xlsxPath);

  const generated = [
    { kind: "memoire_docx", filename: path.basename(docxPath), storagePath: docxPath },
    { kind: "memoire_pdf", filename: path.basename(pdfPath), storagePath: pdfPath },
    { kind: "conformite_xlsx", filename: path.basename(xlsxPath), storagePath: xlsxPath },
  ];
  const saved = [];
  for (const item of generated) {
    const [response] = await db.insert(responses).values({ ...item, tenderId, version, status: "brouillon" }).returning({ id: responses.id, kind: responses.kind, filename: responses.filename });
    saved.push(response);
  }
  return { version, files: generated.map((item) => item.filename), documents: saved, ai: Boolean(ai) };
}
