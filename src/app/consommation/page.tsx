import { desc } from "drizzle-orm";
import { aiUsage, db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { formatDateTime, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function UsagePage() {
  const rows = await db.select().from(aiUsage).orderBy(desc(aiUsage.createdAt)).limit(200);
  const input = rows.reduce((sum, row) => sum + row.inputTokens, 0);
  const output = rows.reduce((sum, row) => sum + row.outputTokens, 0);
  const cached = rows.reduce((sum, row) => sum + row.cachedTokens, 0);
  const costs = rows.reduce<Record<string, number>>((totals, row) => ({ ...totals, [row.currency]: (totals[row.currency] ?? 0) + Number(row.costEuros) }), {});
  const cards = [{ label: "Tokens d’entrée", value: input }, { label: "Tokens de sortie", value: output }, { label: "Tokens en cache", value: cached }];
  return <div className="mx-auto max-w-[1500px] px-5 py-7 lg:px-8"><PageHeader eyebrow="Finances & exploitation" title="Tokens & coûts API" description="Chaque appel IA est rattaché à une opération et, lorsque possible, à un appel d’offres." />
    <div className="grid gap-4 md:grid-cols-4">{cards.map((card) => <div className="card p-5" key={card.label}><div className="text-xs text-[#65758a]">{card.label}</div><div className="mt-3 text-2xl font-bold">{formatNumber(card.value)}</div></div>)}<div className="card p-5"><div className="text-xs text-[#65758a]">Coût API estimé</div><div className="mt-3 text-2xl font-bold">{Object.entries(costs).length ? Object.entries(costs).map(([currency, value]) => <div key={currency}>{value.toLocaleString("fr-FR", { style: "currency", currency })}</div>) : (0).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</div></div></div>
    <div className="card mt-5 overflow-hidden"><table className="table"><thead><tr><th>Date</th><th>Opération</th><th>Modèle</th><th>Entrée</th><th>Sortie</th><th>Cache</th><th>Coût</th></tr></thead><tbody>{rows.length ? rows.map((row) => <tr key={row.id}><td>{formatDateTime(row.createdAt)}</td><td>{row.operation}</td><td className="mono text-xs">{row.model}</td><td>{formatNumber(row.inputTokens)}</td><td>{formatNumber(row.outputTokens)}</td><td>{formatNumber(row.cachedTokens)}</td><td>{Number(row.costEuros).toLocaleString("fr-FR", { style: "currency", currency: row.currency, minimumFractionDigits: 4 })}</td></tr>) : <tr><td colSpan={7} className="py-12 text-center text-[#65758a]">Aucun appel API enregistré. Les analyses en mode règles ne consomment aucun token.</td></tr>}</tbody></table></div>
  </div>;
}
