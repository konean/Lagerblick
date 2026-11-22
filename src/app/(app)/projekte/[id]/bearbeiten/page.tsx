import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getBenutzer } from "@/lib/auth";
import { ladeProjekt } from "@/lib/projekte/daten";
import { Seitenkopf } from "@/components/ui";
import { projektSpeichern } from "../../actions";
import { ProjektFormular } from "../../projekt-formular";

export const metadata: Metadata = { title: "Projekt bearbeiten · Lagerblick" };

export default function ProjektBearbeitenSeite(props: PageProps<"/projekte/[id]/bearbeiten">) {
  return (
    <div className="max-w-2xl space-y-6">
      <Seitenkopf nummer="05" bereich="Projekte" titel="Projekt bearbeiten" />
      <Suspense fallback={<p className="text-sm text-grau">Formular wird geladen …</p>}>
        <Formular params={props.params} />
      </Suspense>
    </div>
  );
}

async function Formular({ params }: { params: PageProps<"/projekte/[id]/bearbeiten">["params"] }) {
  const { id } = await params;
  const benutzer = await getBenutzer();
  if (benutzer.rolle !== "admin") redirect(`/projekte/${id}`);

  const projekt = await ladeProjekt(id);
  return (
    <ProjektFormular
      aktion={projektSpeichern.bind(null, projekt.id)}
      abbrechenHref={`/projekte/${projekt.id}`}
      vorgabe={{ name: projekt.name, nummer: projekt.nummer ?? "", hinweis: projekt.hinweis ?? "" }}
    />
  );
}
