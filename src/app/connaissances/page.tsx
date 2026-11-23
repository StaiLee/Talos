import { db, capabilities } from "@/lib/db";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function KnowledgePage() {
  const rows = await db.select().from(capabilities).orderBy(capabilities.category, capabilities.label);
  const validated = rows.filter((row) => row.status === "valide").length;
  return <div className="mx-auto max-w-[1500px] px-5 py-7 lg:px-8"><PageHeader eyebrow="Référentiel métier" title="Base de connaissance Paritel" description="Les capacités sont séparées des sources brutes. Seules les informations validées pourront devenir des engagements dans une réponse." />
    <div className="card mb-5 border-l-4 border-l-[#c57d2a] p-5"><div className="text-sm font-bold">Validation métier nécessaire</div><p className="mt-2 text-xs leading-5 text-[#65758a]">{validated} capacité(s) validée(s) sur {rows.length}. Les éléments « à vérifier » restent utilisables pour l’analyse, mais pas comme promesse contractuelle.</p></div>
    <div className="card overflow-hidden"><table className="table"><thead><tr><th>Catégorie</th><th>Capacité</th><th>Responsable</th><th>Niveau</th><th>Validation</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td className="font-semibold">{row.category}</td><td>{row.label}</td><td>{row.owner ?? "—"}</td><td>{row.level ?? "Non évalué"}</td><td><span className="badge bg-amber-50 text-amber-700">{row.status === "valide" ? "Validé" : "À vérifier"}</span></td></tr>)}</tbody></table></div>
  </div>;
}
