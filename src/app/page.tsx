import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, Coins, Radar } from "lucide-react";
import { and, desc, eq, gte, isNull, lte, ne, or, sql as sqlExpression } from "drizzle-orm";
import { activityEvents, aiUsage, db, sources, tenders } from "@/lib/db";
import { CollectButton } from "@/components/collect-button";
import { OpportunityChart } from "@/components/opportunity-chart";
import { TenderTable } from "@/components/tender-table";
import { PageHeader, StatusBadge } from "@/components/ui";
import { DOMAIN_LABELS } from "@/lib/constants";
import { formatDateTime, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const rows = await db.select({ tender: tenders, sourceName: sources.name }).from(tenders).leftJoin(sources, eq(tenders.sourceId, sources.id)).where(ne(tenders.status, "archive")).orderBy(desc(tenders.createdAt));
  const list = rows.map((row) => ({ ...row.tender, sourceName: row.sourceName }));
  const sourceRows = await db.select().from(sources).orderBy(sources.name);
  const usageRows = await db.select().from(aiUsage);
  const events = await db.select().from(activityEvents).orderBy(desc(activityEvents.createdAt)).limit(5);
  const active = list.filter((tender) => ["detecte", "en_cours", "depose", "shortliste", "poc"].includes(tender.status));
  const urgent = await db.select({ id: tenders.id }).from(tenders).where(and(ne(tenders.status, "archive"), gte(tenders.deadline, sqlExpression`CURRENT_TIMESTAMP`), lte(tenders.deadline, sqlExpression`CURRENT_TIMESTAMP + INTERVAL '14 days'`)));
  const totalTokens = usageRows.reduce((total, item) => total + item.inputTokens + item.outputTokens, 0);
  const domains = Object.entries(active.flatMap((tender) => tender.domains).reduce<Record<string, number>>((acc, domain) => ({ ...acc, [domain]: (acc[domain] ?? 0) + 1 }), {})).map(([name, value]) => ({ name: DOMAIN_LABELS[name] ?? name, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  const availableRows = await db.select({ id: tenders.id }).from(tenders).where(and(ne(tenders.status, "archive"), or(isNull(tenders.deadline), gte(tenders.deadline, sqlExpression`CURRENT_TIMESTAMP`))));
  const availableIds = new Set(availableRows.map((row) => row.id));
  const upcoming = active.filter((tender) => availableIds.has(tender.id)).sort((a, b) => (a.deadline?.getTime() ?? Infinity) - (b.deadline?.getTime() ?? Infinity)).slice(0, 6);
  const stats = [
    { label: "Opportunités suivies", value: active.length, detail: `${list.filter((tender) => tender.status === "detecte").length} à qualifier`, icon: Radar },
    { label: "Échéances sous 14 jours", value: urgent.length, detail: "Priorité de production", icon: Clock3 },
    { label: "Dossiers déposés", value: list.filter((tender) => tender.status === "depose").length, detail: `${list.filter((tender) => tender.status === "gagne").length} marché gagné référencé`, icon: CheckCircle2 },
    { label: "Tokens consommés", value: formatNumber(totalTokens), detail: "Entrées + sorties · toutes API", icon: Coins },
  ];
  return <div className="mx-auto max-w-[1500px] px-5 py-7 lg:px-8">
    <PageHeader eyebrow="Centre de commandement" title="Bonjour Ilyes, voici l’activité Talos." description="Détection, qualification et production des réponses aux appels d’offres Paritel." actions={<CollectButton />} />
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map((stat) => <div key={stat.label} className="card p-5"><div className="flex items-start justify-between"><div className="text-xs font-medium text-[#65758a]">{stat.label}</div><stat.icon size={18} className="text-[#b76d20]" /></div><div className="mt-4 text-[30px] font-bold tracking-[-.04em]">{stat.value}</div><div className="mt-1 text-[11px] text-[#8290a1]">{stat.detail}</div></div>)}</section>
    <section className="mt-5 grid gap-5 xl:grid-cols-[1.65fr_1fr]">
      <div className="card overflow-hidden"><div className="flex items-center justify-between border-b border-[#e8edf1] px-5 py-4"><div><div className="card-title">Opportunités prioritaires</div><div className="mt-1 text-[11px] text-[#8290a1]">Classement par date de remise</div></div><Link href="/appels-offres" className="flex items-center gap-1 text-xs font-semibold text-[#b76d20]">Tout voir <ArrowRight size={14} /></Link></div><TenderTable rows={upcoming} /></div>
      <div className="card p-5"><div className="card-title">Couverture par domaine</div><div className="mt-1 text-[11px] text-[#8290a1]">Opportunités actives dans le pipeline</div><div className="mt-4"><OpportunityChart data={domains} /></div></div>
    </section>
    <section className="mt-5 grid gap-5 xl:grid-cols-2">
      <div className="card p-5"><div className="mb-4 flex items-center justify-between"><div className="card-title">Santé des sources</div><Link href="/sources" className="text-xs font-semibold text-[#b76d20]">Gérer</Link></div><div className="space-y-3">{sourceRows.slice(0, 6).map((source) => <div key={source.id} className="flex items-center justify-between gap-3 border-b border-[#edf0f3] pb-3 last:border-0 last:pb-0"><div><div className="text-xs font-semibold">{source.name}</div><div className="mt-1 text-[10px] text-[#8290a1]">{source.lastSyncAt ? `Synchronisé ${formatDateTime(source.lastSyncAt)}` : "En attente de première collecte"}</div></div><StatusBadge status={source.status} /></div>)}</div></div>
      <div className="card p-5"><div className="card-title">Activité récente</div><div className="mt-4 space-y-4">{events.length ? events.map((event) => <div key={event.id} className="flex gap-3"><div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#c57d2a]" /><div><div className="text-xs leading-5">{event.message}</div><div className="mt-1 text-[10px] text-[#8290a1]">{formatDateTime(event.createdAt)}</div></div></div>) : <div className="text-sm text-[#65758a]">Les événements de collecte et d’analyse apparaîtront ici.</div>}</div></div>
    </section>
  </div>;
}
