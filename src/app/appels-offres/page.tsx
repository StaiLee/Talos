import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { desc, eq } from "drizzle-orm";
import { db, sources, tenders } from "@/lib/db";
import { CollectButton } from "@/components/collect-button";
import { TenderTable } from "@/components/tender-table";
import { PageHeader } from "@/components/ui";
import { DOMAIN_LABELS, STATUS_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function TendersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; domain?: string; archive?: string }> }) {
  const filters = await searchParams;
  const rows = await db.select({ tender: tenders, sourceName: sources.name }).from(tenders).leftJoin(sources, eq(tenders.sourceId, sources.id)).orderBy(desc(tenders.score)).then((result) => result.map((row) => ({ ...row.tender, sourceName: row.sourceName })));
  const query = filters.q?.toLowerCase() ?? "";
  const list = rows.filter((tender) => {
    if (!filters.archive && tender.status === "archive") return false;
    if (filters.archive && tender.status !== "archive") return false;
    if (filters.status && tender.status !== filters.status) return false;
    if (filters.domain && !tender.domains.includes(filters.domain)) return false;
    return !query || `${tender.title} ${tender.buyer} ${tender.reference ?? ""}`.toLowerCase().includes(query);
  });
  return <div className="mx-auto max-w-[1500px] px-5 py-7 lg:px-8">
    <PageHeader eyebrow="Pipeline commercial" title="Appels d’offres" description={`${list.length} consultation(s) affichée(s) · ${rows.filter((row) => row.status === "detecte").length} nouvelles opportunités à qualifier.`} actions={<><Link href="/appels-offres/nouveau" className="btn"><Plus size={15} />Nouveau</Link><CollectButton /></>} />
    <div className="card mb-5 p-4"><form className="grid gap-3 md:grid-cols-[1fr_190px_190px_auto]">
      <div className="relative"><Search size={16} className="absolute left-3 top-3 text-[#8290a1]" /><input className="input !pl-9" name="q" defaultValue={filters.q} placeholder="Acheteur, consultation, référence…" /></div>
      <select className="input" name="status" defaultValue={filters.status}><option value="">Tous les statuts</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <select className="input" name="domain" defaultValue={filters.domain}><option value="">Tous les domaines</option>{Object.entries(DOMAIN_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <button className="btn btn-primary">Filtrer</button>
      {filters.archive && <input type="hidden" name="archive" value="1" />}
    </form></div>
    <div className="card overflow-hidden"><TenderTable rows={list} /></div>
    <div className="mt-4 text-right"><Link className="text-xs text-[#65758a] underline" href={filters.archive ? "/appels-offres" : "/appels-offres?archive=1"}>{filters.archive ? "Retour aux AO actifs" : "Voir les archives"}</Link></div>
  </div>;
}
