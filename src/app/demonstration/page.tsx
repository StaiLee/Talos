import { db, documents, tenders } from "@/lib/db";
import { DemoRunner } from "@/components/demo-runner";
import { PageHeader } from "@/components/ui";
import { aiConfigured } from "@/modules/ai/client";

export const dynamic = "force-dynamic";

export default async function DemonstrationPage() {
  const tenderRows = await db.select().from(tenders).orderBy(tenders.createdAt);
  const documentRows = await db.select({ tenderId: documents.tenderId }).from(documents);
  const options = tenderRows.filter((tender) => !["archive", "depose", "gagne", "perdu_non_retenu", "perdu_soutenance"].includes(tender.status)).map((tender) => ({
    id: tender.id,
    title: tender.title,
    buyer: tender.buyer,
    documentCount: documentRows.filter((document) => document.tenderId === tender.id).length,
  }));
  return <div className="mx-auto max-w-[1500px] px-5 py-7 lg:px-8">
    <PageHeader eyebrow="Expérience Paritel · POC" title="Démonstration IA" description="Une exécution réelle de la chaîne d’agents DeepSeek sur un appel d’offres public, de la lecture du DCE à la simulation de remise." />
    <DemoRunner tenders={options} configured={aiConfigured()} />
  </div>;
}
