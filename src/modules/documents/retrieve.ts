import { eq } from "drizzle-orm";
import { Camoufox } from "camoufox";
import { activityEvents, db, sources, tenders } from "@/lib/db";
import { importDocument } from "./import";

function section(text: string, start: string, end: string) {
  return text.split(start)[1]?.split(end)[0]?.replace(/\s+/g, " ").trim();
}

export async function retrieveDce(tenderId: string) {
  const [row] = await db.select({ tender: tenders, source: sources }).from(tenders).leftJoin(sources, eq(tenders.sourceId, sources.id)).where(eq(tenders.id, tenderId)).limit(1);
  if (!row?.tender.url) throw new Error("Aucun lien source disponible");
  if (row.source?.slug !== "aji") throw new Error(`Récupération automatique ${row.source?.name ?? "de cette source"} non configurée. Ouvrez la source puis importez le DCE.`);
  const browser = await Camoufox({ headless: true, os: "linux" });
  try {
    const page = await browser.newPage();
    await page.addInitScript("globalThis.__name = (fn) => fn;");
    await page.goto(row.tender.url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    const anonymous = page.getByText(/Continuer la visite anonymement/);
    if (await anonymous.count()) {
      await anonymous.click();
      await page.waitForLoadState("domcontentloaded");
    }
    const text = await page.locator("body").innerText();
    const address = section(text, "Adresse", "Contact");
    const submission = section(text, "Transmission des offres", "Etablissement");
    const criteria = section(text, "Critères d'attribution", "Documents annexes");
    const requiredDocuments = section(text, "Documents à produire", "Condition de livraison");
    const links = await page.locator('a[href*="/mapa/mapa/file/marche/"]').evaluateAll((anchors) => anchors.map((anchor) => ({ href: (anchor as HTMLAnchorElement).href, text: anchor.textContent?.trim() ?? "document" })));
    if (!links.length) throw new Error("Aucun document public détecté dans cette consultation");
    let imported = 0;
    for (const link of links.slice(0, 12)) {
      const response = await page.context().request.get(link.href);
      if (!response.ok()) throw new Error(`Téléchargement impossible : HTTP ${response.status()}`);
      const buffer = Buffer.from(await response.body());
      const filename = decodeURIComponent(link.href.split("/").pop() ?? `${link.text}.pdf`);
      await importDocument(tenderId, new File([buffer], filename));
      imported += 1;
    }
    await db.update(tenders).set({ metadata: { ...row.tender.metadata, dce: { retrievedAt: new Date().toISOString(), address, submission, criteria, requiredDocuments } }, updatedAt: new Date() }).where(eq(tenders.id, tenderId));
    await db.insert(activityEvents).values({ tenderId, type: "dce", message: `${imported} document(s) AJI récupéré(s) et analysé(s)`, metadata: { documents: links.length } });
    return { imported, address, submission, criteria, requiredDocuments };
  } finally {
    await browser.close();
  }
}
