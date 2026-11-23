"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CollectButton({ source = "boamp", label = "Actualiser BOAMP" }: { source?: string; label?: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  async function collect() {
    setLoading(true); setMessage("");
    try {
      const response = await fetch(`/api/collect/${source}`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setMessage(`${result.created} nouveaux · ${result.updated} mis à jour`);
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
    finally { setLoading(false); }
  }
  return <div className="flex items-center gap-3"><button className="btn btn-primary" onClick={collect} disabled={loading}><RefreshCw size={15} className={loading ? "animate-spin" : ""} />{loading ? "Collecte…" : label}</button>{message && <span className="max-w-72 text-xs text-[#65758a]">{message}</span>}</div>;
}
