import { CheckCircle2, Circle, Download, ShieldCheck } from "lucide-react";

export function SubmissionPanel({ tenderId, documentCount, requirementCount, unreviewedCount, responseCount, goDecision, hasDocumentError, address, submission }: { tenderId: string; documentCount: number; requirementCount: number; unreviewedCount: number; responseCount: number; goDecision: string; hasDocumentError: boolean; address?: string; submission?: string }) {
  const checks = [
    { label: "DCE récupéré", done: documentCount > 0 },
    { label: "Documents exploitables", done: documentCount > 0 && !hasDocumentError },
    { label: "Exigences analysées", done: requirementCount > 0 },
    { label: "Exigences obligatoires revues", done: requirementCount > 0 && unreviewedCount === 0 },
    { label: "Dossier de réponse généré", done: responseCount > 0 },
    { label: "Go validé par Paritel", done: goDecision === "go" },
  ];
  const ready = checks.every((check) => check.done);
  return <div className="card p-5"><div className="flex items-center justify-between"><div className="card-title">Préparation du dépôt</div><span className={`badge ${ready ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{ready ? "Prêt" : `${checks.filter((check) => check.done).length}/${checks.length}`}</span></div>
    <div className="mt-4 space-y-2">{checks.map((check) => <div key={check.label} className="flex items-center gap-2 text-xs">{check.done ? <CheckCircle2 size={15} className="text-emerald-600" /> : <Circle size={15} className="text-[#a5b0bc]" />}<span className={check.done ? "text-[#334d66]" : "text-[#8290a1]"}>{check.label}</span></div>)}</div>
    {address && <div className="mt-4 border-t border-[#edf0f3] pt-3 text-[11px] leading-5 text-[#65758a]"><strong>Site :</strong> {address}</div>}
    <div className="mt-3 text-[11px] leading-5 text-[#65758a]"><strong>Remise :</strong> {submission || "Consulter le RC et la plateforme source."}</div>
    <div className="mt-3 flex gap-2 rounded-lg bg-[#f4f6f8] p-3 text-[10px] leading-4 text-[#65758a]"><ShieldCheck size={16} className="shrink-0" />L’IA prépare et contrôle. La signature et le dépôt final restent validés par Paritel.</div>
    {responseCount > 0 ? <a href={`/api/tenders/${tenderId}/package`} className="btn btn-primary mt-4 w-full"><Download size={15} />Télécharger le dossier ZIP</a> : <button className="btn mt-4 w-full" disabled>Générer le dossier avant le ZIP</button>}
  </div>;
}
