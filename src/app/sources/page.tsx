import { desc, eq } from "drizzle-orm";
import { collectionRuns, db, sources } from "@/lib/db";
import { CollectButton } from "@/components/collect-button";
import { PageHeader, StatusBadge } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  const sourceRows = await db.select().from(sources).orderBy(sources.name);
  const runs = await db.select({ run: collectionRuns, sourceName: sources.name }).from(collectionRuns).leftJoin(sources, eq(collectionRuns.sourceId, sources.id)).orderBy(desc(collectionRuns.startedAt)).limit(12);
  return <div className="mx-auto max-w-[1500px] px-5 py-7 lg:px-8"><PageHeader eyebrow="Acquisition" title="Sources & collecte" description="API officielles en priorité, navigateur automatisé lorsque la plateforme l’exige." actions={<><CollectButton /><CollectButton source="aji" label="Actualiser AJI" /></>} />
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{sourceRows.map((source) => <div key={source.id} className="card p-5"><div className="flex items-start justify-between gap-3"><div><div className="text-sm font-bold">{source.name}</div><a href={source.url} target="_blank" rel="noreferrer" className="mt-1 block truncate text-[11px] text-[#8290a1]">{source.url}</a></div><StatusBadge status={source.status} /></div><div className="mt-5 flex items-center justify-between border-t border-[#edf0f3] pt-4"><span className="badge bg-[#edf2f7] text-[#52667b]">{source.kind.toUpperCase()}</span><span className="text-[10px] text-[#8290a1]">{source.lastSyncAt ? formatDateTime(source.lastSyncAt) : "Jamais synchronisé"}</span></div>{source.lastError && <div className="mt-3 text-xs text-red-700">{source.lastError}</div>}</div>)}</div>
    <div className="card mt-6 overflow-hidden"><div className="border-b border-[#e8edf1] px-5 py-4"><div className="card-title">Dernières exécutions</div></div><table className="table"><thead><tr><th>Source</th><th>Démarrage</th><th>Détectés</th><th>Créés</th><th>Mis à jour</th><th>Statut</th></tr></thead><tbody>{runs.map(({ run, sourceName }) => <tr key={run.id}><td>{sourceName}</td><td>{formatDateTime(run.startedAt)}</td><td>{run.discovered}</td><td>{run.created}</td><td>{run.updated}</td><td><StatusBadge status={run.status} /></td></tr>)}</tbody></table></div>
  </div>;
}
