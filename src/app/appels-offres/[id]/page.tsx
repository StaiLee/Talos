import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, ExternalLink, FileText } from "lucide-react";
import { desc, eq } from "drizzle-orm";
import { db, documents, requirements, responses, sources, tenders } from "@/lib/db";
import { TenderActions } from "@/components/tender-actions";
import { Deadline, DomainBadge, GoBadge, PageHeader, Score, StatusBadge } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TenderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row] = await db.select({ tender: tenders, sourceName: sources.name }).from(tenders).leftJoin(sources, eq(tenders.sourceId, sources.id)).where(eq(tenders.id, id)).limit(1);
  if (!row) notFound();
  const tender = row.tender;
  const documentList = await db.select().from(documents).where(eq(documents.tenderId, id)).orderBy(desc(documents.createdAt));
  const requirementList = await db.select().from(requirements).where(eq(requirements.tenderId, id));
  const responseList = await db.select().from(responses).where(eq(responses.tenderId, id)).orderBy(desc(responses.createdAt));
  const analysis = tender.metadata.analysis as { summary?: string; note?: string } | undefined;
  return <div className="mx-auto max-w-[1500px] px-5 py-7 lg:px-8">
    <Link href="/appels-offres" className="mb-5 inline-flex items-center gap-2 text-xs font-semibold text-[#65758a]"><ArrowLeft size={14} />Retour au pipeline</Link>
    <PageHeader eyebrow={`${row.sourceName ?? "Source"} · ${tender.reference ?? "Sans référence"}`} title={tender.title} description={tender.description ?? "La description sera enrichie par l’analyse du DCE."} actions={<StatusBadge status={tender.status} />} />
    <div className="card mb-5 p-5"><TenderActions tenderId={tender.id} goDecision={tender.goDecision} /></div>
    <section className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
      <div className="space-y-5">
        {analysis?.summary && <div className="card border-l-4 border-l-[#c57d2a] p-5"><div className="card-title">Synthèse de l’analyse</div><p className="mt-3 text-sm leading-6 text-[#52667b]">{analysis.summary}</p></div>}
        <div className="card overflow-hidden"><div className="border-b border-[#e8edf1] px-5 py-4"><div className="card-title">Matrice de conformité</div><div className="mt-1 text-[11px] text-[#8290a1]">{requirementList.length} exigence(s) · validation humaine requise</div></div>
          {requirementList.length ? <div className="overflow-x-auto"><table className="table min-w-[700px]"><thead><tr><th>Exigence</th><th>Catégorie</th><th>Niveau</th><th>Confiance</th></tr></thead><tbody>{requirementList.map((item) => <tr key={item.id}><td className="max-w-[480px]"><div className="font-medium leading-5">{item.description}</div>{item.evidence && <div className="mt-1 line-clamp-2 text-[10px] italic text-[#8290a1]">« {item.evidence} »</div>}</td><td className="text-xs">{item.category}</td><td><span className={`badge ${item.mandatory ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"}`}>{item.mandatory ? "Obligatoire" : "Standard"}</span></td><td className="text-xs">{item.confidence} %</td></tr>)}</tbody></table></div> : <div className="p-8 text-center text-sm text-[#65758a]">Importez le DCE puis lancez l’analyse pour construire la matrice.</div>}
        </div>
        <div className="card overflow-hidden"><div className="border-b border-[#e8edf1] px-5 py-4"><div className="card-title">Documents du DCE</div></div>{documentList.length ? <div className="divide-y divide-[#edf0f3]">{documentList.map((document) => <div key={document.id} className="flex items-center gap-3 px-5 py-3"><FileText size={18} className="shrink-0 text-[#65758a]" /><div className="min-w-0 flex-1"><div className="truncate text-xs font-semibold">{document.filename}</div><div className="mt-1 text-[10px] uppercase text-[#8290a1]">{document.kind} · {document.pageCount ?? 1} page(s)/feuille(s)</div></div><StatusBadge status={document.status} /></div>)}</div> : <div className="p-8 text-center text-sm text-[#65758a]">Aucun document importé.</div>}</div>
      </div>
      <aside className="space-y-5">
        <div className="card p-5"><div className="card-title">Qualification</div><div className="mt-4 flex items-center justify-between"><span className="text-xs text-[#65758a]">Pertinence catalogue</span><Score value={tender.score} /></div><div className="mt-4 flex items-center justify-between"><span className="text-xs text-[#65758a]">Décision</span><GoBadge value={tender.goDecision} /></div><div className="mt-4 border-t border-[#edf0f3] pt-4"><div className="mb-2 text-[10px] uppercase tracking-wider text-[#8290a1]">Date de remise</div><Deadline value={tender.deadline} /></div><div className="mt-4 flex flex-wrap gap-1">{tender.domains.map((domain) => <DomainBadge key={domain} domain={domain} />)}</div>{tender.url && <a href={tender.url} target="_blank" rel="noreferrer" className="btn mt-5 w-full">Ouvrir la source <ExternalLink size={14} /></a>}</div>
        <div className="card p-5"><div className="card-title">Dossiers générés</div><div className="mt-3 space-y-2">{responseList.length ? responseList.map((response) => <a key={response.id} href={`/api/responses/${response.id}/download`} className="flex items-center gap-3 rounded-lg border border-[#e3e8ed] p-3 hover:border-[#c57d2a]"><Download size={15} className="text-[#b76d20]" /><div className="min-w-0 flex-1"><div className="truncate text-xs font-semibold">{response.filename}</div><div className="mt-1 text-[10px] text-[#8290a1]">v{response.version} · {formatDateTime(response.createdAt)}</div></div></a>) : <div className="text-xs leading-5 text-[#65758a]">Le mémoire Word/PDF et la matrice Excel seront disponibles ici.</div>}</div></div>
      </aside>
    </section>
  </div>;
}
