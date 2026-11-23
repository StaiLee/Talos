import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { desc, eq } from "drizzle-orm";
import { db, sources, tenders } from "@/lib/db";
import { CollectButton } from "@/components/collect-button";
import { TenderTable } from "@/components/tender-table";
import { PageHeader } from "@/components/ui";
import { DOMAIN_LABELS, STATUS_LABELS } from "@/lib/constants";
import { isArchivedStatus } from "@/lib/tender-lifecycle";

export const dynamic = "force-dynamic";

const views = [
  { slug: "nouveaux", label: "Nouveaux" },
  { slug: "en_cours", label: "En cours" },
  { slug: "archives", label: "Archives" },
  { slug: "tous", label: "Tous" },
];

export default async function TendersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; domain?: string; view?: string; archive?: string }> }) {
  const filters = await searchParams;
  const currentView = filters.view ?? (filters.archive ? "archives" : "nouveaux");
  const rows = await db.select({ tender: tenders, sourceName: sources.name }).from(tenders).leftJoin(sources, eq(tenders.sourceId, sources.id)).orderBy(desc(tenders.score)).then((result) => result.map((row) => ({ ...row.tender, sourceName: row.sourceName })));
  const query = filters.q?.toLowerCase() ?? "";
  const list = rows.filter((tender) => {
    if (currentView === "nouveaux" && tender.status !== "detecte") return false;
    if (currentView === "en_cours" && !["en_cours", "shortliste", "poc"].includes(tender.status)) return false;
    if (currentView === "archives" && !isArchivedStatus(tender.status)) return false;
    if (currentView === "nouveaux" && isArchivedStatus(tender.status)) return false;
    if (filters.status && tender.status !== filters.status) return false;
    if (filters.domain && !tender.domains.includes(filters.domain)) return false;
    return !query || `${tender.title} ${tender.buyer} ${tender.reference ?? ""}`.toLowerCase().includes(query);
  });
  return <div className="mx-auto max-w-[1500px] px-5 py-7 lg:px-8">
    <PageHeader eyebrow="Pipeline commercial" title="Appels d’offres" description={`Consultations affichées : ${list.length} · Nouvelles opportunités à qualifier : ${rows.filter((row) => row.status === "detecte").length}.`} actions={<><Link href="/appels-offres/nouveau" className="btn"><Plus size={15} />Nouveau</Link><CollectButton /></>} />
    <div className="mb-4 flex flex-wrap gap-1 rounded-xl border border-[#dfe5eb] bg-white p-1">{views.map((view) => {
      const count = rows.filter((row) => view.slug === "nouveaux" ? row.status === "detecte" : view.slug === "en_cours" ? ["en_cours", "shortliste", "poc"].includes(row.status) : view.slug === "archives" ? isArchivedStatus(row.status) : true).length;
      return <Link key={view.slug} href={`/appels-offres?view=${view.slug}`} className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${currentView === view.slug ? "bg-[#0c2340] text-white" : "text-[#65758a] hover:bg-[#f4f6f8]"}`}>{view.label}<span className={`ml-2 ${currentView === view.slug ? "text-white/60" : "text-[#a0acb9]"}`}>{count}</span></Link>;
    })}</div>
    <div className="card mb-5 p-4"><form className="grid gap-3 md:grid-cols-[1fr_190px_190px_auto]">
      <input type="hidden" name="view" value={currentView} />
      <div className="relative"><Search size={16} className="absolute left-3 top-3 text-[#8290a1]" /><input className="input !pl-9" name="q" defaultValue={filters.q} placeholder="Acheteur, consultation, référence…" /></div>
      <select className="input" name="status" defaultValue={filters.status}><option value="">Tous les statuts</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <select className="input" name="domain" defaultValue={filters.domain}><option value="">Tous les domaines</option>{Object.entries(DOMAIN_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <button className="btn btn-primary">Filtrer</button>
    </form></div>
    <div className="card overflow-hidden"><TenderTable rows={list} /></div>
  </div>;
}
