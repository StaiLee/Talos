import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { createWorker } from "tesseract.js";

const execFileAsync = promisify(execFile);

export async function ocrPdf(buffer: Buffer) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "talos-ocr-"));
  let worker;
  try {
    const input = path.join(directory, "input.pdf");
    await writeFile(input, buffer);
    await execFileAsync("pdftoppm", ["-png", "-r", "160", input, path.join(directory, "page")], { timeout: 120_000 });
    const pages = (await readdir(directory)).filter((file) => /^page-\d+\.png$/.test(file)).sort();
    worker = await createWorker("fra", undefined, { workerPath: path.join(process.cwd(), "node_modules", "tesseract.js", "src", "worker-script", "node", "index.js") });
    const texts: string[] = [];
    for (const [index, page] of pages.entries()) {
      const result = await worker.recognize(await readFile(path.join(directory, page)));
      texts.push(`\n=== PAGE ${index + 1} · OCR ===\n${result.data.text}`);
    }
    return texts.join("\n");
  } finally {
    if (worker) await worker.terminate();
    await rm(directory, { recursive: true, force: true });
  }
}
