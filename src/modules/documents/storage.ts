import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const storageRoot = path.resolve(/* turbopackIgnore: true */ process.env.STORAGE_DIR ?? "./storage");

export async function storeBuffer(tenderId: string, filename: string, buffer: Buffer) {
  const directory = path.join(storageRoot, "tenders", tenderId);
  await mkdir(directory, { recursive: true });
  const safeName = filename.normalize("NFC").replace(/[^a-zA-Z0-9._ -]/g, "_").slice(-180);
  const storagePath = path.join(directory, `${randomUUID()}-${safeName}`);
  await writeFile(storagePath, buffer, { flag: "wx" });
  return { storagePath, sha256: createHash("sha256").update(buffer).digest("hex") };
}

export function detectDocument(buffer: Buffer, filename: string) {
  const extension = path.extname(filename).toLowerCase();
  if (buffer.subarray(0, 5).toString("ascii") === "%PDF-") return { format: "pdf", mimeType: "application/pdf" };
  if (buffer.subarray(0, 4).toString("ascii") === "PK\u0003\u0004") {
    if (extension === ".docx") return { format: "docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
    if (extension === ".xlsx" || extension === ".xlsm") return { format: "xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
    return { format: "archive", mimeType: "application/zip" };
  }
  if (extension === ".csv" || extension === ".txt" || extension === ".xml") return { format: "text", mimeType: "text/plain" };
  return { format: "inconnu", mimeType: "application/octet-stream" };
}

export function classifyDocument(filename: string) {
  const value = filename.toLowerCase();
  if (/cctp|cahier des charges/.test(value)) return "cctp";
  if (/ccap/.test(value)) return "ccap";
  if (/r[èe]glement|(^|[^a-z])rc([^a-z]|$)/.test(value)) return "rc";
  if (/bpu/.test(value)) return "bpu";
  if (/dqe|dpgf/.test(value)) return "dqe";
  if (/acte.d.engagement|(^|[^a-z])ae([^a-z]|$)/.test(value)) return "ae";
  if (/m[ée]moire/.test(value)) return "memoire";
  if (/devis/.test(value)) return "devis";
  return "autre";
}
