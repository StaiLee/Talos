"use client";

import { Check, Download, FileOutput, FileSearch, FolderDown, MapPinCheck, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

function Step({ number, title, description, done, children }: { number: number; title: string; description: string; done: boolean; children: React.ReactNode }) {
  return <div className="grid gap-4 border-b border-[#edf0f3] px-5 py-5 last:border-0 md:grid-cols-[42px_1fr_auto] md:items-center">
    <div className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${done ? "bg-emerald-50 text-emerald-700" : "bg-[#edf2f7] text-[#52667b]"}`}>{done ? <Check size={17} /> : number}</div>
    <div><div className="text-sm font-bold">{title}</div><p className="mt-1 max-w-2xl text-xs leading-5 text-[#65758a]">{description}</p><div className="mt-3 md:hidden">{children}</div></div>
    <div className="hidden md:block">{children}</div>
  </div>;
}

export function GuidedWorkflow({ tenderId, sourceSlug, documentCount, requirementCount, responseCount, goDecision, status }: { tenderId: string; sourceSlug?: string; documentCount: number; requirementCount: number; responseCount: number; goDecision: string; status: string }) {
  const [loading, setLoading] = useState("");
  const [message, setMessage] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  async function action(name: "dce" | "analyze" | "generate") {
    setLoading(name); setMessage("");
    try {
      const response = await fetch(`/api/tenders/${tenderId}/${name}`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setMessage(name === "dce" ? "Les documents du client sont maintenant disponibles dans le dossier." : name === "analyze" ? "L’analyse est terminée. Relisez les demandes extraites ci-dessous." : "Votre projet de réponse est prêt à être relu et téléchargé.");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
    finally { setLoading(""); }
  }
  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setLoading("upload"); setMessage("");
    try {
      const form = new FormData(); Array.from(files).forEach((file) => form.append("files", file));
      const response = await fetch(`/api/tenders/${tenderId}/documents`, { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setMessage("Les documents ont été ajoutés au dossier."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
    finally { setLoading(""); if (input.current) input.current.value = ""; }
  }
  async function update(field: "goDecision" | "status", value: string) {
    await fetch(`/api/tenders/${tenderId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ [field]: value }) });
    router.refresh();
  }
  return <div className="card overflow-hidden">
    <div className="border-b border-[#e8edf1] bg-[#f8fafb] px-5 py-4"><div className="card-title">Répondre à cette offre, étape par étape</div><p className="mt-1 text-[11px] text-[#65758a]">Suivez les étapes dans l’ordre. Talos vous indique ce qui est terminé et ce qui reste à faire.</p></div>
    <Step number={1} title="Récupérer les documents du client" description="Le client fournit généralement un cahier des charges, des formulaires et parfois un tableau de prix. Ils expliquent exactement ce qu’il attend." done={documentCount > 0}>
      {documentCount > 0 ? <a href="#documents-client" className="btn">Voir les documents</a> : sourceSlug === "aji" ? <button className="btn btn-primary" disabled={Boolean(loading)} onClick={() => action("dce")}><FolderDown size={15} />{loading === "dce" ? "Récupération…" : "Récupérer les documents"}</button> : <button className="btn btn-primary" onClick={() => input.current?.click()}><Upload size={15} />Choisir les fichiers</button>}
    </Step>
    <Step number={2} title="Comprendre ce que le client demande" description="Talos lit les documents et liste les exigences, dates, pièces obligatoires et critères de sélection. Vous pourrez vérifier chaque ligne." done={requirementCount > 0}>
      <button className="btn btn-primary" disabled={!documentCount || Boolean(loading)} onClick={() => action("analyze")}><FileSearch size={15} />{loading === "analyze" ? "Lecture…" : requirementCount ? "Relancer l’analyse" : "Analyser les documents"}</button>
    </Step>
    <Step number={3} title="Vérifier que Paritel peut répondre" description="Testez la fibre du site, relisez les exigences et vérifiez les prix, délais et engagements avant de prendre votre décision." done={goDecision === "go"}>
      <div className="flex flex-wrap items-center gap-2"><a href="#eligibilite" className="btn"><MapPinCheck size={15} />Tester le site</a><select className="input !w-auto !py-2 text-xs" value={goDecision} onChange={(event) => update("goDecision", event.target.value)}><option value="a_evaluer">Décision à prendre</option><option value="go">Je valide la réponse</option><option value="sous_conditions">Possible sous conditions</option><option value="no_go">Je ne réponds pas</option></select></div>
    </Step>
    <Step number={4} title="Préparer le projet de réponse" description="Talos génère un projet de mémoire technique et une matrice de conformité. Les prix et engagements doivent être relus avant utilisation." done={responseCount > 0}>
      <button className="btn btn-accent" disabled={!requirementCount || Boolean(loading)} onClick={() => action("generate")}><FileOutput size={15} />{loading === "generate" ? "Préparation…" : responseCount ? "Mettre à jour ma réponse" : "Préparer ma réponse"}</button>
    </Step>
    <Step number={5} title="Télécharger le dossier et postuler" description="Le ZIP regroupe les documents du client, votre projet de réponse et un guide expliquant comment déposer l’offre. La validation finale reste humaine." done={status === "depose" || status === "gagne"}>
      {responseCount ? <a href={`/api/tenders/${tenderId}/package`} className="btn btn-primary"><Download size={15} />Télécharger mon dossier</a> : <button className="btn" disabled>Dossier pas encore prêt</button>}
    </Step>
    <div className="bg-[#f8fafb] px-5 py-4"><details><summary className="cursor-pointer text-xs font-semibold text-[#65758a]">Options du dossier</summary><div className="mt-4 flex flex-wrap items-center gap-3"><input ref={input} type="file" multiple className="hidden" onChange={(event) => upload(event.target.files)} accept=".pdf,.docx,.xlsx,.xlsm,.csv,.txt,.xml" /><button className="btn" disabled={Boolean(loading)} onClick={() => input.current?.click()}><Upload size={15} />Ajouter des fichiers</button><select className="input !w-auto !py-2 text-xs" value={status} onChange={(event) => update("status", event.target.value)}><option value="detecte">Nouveau</option><option value="en_cours">En cours</option><option value="depose">Déposé</option><option value="shortliste">Shortlisté</option><option value="poc">POC</option><option value="gagne">Gagné</option><option value="perdu_non_retenu">Perdu · non retenu</option><option value="perdu_soutenance">Perdu · soutenance</option><option value="archive">Archivé</option></select></div></details></div>
    {message && <div className="border-t border-[#edf0f3] px-5 py-3 text-xs text-[#52667b]">{message}</div>}
  </div>;
}
