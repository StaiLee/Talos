import { NewTenderForm } from "@/components/new-tender-form";
import { PageHeader } from "@/components/ui";

export default function NewTenderPage() {
  return <div className="mx-auto max-w-[1000px] px-5 py-7 lg:px-8"><PageHeader eyebrow="Import manuel" title="Nouvel appel d’offres" description="Créez le dossier, puis importez les documents du DCE pour lancer l’analyse." /><NewTenderForm /></div>;
}
