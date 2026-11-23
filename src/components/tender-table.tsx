import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { tenders } from "@/lib/db";
import { Deadline, DomainBadge, Score, StatusBadge } from "./ui";

export type TenderRow = typeof tenders.$inferSelect & { sourceName?: string | null };

export function TenderTable({ rows }: { rows: TenderRow[] }) {
  if (!rows.length) return <div className="px-5 py-12 text-center text-sm text-[#65758a]">Aucun appel d’offres ne correspond aux critères.</div>;
  return <div className="overflow-x-auto"><table className="table min-w-[850px]">
    <thead><tr><th>Consultation</th><th>Domaines</th><th>Échéance</th><th>Pertinence</th><th>Statut</th><th></th></tr></thead>
    <tbody>{rows.map((tender) => <tr key={tender.id}>
      <td className="max-w-[390px]"><Link href={`/appels-offres/${tender.id}`} className="font-semibold leading-5 hover:text-[#007fa3]">{tender.title}</Link><div className="mt-1 text-[11px] text-[#7b8999]">{tender.buyer} · {tender.department || "France"} {tender.reference && <span className="mono"> · {tender.reference}</span>}</div></td>
      <td><div className="flex max-w-[210px] flex-wrap gap-1">{tender.domains.slice(0, 3).map((domain) => <DomainBadge key={domain} domain={domain} />)}</div></td>
      <td><Deadline value={tender.deadline} /></td>
      <td><Score value={tender.score} /></td>
      <td><StatusBadge status={tender.status} /></td>
      <td><Link href={`/appels-offres/${tender.id}`} className="btn !p-2" aria-label="Ouvrir"><ArrowUpRight size={15} /></Link></td>
    </tr>)}</tbody>
  </table></div>;
}
