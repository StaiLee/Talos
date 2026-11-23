import { readFile } from "node:fs/promises";
import { eq } from "drizzle-orm";
import ExcelJS from "exceljs";
import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";
import { db, documents } from "@/lib/db";
import { detectDocument } from "./storage";
import { ocrPdf } from "./ocr";

async function extractPdf(buffer: Buffer) {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const result = await extractText(pdf, { mergePages: false });
  return { text: Array.isArray(result.text) ? result.text.map((page, index) => `\n=== PAGE ${index + 1} ===\n${page}`).join("\n") : result.text, pages: result.totalPages };
}

async function extractExcel(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const sheets: string[] = [];
  workbook.eachSheet((sheet) => {
    sheets.push(`\n=== ${sheet.name} ===`);
    sheet.eachRow({ includeEmpty: false }, (row) => {
      const values = Array.isArray(row.values) ? row.values.slice(1) : [];
      const text = values.map((value) => typeof value === "object" && value !== null && "text" in value ? value.text : String(value ?? "")).join(" | ").trim();
      if (text) sheets.push(text);
    });
  });
  return { text: sheets.join("\n"), pages: workbook.worksheets.length };
}

export async function extractDocument(documentId: string) {
  const [document] = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
  if (!document) throw new Error("Document introuvable");
  const buffer = await readFile(document.storagePath);
  const detected = detectDocument(buffer, document.filename);
  try {
    let result = { text: "", pages: 1 };
    if (detected.format === "pdf") result = await extractPdf(buffer);
    else if (detected.format === "docx") result = { text: (await mammoth.extractRawText({ buffer })).value, pages: 1 };
    else if (detected.format === "xlsx") result = await extractExcel(buffer);
    else if (detected.format === "text") result = { text: buffer.toString("utf8"), pages: 1 };
    else throw new Error(`Format ${detected.format} non pris en charge`);
    let ocrRequired = detected.format === "pdf" && result.text.replace(/\s/g, "").length < 100;
    let ocrPerformed = false;
    if (ocrRequired) {
      const ocrText = await ocrPdf(buffer);
      if (ocrText.replace(/\s/g, "").length >= 100) {
        result = { ...result, text: ocrText };
        ocrRequired = false;
        ocrPerformed = true;
      }
    }
    const [updated] = await db.update(documents).set({
      status: ocrRequired ? "ocr_requis" : ocrPerformed ? "ocr_effectue" : "extrait",
      extractedText: result.text,
      pageCount: result.pages,
      mimeType: detected.mimeType,
      metadata: { ...document.metadata, detectedFormat: detected.format, ocrRequired, ocrPerformed },
    }).where(eq(documents.id, documentId)).returning();
    return updated;
  } catch (error) {
    await db.update(documents).set({ status: "erreur", metadata: { ...document.metadata, error: error instanceof Error ? error.message : String(error) } }).where(eq(documents.id, documentId));
    throw error;
  }
}
