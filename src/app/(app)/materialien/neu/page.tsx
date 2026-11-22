import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getBenutzer } from "@/lib/auth";
import { ladeKategorien } from "@/lib/materialien/daten";
import { Seitenkopf } from "@/components/ui";
import { materialSpeichern } from "../actions";
import { MaterialFormular } from "../material-formular";

export const metadata: Metadata = { title: "Material anlegen · Lagerblick" };

export default function NeuesMaterialSeite() {
  return (
    <div className="max-w-2xl space-y-6">
      <Seitenkopf nummer="02" bereich="Materialien" titel="Material anlegen" />
      <Suspense fallback={<p className="text-sm text-grau">Formular wird geladen …</p>}>
        <Formular />
      </Suspense>
    </div>
  );
}

async function Formular() {
  const benutzer = await getBenutzer();
  if (benutzer.rolle !== "admin") redirect("/materialien");

  const kategorien = await ladeKategorien();
  return (
    <MaterialFormular
      aktion={materialSpeichern.bind(null, null)}
      kategorien={kategorien}
      abbrechenHref="/materialien"
    />
  );
}
