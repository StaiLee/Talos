import { db, sql, capabilities, sources, tenders } from "./index";

const sourceSeed = [
  { slug: "boamp", name: "BOAMP", url: "https://www.boamp.fr/", kind: "api" },
  { slug: "ted", name: "TED / SIMAP", url: "https://ted.europa.eu/", kind: "api" },
  { slug: "aji", name: "AJI · MAPA", url: "https://mapa.aji-france.com/", kind: "browser" },
  { slug: "e-marchespublics", name: "E-marchés publics", url: "https://www.e-marchespublics.com/", kind: "browser" },
  { slug: "marchesonline", name: "Marchés Online", url: "https://www.marchesonline.com/", kind: "browser" },
  { slug: "marches-securises", name: "Marchés Sécurisés", url: "https://www.marches-securises.fr/", kind: "browser" },
  { slug: "aws", name: "AW Solutions", url: "https://awsolutions.fr/", kind: "browser" },
  { slug: "xmarches", name: "Xmarchés", url: "https://www.xmarches.fr/", kind: "browser" },
  { slug: "place", name: "PLACE", url: "https://www.marches-publics.gouv.fr/", kind: "browser" },
  { slug: "manuel", name: "Imports manuels", url: "https://talos.local/import", kind: "manual" },
];

for (const source of sourceSeed) {
  await db.insert(sources).values(source).onConflictDoUpdate({ target: sources.slug, set: { name: source.name, url: source.url, kind: source.kind } });
}

const sourceRows = await db.select().from(sources);
const sourceId = (slug: string) => sourceRows.find((source) => source.slug === slug)?.id;
const aji = sourceId("aji");
const manual = sourceId("manuel");

const tenderSeed = [
  { sourceId: aji, externalId: "PAJI/26/05787", reference: "PAJI/26/05787", title: "Collège Louis Lumière", buyer: "Collège Louis Lumière", city: "Marly-le-Roi", department: "78", cpv: "64200000-8", status: "depose", goDecision: "a_evaluer", score: 86, domains: ["telephonie", "internet", "mobile"], dossierPath: "2026-09-25 - Collège Louis Lumière", publishedAt: new Date("2026-09-25T08:00:00Z"), deadline: new Date("2026-10-16T10:00:00Z") },
  { sourceId: aji, externalId: "PAJI/26/05888", reference: "PAJI/26/05888", title: "Internat de la Réussite de Marly-le-Roi", buyer: "Internat de la Réussite", city: "Marly-le-Roi", department: "78", cpv: "64200000-8", status: "depose", goDecision: "a_evaluer", score: 84, domains: ["telephonie", "internet", "mobile"], dossierPath: "2026-09-29 - Internat de la Réussite de Marly le Roi", publishedAt: new Date("2026-09-29T08:00:00Z"), deadline: new Date("2026-10-16T10:00:00Z") },
  { sourceId: aji, externalId: "PAJI/26/05864", reference: "PAJI/26/05864", title: "Lycée du Forez · Trunk SIP sur fibre", buyer: "Lycée du Forez", city: "Feurs", department: "42", cpv: "32412100-5", status: "en_cours", goDecision: "sous_conditions", score: 82, domains: ["telephonie", "internet"], dossierPath: "2026-09-29 - Lycée du Forez (Feurs)", publishedAt: new Date("2026-09-29T08:00:00Z"), deadline: new Date("2026-10-31T11:00:00Z") },
  { sourceId: aji, externalId: "PAJI/26/06746", reference: "PAJI/26/06746", title: "Lycée polyvalent Monge · Téléphonie et fibre", buyer: "Lycée polyvalent Monge", city: "Chambéry", department: "73", cpv: "64210000-1", status: "detecte", goDecision: "a_evaluer", score: 88, domains: ["telephonie", "internet", "mobile"], publishedAt: new Date("2026-10-14T08:00:00Z"), deadline: new Date("2026-11-17T11:00:00Z"), metadata: { lots: 3, sousTraitance: false, criteres: { prix: 40, delais: 40, accompagnement: 20 } } },
  { sourceId: manual, externalId: "PS2026/04", reference: "PS2026/04", title: "Saint-Gervais-la-Forêt · Migration RTC vers VoIP", buyer: "Commune de Saint-Gervais-la-Forêt", city: "Saint-Gervais-la-Forêt", department: "41", status: "gagne", goDecision: "go", score: 91, domains: ["telephonie", "internet", "mobile"], dossierPath: "RUN/COMMUNE DE SAINT GERVAIS", publishedAt: new Date("2026-06-02T08:00:00Z"), deadline: new Date("2026-07-01T14:00:00Z"), metadata: { referenceProjet: true, notification: "2026-08-07" } },
];

for (const tender of tenderSeed) {
  await db.insert(tenders).values(tender).onConflictDoUpdate({ target: [tenders.sourceId, tenders.externalId], set: { title: tender.title, buyer: tender.buyer, status: tender.status, score: tender.score, domains: tender.domains, metadata: tender.metadata, updatedAt: new Date() } });
}

const capabilityCount = await db.select({ id: capabilities.id }).from(capabilities).limit(1);
if (capabilityCount.length === 0) {
  await db.insert(capabilities).values([
    { category: "Téléphonie", label: "Migration RTC vers VoIP", owner: "DTRC" },
    { category: "Téléphonie", label: "Trunk SIP et portabilité", owner: "DTRC" },
    { category: "Téléphonie", label: "UCaaS Neoconnect+", owner: "DTRC" },
    { category: "Internet", label: "Accès FTTO avec GTR 4 h", owner: "DTRC" },
    { category: "Internet", label: "Accès FTTH et secours 4G/5G", owner: "DTRC" },
    { category: "Réseaux", label: "Wi-Fi indoor et outdoor", owner: "DTRC" },
    { category: "Cybersécurité", label: "Firewall managé Fortinet", owner: "DTRC" },
    { category: "Projet", label: "Déploiement multisite et recette", owner: "DAET" },
    { category: "Contractuel", label: "Pénalités et niveaux de service spécifiques", owner: "Juridique" },
  ]);
}

console.log(`Sources: ${sourceSeed.length} · AO importés: ${tenderSeed.length}`);
await sql.end();
