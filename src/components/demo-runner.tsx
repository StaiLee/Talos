"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, Check, CheckCircle2, Circle, Coins, Download, ExternalLink, FileCheck2, FileSearch, FileText, LoaderCircle, Play, RotateCcw, ShieldCheck, Sparkles, XCircle } from "lucide-react";

type TenderOption = { id: string; title: string; buyer: string; documentCount: number };
type StepStatus = "attente" | "active" | "termine" | "a_verifier" | "erreur";
type DemoStep = { title: string; agent: string; description: string; status: StepStatus; detail?: string };
type Prepared = {
  tender: { id: string; title: string; buyer: string; reference: string | null; deadline: string | null; sourceName: string };
  documentCount: number;
  readableDocuments: number;
  address: string;
  eligibility: Eligibility | null;
};
type Eligibility = { id: string; status: string; summary: string | null };
type Analysis = {
  requirements: number;
  documents: number;
  summary?: string;
  qualification?: { decision: "go" | "sous_conditions" | "no_go"; rationale: string; matches: { requirement: string; capability: string | null; status: "conforme" | "sous_conditions" | "non_documente"; note: string }[] };
};
type GeneratedDocument = { id: string; kind: string; filename: string };
type Audit = { verdict: "pret_pour_revue" | "corrections_requises"; strengths: string[]; issues: { severity: "critique" | "important" | "a_verifier"; label: string; detail: string }[]; humanChecks: string[] };
type Usage = { calls: number; inputTokens: number; outputTokens: number; cachedTokens: number; costs: Record<string, number>; model: string | null };

const initialSteps: DemoStep[] = [
  { title: "Sélection et récupération du DCE", agent: "Orchestrateur", description: "Choix d’un dossier exploitable et lecture des documents publics.", status: "attente" },
  { title: "Analyse du cahier des charges", agent: "Agent Analyste", description: "Extraction du besoin, des exigences et de leurs preuves.", status: "attente" },
  { title: "Qualification Paritel", agent: "Agent Qualification", description: "Comparaison avec les capacités connues et validées de Paritel.", status: "attente" },
  { title: "Éligibilité du site", agent: "Outil SFR Business", description: "Contrôle FTTH / FTTO si le DCE fournit une adresse complète.", status: "attente" },
  { title: "Rédaction du projet de réponse", agent: "Agent Rédaction", description: "Création du mémoire Word/PDF et de la matrice Excel.", status: "attente" },
  { title: "Contrôle qualité et conformité", agent: "Agent Contrôleur", description: "Audit du mémoire généré et identification des validations humaines.", status: "attente" },
  { title: "Envoi simulé", agent: "Validation humaine", description: "Visualisation de la remise, sans transmission et sans statut Déposé.", status: "attente" },
];

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? `Erreur HTTP ${response.status}`);
  return result as T;
}

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const decisionLabels = { go: "Go proposé", sous_conditions: "Go sous conditions", no_go: "No-Go proposé" };
const matchLabels = { conforme: "Capacité validée", sous_conditions: "Sous conditions", non_documente: "Non documenté" };

