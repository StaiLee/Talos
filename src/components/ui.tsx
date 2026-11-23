import { DOMAIN_LABELS, GO_LABELS, STATUS_LABELS } from "@/lib/constants";
import { daysUntil, formatDate } from "@/lib/utils";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: React.ReactNode }) {
  return <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
    <div>{eyebrow && <div className="mb-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#007fa3]">{eyebrow}</div>}<h1 className="text-[28px] font-bold tracking-[-.035em] text-[#0c2340]">{title}</h1>{description && <p className="mt-2 max-w-3xl text-sm leading-6 text-[#65758a]">{description}</p>}</div>
    {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
  </div>;
}

export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    gagne: "bg-emerald-50 text-emerald-700", depose: "bg-blue-50 text-blue-700", en_cours: "bg-amber-50 text-amber-700", detecte: "bg-slate-100 text-slate-600", archive: "bg-slate-100 text-slate-500", active: "bg-emerald-50 text-emerald-700", erreur: "bg-red-50 text-red-700", extrait: "bg-emerald-50 text-emerald-700", ocr_requis: "bg-orange-50 text-orange-700", brouillon: "bg-slate-100 text-slate-600",
  };
  return <span className={`badge ${colors[status] ?? "bg-slate-100 text-slate-600"}`}>{STATUS_LABELS[status] ?? status.replaceAll("_", " ")}</span>;
}

export function DomainBadge({ domain }: { domain: string }) {
  return <span className="badge border border-[#dfe5eb] bg-white text-[#52667b]">{DOMAIN_LABELS[domain] ?? domain}</span>;
}

export function Deadline({ value }: { value: Date | string | null }) {
  const days = daysUntil(value);
  const urgent = days !== null && days <= 7 && days >= 0;
  return <div><div className={urgent ? "font-semibold text-[#b4552d]" : ""}>{formatDate(value)}</div>{days !== null && <div className="mt-0.5 text-[10px] text-[#8290a1]">{days < 0 ? `Clôturé depuis ${Math.abs(days)} j` : days === 0 ? "Aujourd’hui" : `J-${days}`}</div>}</div>;
}

export function GoBadge({ value }: { value: string }) {
  const colors: Record<string, string> = { go: "bg-emerald-50 text-emerald-700", no_go: "bg-red-50 text-red-700", sous_conditions: "bg-amber-50 text-amber-700", a_evaluer: "bg-slate-100 text-slate-600" };
  return <span className={`badge ${colors[value]}`}>{GO_LABELS[value] ?? value}</span>;
}

export function Score({ value }: { value: number | null }) {
  const color = (value ?? 0) >= 75 ? "#168265" : (value ?? 0) >= 55 ? "#007fa3" : "#8290a1";
  return <div className="flex items-center gap-2"><div className="h-1.5 w-14 overflow-hidden rounded-full bg-[#e8edf1]"><div className="h-full rounded-full" style={{ width: `${value ?? 0}%`, background: color }} /></div><span className="text-xs font-bold" style={{ color }}>{value ?? "—"}</span></div>;
}
