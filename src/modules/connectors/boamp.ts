import { and, eq } from "drizzle-orm";
import { collectionRuns, db, sources, tenders } from "@/lib/db";
import { activityEvents } from "@/lib/db/schema";
import { detectDomains, isNonCoreWork, relevanceScore } from "./relevance";
import type { CollectionResult, NormalizedTender } from "./types";

const endpoint = "https://boamp-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/boamp/records";
const keywords = ["telephonie", "telecommunications", "fibre optique", "FTTO", "FTTH", "VoIP", "Wi-Fi", "cybersecurite", "firewall", "forfait mobile"];

type BoampRecord = {
  idweb: string;
  objet?: string;
  nomacheteur?: string;
  code_departement?: string[] | string;
  dateparution?: string;
  datelimitereponse?: string;
  datefindiffusion?: string;
  url_avis?: string;
  descripteur_code?: string[];
  donnees?: string;
};

function walk(value: unknown, predicate: (key: string, value: unknown) => boolean, results: unknown[] = []) {
  if (!value || typeof value !== "object") return results;
  for (const [key, child] of Object.entries(value)) {
    if (predicate(key, child)) results.push(child);
    walk(child, predicate, results);
  }
  return results;
}

function firstText(data: unknown, keys: string[]) {
  const values = walk(data, (key) => keys.includes(key));
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (value && typeof value === "object" && "#text" in value && typeof value["#text"] === "string") return value["#text"].trim();
  }
  return undefined;
}

function normalize(record: BoampRecord): NormalizedTender {
  let details: unknown = {};
  try { details = record.donnees ? JSON.parse(record.donnees) : {}; } catch { details = {}; }
  const title = record.objet?.trim() || firstText(details, ["OBJET_COMPLET"]) || "Appel d’offres télécom";
  const description = firstText(details, ["description", "PRINCIPALES", "QUANTITE"]);
  const profileUrl = firstText(details, ["BuyerProfileURI", "URL_PROFIL_ACHETEUR"]);
  const cpv = firstText(details, ["classPrincipale"]) ?? record.descripteur_code?.join(",");
  const department = Array.isArray(record.code_departement) ? record.code_departement.join(",") : record.code_departement;
  const domains = detectDomains(`${title} ${description ?? ""}`);
  return {
    externalId: record.idweb,
    reference: record.idweb,
    title,
    buyer: record.nomacheteur || "Acheteur public",
    department,
    description,
    cpv,
    url: profileUrl || record.url_avis,
    publishedAt: record.dateparution ? new Date(`${record.dateparution}T00:00:00Z`) : undefined,
    deadline: record.datelimitereponse ? new Date(record.datelimitereponse) : undefined,
    domains,
    score: relevanceScore(`${title} ${description ?? ""} ${cpv ?? ""}`, domains),
    metadata: { urlAvis: record.url_avis, dateFinDiffusion: record.datefindiffusion, sourceSchema: "BOAMP" },
  };
}

export async function collectBoamp(): Promise<CollectionResult> {
  const [source] = await db.select().from(sources).where(eq(sources.slug, "boamp")).limit(1);
  if (!source) throw new Error("Source BOAMP absente. Exécuter le seed.");
  const [run] = await db.insert(collectionRuns).values({ sourceId: source.id }).returning();
  try {
    const since = new Date(Date.now() - 60 * 86_400_000).toISOString().slice(0, 10);
    const search = keywords.map((keyword) => `search(objet, \"${keyword}\")`).join(" OR ");
    const url = new URL(endpoint);
    url.searchParams.set("where", `nature="APPEL_OFFRE" AND (${search}) AND dateparution >= date'${since}'`);
    url.searchParams.set("limit", String(process.env.BOAMP_PAGE_SIZE ?? 100));
    url.searchParams.set("order_by", "-dateparution");
    const response = await fetch(url, { headers: { accept: "application/json", "user-agent": "Talos-Paritel/0.1" }, signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`BOAMP HTTP ${response.status}`);
    const payload = await response.json() as { results?: BoampRecord[] };
    const now = Date.now();
    const records = (payload.results ?? []).map(normalize).filter((tender) => tender.score >= 50 && !isNonCoreWork(tender.title) && (!tender.deadline || tender.deadline.getTime() >= now));
    let created = 0;
    let updated = 0;
    for (const tender of records) {
      const existing = await db.select({ id: tenders.id }).from(tenders).where(and(eq(tenders.sourceId, source.id), eq(tenders.externalId, tender.externalId))).limit(1);
      await db.insert(tenders).values({ ...tender, sourceId: source.id, status: "detecte", goDecision: "a_evaluer" }).onConflictDoUpdate({
        target: [tenders.sourceId, tenders.externalId],
        set: { title: tender.title, buyer: tender.buyer, description: tender.description, url: tender.url, deadline: tender.deadline, domains: tender.domains, score: tender.score, metadata: tender.metadata, updatedAt: new Date() },
      });
      if (existing.length) updated += 1;
      else created += 1;
    }
    const existingRecords = await db.select({ id: tenders.id, title: tenders.title, score: tenders.score, status: tenders.status, deadline: tenders.deadline }).from(tenders).where(eq(tenders.sourceId, source.id));
    for (const tender of existingRecords) {
      if (tender.status === "detecte" && ((tender.score ?? 0) < 50 || isNonCoreWork(tender.title) || (tender.deadline && tender.deadline.getTime() < now))) {
        await db.update(tenders).set({ status: "archive", updatedAt: new Date() }).where(eq(tenders.id, tender.id));
      }
    }
    await db.update(collectionRuns).set({ status: "termine", discovered: records.length, created, updated, finishedAt: new Date() }).where(eq(collectionRuns.id, run.id));
    await db.update(sources).set({ lastSyncAt: new Date(), lastError: null, status: "active" }).where(eq(sources.id, source.id));
    await db.insert(activityEvents).values({ type: "collecte", message: `BOAMP : ${created} nouvelles opportunités, ${updated} mises à jour`, metadata: { discovered: records.length } });
    return { discovered: records.length, created, updated };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db.update(collectionRuns).set({ status: "erreur", error: message, finishedAt: new Date() }).where(eq(collectionRuns.id, run.id));
    await db.update(sources).set({ lastError: message, status: "erreur" }).where(eq(sources.id, source.id));
    throw error;
  }
}
