import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getBenutzer } from "@/lib/auth";
import { ladeKategorien, ladeMaterial } from "@/lib/materialien/daten";
import { Seitenkopf } from "@/components/ui";
import { materialSpeichern } from "../../actions";
import { MaterialFormular } from "../../material-formular";

export const metadata: Metadata = { title: "Material bearbeiten · Lagerblick" };

export default function MaterialBearbeitenSeite(props: PageProps<"/materialien/[id]/bearbeiten">) {
  return (
    <div className="max-w-2xl space-y-6">
      <Seitenkopf nummer="02" bereich="Materialien" titel="Material bearbeiten" />
      <Suspense fallback={<p className="text-sm text-grau">Formular wird geladen …</p>}>
        <Formular params={props.params} />
      </Suspense>
    </div>
  );
}

async function Formular({ params }: { params: PageProps<"/materialien/[id]/bearbeiten">["params"] }) {
  const { id } = await params;
  const benutzer = await getBenutzer();
  if (benutzer.rolle !== "admin") redirect(`/materialien/${id}`);

  const [material, kategorien] = await Promise.all([ladeMaterial(id), ladeKategorien()]);

  return (
    <MaterialFormular
      aktion={materialSpeichern.bind(null, material.id)}
      kategorien={kategorien}
      abbrechenHref={`/materialien/${material.id}`}
      vorgabe={{
        name: material.name,
        kategorie_id: material.kategorie_id,
        hersteller: material.hersteller,
        modell: material.modell,
        sku: material.sku ?? "",
        einheit: material.einheit,
        mindestbestand: String(material.mindestbestand).replace(".", ","),
        beschreibung: material.beschreibung ?? "",
      }}
    />
  );
}
