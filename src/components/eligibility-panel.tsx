"use client";

import { MapPinCheck, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Check = {
  id: string;
  address: string;
  operator: string;
  status: string;
  ftthEligible: boolean | null;
  fttoEligible: boolean | null;
  summary: string | null;
  offers: { name: string; technology: string; description?: string }[];
  createdAt: string | Date;
};

export function EligibilityPanel({ tenderId, initialAddress = "", initialChecks = [] }: { tenderId?: string; initialAddress?: string; initialChecks?: Check[] }) {
  const [address, setAddress] = useState(initialAddress);
  const [operator, setOperator] = useState("sfr");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();
  useEffect(() => {
    if (!initialChecks.some((check) => check.status === "en_cours")) return;
    const interval = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(interval);
  }, [initialChecks, router]);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const response = await fetch("/api/eligibility", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tenderId, address, operator }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setMessage("Test lancé. Le résultat apparaîtra automatiquement dès que l’opérateur aura répondu.");
      router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setLoading(false); }
  }
  return <div className="space-y-5">
    <form onSubmit={submit} className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
      <input className="input" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="N°, rue, code postal et ville" required />
      <select className="input" value={operator} onChange={(event) => setOperator(event.target.value)}><option value="sfr">SFR Business · public</option><option value="orange">Orange · accès Paritel</option><option value="helios">Helios · interne</option></select>
      <button className="btn btn-primary" disabled={loading || initialChecks.some((check) => check.status === "en_cours")}><MapPinCheck size={15} />{loading || initialChecks.some((check) => check.status === "en_cours") ? "Test en cours…" : "Tester l’éligibilité"}</button>
    </form>
    {error && <div className="text-xs text-red-700">{error}</div>}
    {message && <div className="text-xs text-[#65758a]">{message}</div>}
    <div className="space-y-3">{initialChecks.map((check) => <div key={check.id} className="rounded-xl border border-[#dfe5eb] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><div className="text-xs font-semibold">{check.address}</div><div className="mt-1 text-[10px] uppercase text-[#8290a1]">{check.operator} · {check.status.replaceAll("_", " ")}</div></div><ShieldCheck size={18} className={check.status === "eligible" ? "text-emerald-600" : "text-[#8290a1]"} /></div>{check.summary && <div className="mt-2 text-xs font-medium text-[#52667b]">{check.summary}</div>}{check.offers.length > 0 && <div className="mt-3 flex flex-wrap gap-1">{check.offers.map((offer, index) => <span key={`${offer.name}-${index}`} className="badge bg-[#edf2f7] text-[#52667b]">{offer.name} · {offer.technology}</span>)}</div>}</div>)}</div>
  </div>;
}
