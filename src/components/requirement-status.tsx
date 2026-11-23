"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RequirementStatus({ id, value }: { id: string; value: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  async function update(status: string) {
    setLoading(true);
    await fetch(`/api/requirements/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) });
    router.refresh(); setLoading(false);
  }
  return <select className="input !w-auto !min-w-32 !px-2 !py-1 text-[11px]" value={value} disabled={loading} onChange={(event) => update(event.target.value)}><option value="a_verifier">À vérifier</option><option value="conforme">Conforme</option><option value="sous_conditions">Sous conditions</option><option value="non_conforme">Non conforme</option></select>;
}