export function DemoRunner({ tenders, configured }: { tenders: TenderOption[]; configured: boolean }) {
  const [selectedId, setSelectedId] = useState("");
  const [steps, setSteps] = useState<DemoStep[]>(initialSteps);
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [generated, setGenerated] = useState<GeneratedDocument[]>([]);
  const [audit, setAudit] = useState<Audit | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState("");

  function updateStep(index: number, status: StepStatus, detail?: string) {
    setSteps((current) => current.map((step, stepIndex) => stepIndex === index ? { ...step, status, detail } : step));
  }

  async function refreshUsage(tenderId: string, since: string) {
    const result = await api<Usage>(`/api/demo/usage?tenderId=${tenderId}&since=${encodeURIComponent(since)}`);
    setUsage(result);
  }

  function reset() {
    setSteps(initialSteps.map((step) => ({ ...step })));
    setPrepared(null); setAnalysis(null); setGenerated([]); setAudit(null); setUsage(null); setFinished(false); setError("");
  }

  async function run() {
    reset();
    setRunning(true);
    const startedAt = new Date().toISOString();
    let activeStep = 0;
    try {
      updateStep(0, "active", "Recherche d’un dossier avec un DCE lisible…");
      const preparedResult = await api<Prepared>("/api/demo/prepare", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tenderId: selectedId || undefined }) });
      setPrepared(preparedResult);
      const tenderId = preparedResult.tender.id;
      updateStep(0, "termine", `${preparedResult.documentCount} document(s) · ${preparedResult.readableDocuments} lisible(s) · ${preparedResult.tender.sourceName}`);

      activeStep = 1; updateStep(1, "active", "DeepSeek lit le DCE et recherche les preuves…");
      const analysisResult = await api<Analysis>(`/api/tenders/${tenderId}/analyze`, { method: "POST" });
      setAnalysis(analysisResult);
      await refreshUsage(tenderId, startedAt);
      updateStep(1, "termine", `${analysisResult.requirements} exigences extraites sur ${analysisResult.documents} document(s)`);
      activeStep = 2; updateStep(2, "active", "Confrontation aux capacités Paritel…");
      updateStep(2, analysisResult.qualification?.decision === "no_go" ? "a_verifier" : "termine", analysisResult.qualification ? decisionLabels[analysisResult.qualification.decision] : "Qualification indisponible");

      activeStep = 3; updateStep(3, "active", "Vérification de l’adresse et des résultats disponibles…");
      let eligibility = preparedResult.eligibility;
      if (eligibility && eligibility.status !== "en_cours") {
        updateStep(3, eligibility.status === "eligible" ? "termine" : "a_verifier", eligibility.summary ?? "Résultat SFR disponible");
      } else if (!/\d+/.test(preparedResult.address) || !/\b\d{5}\b/.test(preparedResult.address)) {
        updateStep(3, "a_verifier", "Adresse complète absente : éligibilité à contrôler manuellement");
      } else {
        if (!eligibility) {
          eligibility = await api<Eligibility>("/api/eligibility", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tenderId, address: preparedResult.address, operator: "sfr" }) });
        }
        for (let attempt = 0; attempt < 36 && eligibility?.status === "en_cours"; attempt += 1) {
          await wait(5_000);
          const checks = await api<Eligibility[]>(`/api/eligibility?tenderId=${tenderId}`);
          eligibility = checks.find((check) => check.id === eligibility?.id) ?? checks[0] ?? eligibility;
        }
        updateStep(3, eligibility?.status === "eligible" ? "termine" : "a_verifier", eligibility?.summary ?? "Le contrôle SFR devra être revu");
      }

      activeStep = 4; updateStep(4, "active", "DeepSeek rédige le mémoire à partir des exigences…");
      const generation = await api<{ documents: GeneratedDocument[] }>(`/api/tenders/${tenderId}/generate`, { method: "POST" });
      setGenerated(generation.documents);
      await refreshUsage(tenderId, startedAt);
      updateStep(4, "termine", `${generation.documents.length} livrables générés`);

      activeStep = 5; updateStep(5, "active", "DeepSeek relit le mémoire Word et recherche les écarts…");
      const auditResult = await api<Audit>(`/api/demo/${tenderId}/audit`, { method: "POST" });
      setAudit(auditResult);
      await refreshUsage(tenderId, startedAt);
      updateStep(5, auditResult.verdict === "pret_pour_revue" ? "termine" : "a_verifier", `${auditResult.issues.length} point(s) à examiner avant remise`);

      activeStep = 6; updateStep(6, "active");
      updateStep(6, "termine", "Simulation terminée · aucune candidature transmise");
      setFinished(true);
    } catch (reason) {
      updateStep(activeStep, "erreur", reason instanceof Error ? reason.message : String(reason));
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setRunning(false);
    }
  }

  return <div className="space-y-5">
    <div className="overflow-hidden rounded-2xl bg-[#0c2340] text-white shadow-xl">
      <div className="relative px-6 py-7 md:px-8">
        <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-[#5bc2e7]/20 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="max-w-3xl"><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#5bc2e7]/30 bg-[#5bc2e7]/10 px-3 py-1 text-[11px] font-semibold text-[#a9e6f8]"><Sparkles size={13} />DeepSeek API · appels IA réels</div><h2 className="text-2xl font-bold tracking-tight">Du DCE au dossier de réponse, sous vos yeux.</h2><p className="mt-2 text-sm leading-6 text-white/65">Talos orchestre les agents, montre leurs preuves et génère les livrables. La démonstration s’arrête avant tout dépôt réel.</p></div>
          <div className="grid grid-cols-3 gap-3 text-center lg:min-w-[330px]"><div className="rounded-xl bg-white/7 p-3"><div className="text-xl font-bold">3</div><div className="mt-1 text-[10px] text-white/55">appels IA maximum</div></div><div className="rounded-xl bg-white/7 p-3"><div className="text-xl font-bold">3</div><div className="mt-1 text-[10px] text-white/55">livrables générés</div></div><div className="rounded-xl bg-white/7 p-3"><div className="text-xl font-bold">0</div><div className="mt-1 text-[10px] text-white/55">candidature envoyée</div></div></div>
        </div>
      </div>
    </div>

    <div className="flex items-start gap-3 rounded-xl border border-[#b7d8e8] bg-[#f2fafd] p-4 text-xs leading-5 text-[#52667b]"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#007fa3]" /><p><strong>Démonstration encadrée.</strong> Les documents publics du DCE sont transmis à DeepSeek pour cette démonstration. Aucun prix n’est inventé et la validation technique, commerciale et contractuelle reste humaine.</p></div>

    <div className="card flex flex-col justify-between gap-4 p-5 md:flex-row md:items-end">
      <label className="flex-1"><span className="mb-2 block text-xs font-semibold">Dossier à utiliser</span><select className="input" value={selectedId} disabled={running} onChange={(event) => { reset(); setSelectedId(event.target.value); }}><option value="">Sélection automatique du dossier le plus exploitable</option>{tenders.map((tender) => <option key={tender.id} value={tender.id}>{tender.buyer} · {tender.title} ({tender.documentCount} document(s))</option>)}</select></label>
      <div className="flex gap-2"><button className="btn" disabled={running || (!finished && !error && !prepared)} onClick={reset}><RotateCcw size={15} />Réinitialiser</button><button className="btn btn-primary !px-5 !py-3" disabled={running || !configured || !tenders.length} onClick={run}>{running ? <LoaderCircle size={17} className="animate-spin" /> : <Play size={17} />}{running ? "Agents en cours…" : "Lancer la démonstration"}</button></div>
    </div>
    {!configured && <div className="flex items-center gap-2 rounded-xl bg-red-50 p-4 text-xs text-red-700"><XCircle size={17} />DeepSeek n’est pas configuré sur le serveur.</div>}
    {error && <div className="flex items-start gap-2 rounded-xl bg-red-50 p-4 text-xs leading-5 text-red-700"><XCircle size={17} className="shrink-0" /><span>{error}</span></div>}

    <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
      <div className="card overflow-hidden"><div className="border-b border-[#e8edf1] px-5 py-4"><div className="card-title">Chaîne d’agents en temps réel</div><div className="mt-1 text-[11px] text-[#65758a]">Chaque étape change d’état uniquement après le retour de son outil ou de son appel IA.</div></div><div>{steps.map((step, index) => <div key={step.title} className={`flex gap-4 border-b border-[#edf0f3] px-5 py-4 last:border-0 ${step.status === "active" ? "bg-[#f2fafd]" : ""}`}><StepIcon status={step.status} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold">{index + 1}. {step.title}</span><span className="badge bg-[#edf2f7] text-[#52667b]">{step.agent}</span></div><p className="mt-1 text-[11px] leading-5 text-[#65758a]">{step.description}</p>{step.detail && <p className={`mt-2 text-xs font-medium ${step.status === "erreur" ? "text-red-700" : "text-[#007fa3]"}`}>{step.detail}</p>}</div></div>)}</div></div>
      <aside className="space-y-5">
        <div className="card p-5"><div className="flex items-center gap-2"><Coins size={17} className="text-[#007fa3]" /><div className="card-title">Consommation de cette démo</div></div><div className="mt-4 grid grid-cols-2 gap-3"><Metric label="Appels IA" value={usage?.calls ?? 0} /><Metric label="Tokens totaux" value={(usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0)} /><Metric label="Entrées" value={usage?.inputTokens ?? 0} /><Metric label="Sorties" value={usage?.outputTokens ?? 0} /></div><div className="mt-4 border-t border-[#edf0f3] pt-4"><div className="text-[10px] uppercase tracking-wider text-[#8290a1]">Coût estimé</div><div className="mt-1 text-xl font-bold text-[#007fa3]">{usage && Object.entries(usage.costs).length ? Object.entries(usage.costs).map(([currency, value]) => <div key={currency}>{value.toLocaleString("fr-FR", { style: "currency", currency, minimumFractionDigits: 4 })}</div>) : "—"}</div><div className="mt-2 text-[10px] leading-4 text-[#8290a1]">Calculé à partir des tokens retournés par l’API et de la tarification configurée. {usage?.model ?? ""}</div></div></div>
        {prepared && <div className="card p-5"><div className="card-title">Dossier sélectionné</div><div className="mt-3 text-sm font-bold leading-5">{prepared.tender.title}</div><div className="mt-2 text-xs text-[#65758a]">{prepared.tender.buyer}</div><div className="mt-3 flex flex-wrap gap-2"><span className="badge bg-[#edf2f7] text-[#52667b]">{prepared.tender.sourceName}</span>{prepared.tender.reference && <span className="mono badge bg-[#edf2f7] text-[#52667b]">{prepared.tender.reference}</span>}</div><Link href={`/appels-offres/${prepared.tender.id}`} className="btn mt-4 w-full">Ouvrir la fiche réelle <ExternalLink size={14} /></Link></div>}
      </aside>
    </div>

    {analysis?.summary && <div className="grid gap-5 xl:grid-cols-2"><div className="card p-5"><div className="flex items-center gap-2"><FileSearch size={18} className="text-[#007fa3]" /><div className="card-title">Compréhension du besoin par DeepSeek</div></div><p className="mt-3 text-sm leading-6 text-[#52667b]">{analysis.summary}</p>{analysis.qualification && <div className="mt-4 rounded-xl bg-[#f2fafd] p-4"><div className="text-xs font-bold text-[#007fa3]">{decisionLabels[analysis.qualification.decision]}</div><p className="mt-2 text-xs leading-5 text-[#52667b]">{analysis.qualification.rationale}</p></div>}</div><div className="card overflow-hidden"><div className="border-b border-[#e8edf1] px-5 py-4"><div className="card-title">Adéquation avec Paritel</div></div><div className="divide-y divide-[#edf0f3]">{analysis.qualification?.matches.slice(0, 6).map((match, index) => <div key={`${match.requirement}-${index}`} className="px-5 py-3"><div className="flex items-start justify-between gap-3"><div className="text-xs font-semibold leading-5">{match.requirement}</div><span className={`badge ${match.status === "conforme" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{matchLabels[match.status]}</span></div><p className="mt-1 text-[11px] leading-5 text-[#65758a]">{match.note}</p></div>)}</div></div></div>}

    {audit && <div className="card overflow-hidden"><div className="border-b border-[#e8edf1] px-5 py-4"><div className="flex items-center gap-2"><FileCheck2 size={18} className="text-[#007fa3]" /><div className="card-title">Audit du mémoire généré</div></div></div><div className="grid gap-5 p-5 md:grid-cols-2"><div><div className="text-xs font-bold">Points de vigilance</div><div className="mt-3 space-y-3">{audit.issues.length ? audit.issues.map((issue, index) => <div key={`${issue.label}-${index}`} className="flex gap-3"><AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" /><div><div className="text-xs font-semibold">{issue.label}</div><p className="mt-1 text-[11px] leading-5 text-[#65758a]">{issue.detail}</p></div></div>) : <p className="text-xs text-emerald-700">Aucun écart bloquant détecté par le contrôleur.</p>}</div></div><div><div className="text-xs font-bold">Validations humaines obligatoires</div><ul className="mt-3 space-y-2">{audit.humanChecks.map((check, index) => <li key={`${check}-${index}`} className="flex gap-2 text-xs leading-5 text-[#52667b]"><Check size={15} className="mt-0.5 shrink-0 text-[#007fa3]" />{check}</li>)}</ul></div></div></div>}

    {generated.length > 0 && <div className="card p-5"><div className="card-title">Livrables réellement générés</div><div className="mt-4 grid gap-3 md:grid-cols-3">{generated.map((document) => <a key={document.id} href={`/api/responses/${document.id}/download`} className="flex items-center gap-3 rounded-xl border border-[#dde9f2] p-4 transition hover:border-[#007fa3] hover:bg-[#f2fafd]"><FileText size={20} className="shrink-0 text-[#007fa3]" /><div className="min-w-0 flex-1"><div className="truncate text-xs font-semibold">{document.filename}</div><div className="mt-1 text-[10px] uppercase text-[#8290a1]">{document.kind.replaceAll("_", " ")}</div></div><Download size={15} /></a>)}</div></div>}

    {finished && prepared && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-center"><div className="flex gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white"><CheckCircle2 size={23} /></div><div><div className="text-lg font-bold text-emerald-900">Parcours terminé, prêt pour revue Paritel.</div><p className="mt-1 text-xs leading-5 text-emerald-800">L’envoi a été simulé visuellement. Aucune candidature n’a été transmise et l’offre n’a pas été marquée comme déposée.</p></div></div><a href={`/api/tenders/${prepared.tender.id}/package`} className="btn btn-primary shrink-0"><Download size={16} />Télécharger le dossier complet</a></div></div>}
  </div>;
}

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "active") return <LoaderCircle size={20} className="mt-0.5 shrink-0 animate-spin text-[#007fa3]" />;
  if (status === "termine") return <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-600" />;
  if (status === "a_verifier") return <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-600" />;
  if (status === "erreur") return <XCircle size={20} className="mt-0.5 shrink-0 text-red-600" />;
  return <Circle size={20} className="mt-0.5 shrink-0 text-[#b7c5d1]" />;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg bg-[#f4f8fb] p-3"><div className="text-[10px] text-[#65758a]">{label}</div><div className="mt-1 text-lg font-bold">{value.toLocaleString("fr-FR")}</div></div>;
}
