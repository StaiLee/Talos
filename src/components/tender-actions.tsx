"use client";

import { FileOutput, Play, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export function TenderActions({ tenderId, goDecision }: { tenderId: string; goDecision: string }) {
  const [loading, setLoading] = useState("");
  const [message, setMessage] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function action(name: string) {
    setLoading(name); setMessage("");
    try {
      const response = await fetch(`/api/tenders/${tenderId}/${name}`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setMessage(name === "analyze" ? `${result.requirements} exigences · ${result.ai ? "IA" : "règles"}` : `Dossier v${result.version} généré`);
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
    finally { setLoading(""); }
  }

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setLoading("upload"); setMessage("");
    try {
      const form = new FormData();
      Array.from(files).forEach((file) => form.append("files", file));
      const response = await fetch(`/api/tenders/${tenderId}/documents`, { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setMessage(`${result.imported} document(s) importé(s)`);
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
    finally { setLoading(""); if (input.current) input.current.value = ""; }
  }

  async function updateGo(value: string) {
    await fetch(`/api/tenders/${tenderId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ goDecision: value }) });
    router.refresh();
  }

  return <div className="space-y-3">
    <div className="flex flex-wrap gap-2">
      <input ref={input} type="file" multiple className="hidden" onChange={(event) => upload(event.target.files)} accept=".pdf,.docx,.xlsx,.xlsm,.csv,.txt,.xml" />
      <button className="btn" disabled={Boolean(loading)} onClick={() => input.current?.click()}><Upload size={15} />Importer DCE</button>
      <button className="btn btn-primary" disabled={Boolean(loading)} onClick={() => action("analyze")}><Play size={15} />{loading === "analyze" ? "Analyse…" : "Analyser"}</button>
      <button className="btn btn-accent" disabled={Boolean(loading)} onClick={() => action("generate")}><FileOutput size={15} />{loading === "generate" ? "Génération…" : "Générer le dossier"}</button>
      <select className="input !w-auto !py-2 text-xs" value={goDecision} onChange={(event) => updateGo(event.target.value)}>
        <option value="a_evaluer">À évaluer</option><option value="go">Go validé</option><option value="sous_conditions">Sous conditions</option><option value="no_go">No-Go</option>
      </select>
    </div>
    {message && <div className="text-xs text-[#65758a]">{message}</div>}
  </div>;
}
