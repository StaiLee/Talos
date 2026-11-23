"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function NewTenderForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch("/api/tenders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      router.push(`/appels-offres/${result.id}`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); setLoading(false); }
  }
  return <form onSubmit={submit} className="card grid gap-5 p-6 md:grid-cols-2">
    <label className="md:col-span-2"><span className="mb-2 block text-xs font-semibold">Intitulé de la consultation *</span><input className="input" name="title" required /></label>
    <label><span className="mb-2 block text-xs font-semibold">Acheteur *</span><input className="input" name="buyer" required /></label>
    <label><span className="mb-2 block text-xs font-semibold">Référence</span><input className="input" name="reference" /></label>
    <label><span className="mb-2 block text-xs font-semibold">Ville</span><input className="input" name="city" /></label>
    <label><span className="mb-2 block text-xs font-semibold">Département</span><input className="input" name="department" maxLength={3} /></label>
    <label><span className="mb-2 block text-xs font-semibold">Date limite</span><input className="input" name="deadline" type="datetime-local" /></label>
    <label><span className="mb-2 block text-xs font-semibold">Lien de la consultation</span><input className="input" name="url" type="url" /></label>
    <label className="md:col-span-2"><span className="mb-2 block text-xs font-semibold">Description</span><textarea className="input min-h-32" name="description" /></label>
    {error && <div className="text-sm text-red-700 md:col-span-2">{error}</div>}
    <div className="md:col-span-2"><button className="btn btn-primary" disabled={loading}>{loading ? "Création…" : "Créer et ouvrir le dossier"}</button></div>
  </form>;
}
