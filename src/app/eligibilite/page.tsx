import { desc } from "drizzle-orm";
import { db, eligibilityChecks } from "@/lib/db";
import { EligibilityPanel } from "@/components/eligibility-panel";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function EligibilityPage({ searchParams }: { searchParams: Promise<{ tender?: string; address?: string }> }) {
  const { tender, address } = await searchParams;
  const checks = await db.select().from(eligibilityChecks).orderBy(desc(eligibilityChecks.createdAt)).limit(50);
  return <div className="mx-auto max-w-[1300px] px-5 py-7 lg:px-8"><PageHeader eyebrow="Faisabilité technique" title="Éligibilité FTTO & FTTH" description="Testez l’adresse du site client et conservez les technologies proposées avec leur preuve. La faisabilité commerciale reste soumise à validation Paritel." />
    <div className="card p-5"><EligibilityPanel tenderId={tender} initialAddress={address} initialChecks={checks} /></div>
    <div className="mt-4 grid gap-3 md:grid-cols-3"><div className="card p-4"><div className="text-xs font-bold">SFR Business</div><p className="mt-1 text-[11px] leading-5 text-[#65758a]">Test public automatisé par adresse avec Camoufox.</p></div><div className="card p-4"><div className="text-xs font-bold">Orange</div><p className="mt-1 text-[11px] leading-5 text-[#65758a]">Connexion aux outils Paritel à configurer.</p></div><div className="card p-4"><div className="text-xs font-bold">Helios</div><p className="mt-1 text-[11px] leading-5 text-[#65758a]">Disponible lorsque Talos est raccordé au réseau interne.</p></div></div>
  </div>;
}
