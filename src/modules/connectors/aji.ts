import { and, eq } from "drizzle-orm";
import { Camoufox } from "camoufox";
import { activityEvents, collectionRuns, db, sources, tenders } from "@/lib/db";
import { detectDomains, isNonCoreWork, relevanceScore } from "./relevance";
import type { CollectionResult, NormalizedTender } from "./types";
import { cleanText } from "./text";

function parseDate(value: string, withTime = false) {
  const match = value.match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+à\s+(\d{2})h(\d{2}))?/);
  if (!match) return undefined;
  const [, day, month, year, hour, minute] = match;
  return new Date(`${year}-${month}-${day}T${withTime && hour ? hour : "12"}:${withTime && minute ? minute : "00"}:00+01:00`);
}

export async function collectAji(): Promise<CollectionResult> {
  const [source] = await db.select().from(sources).where(eq(sources.slug, "aji")).limit(1);
  if (!source) throw new Error("Source AJI absente. Exécuter le seed.");
  const [run] = await db.insert(collectionRuns).values({ sourceId: source.id }).returning();
  let browser;
  try {
    browser = await Camoufox({ headless: true, os: "linux", env: { MOZ_DISABLE_CONTENT_SANDBOX: "1" } });
    const records: NormalizedTender[] = [];
    const page = await browser.newPage();
    await page.addInitScript("globalThis.__name = (fn) => fn;");
    const maxPages = Number(process.env.AJI_MAX_PAGES ?? 3);
    for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
      await page.goto(`https://mapa.aji-france.com/mapa/marche/?page=${pageNumber}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await page.locator('a[href*="/mapa/marche/"][href$="/show"]').first().waitFor({ timeout: 20_000 });
      const rows = await page.locator('a[href*="/mapa/marche/"][href$="/show"]').evaluateAll((anchors) => anchors.map((anchor) => {
        const text = (selector: string) => anchor.querySelector(selector)?.textContent?.replace(/\s+/g, " ").trim() ?? "";
        const visibleText = (selector: string) => (anchor.querySelector(selector) as HTMLElement | null)?.innerText?.trim() ?? "";
        return {
          href: (anchor as HTMLAnchorElement).href,
          reference: text(".card-header i"),
          title: text(".card-header > b"),
          published: text(".card-header .badge"),
          buyer: visibleText(".card-body .col-sm-4 .small"),
          department: anchor.querySelectorAll(".card-body .col-sm-4 .small")[1]?.textContent?.replace(/\s+/g, " ").trim() ?? "",
          deadline: text(".card-footer .float-right"),
          procedure: text(".card-footer .float-left"),
          category: `${text(".product_mapa")} ${text(".typeproduit")}`,
        };
      }));
      for (const row of rows) {
        if (!row.reference || !row.title) continue;
        const buyerLines = row.buyer.split("\n").map((line) => line.trim()).filter(Boolean);
        const buyer = cleanText(buyerLines[0] || row.buyer || "EPLE");
        const city = buyerLines[1] ? cleanText(buyerLines[1]) : undefined;
        const department = row.department.match(/\((\d{2,3})\)/)?.[1];
        const domains = detectDomains(`${row.title} ${row.category}`);
        const deadline = parseDate(row.deadline, true);
        if (!domains.length || isNonCoreWork(row.title) || (deadline && deadline.getTime() < Date.now())) continue;
        records.push({
          externalId: row.reference,
          reference: row.reference,
          title: cleanText(row.title),
          buyer,
          city,
          department,
          description: cleanText(row.category),
          url: row.href,
          publishedAt: parseDate(row.published),
          deadline,
          domains,
          score: relevanceScore(`${row.title} ${row.category}`, domains),
          metadata: { procedure: row.procedure, category: row.category },
        });
      }
      await page.waitForTimeout(800);
    }
    let created = 0;
    let updated = 0;
    for (const tender of records) {
      const existing = await db.select({ id: tenders.id }).from(tenders).where(and(eq(tenders.sourceId, source.id), eq(tenders.externalId, tender.externalId))).limit(1);
      await db.insert(tenders).values({ ...tender, sourceId: source.id, status: "detecte", goDecision: "a_evaluer" }).onConflictDoUpdate({ target: [tenders.sourceId, tenders.externalId], set: { title: tender.title, buyer: tender.buyer, city: tender.city, department: tender.department, url: tender.url, deadline: tender.deadline, domains: tender.domains, score: tender.score, metadata: tender.metadata, updatedAt: new Date() } });
      if (existing.length) updated += 1;
      else created += 1;
    }
    const existingRecords = await db.select({ id: tenders.id, title: tenders.title, status: tenders.status, deadline: tenders.deadline }).from(tenders).where(eq(tenders.sourceId, source.id));
    for (const tender of existingRecords) {
      const noLongerRelevant = detectDomains(tender.title).length === 0 || isNonCoreWork(tender.title);
      if (tender.status === "detecte" && (noLongerRelevant || (tender.deadline && tender.deadline.getTime() < Date.now()))) {
        await db.update(tenders).set({ status: "archive", updatedAt: new Date() }).where(eq(tenders.id, tender.id));
      }
    }
    await db.update(collectionRuns).set({ status: "termine", discovered: records.length, created, updated, finishedAt: new Date() }).where(eq(collectionRuns.id, run.id));
    await db.update(sources).set({ lastSyncAt: new Date(), lastError: null, status: "active" }).where(eq(sources.id, source.id));
    await db.insert(activityEvents).values({ type: "collecte", message: `AJI : ${created} nouvelles opportunités, ${updated} mises à jour`, metadata: { discovered: records.length } });
    return { discovered: records.length, created, updated };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db.update(collectionRuns).set({ status: "erreur", error: message, finishedAt: new Date() }).where(eq(collectionRuns.id, run.id));
    await db.update(sources).set({ lastError: message, status: "erreur" }).where(eq(sources.id, source.id));
    throw error;
  } finally {
    if (browser) await browser.close();
  }
}
