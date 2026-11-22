import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getBenutzer } from "@/lib/auth";
import { Seitenkopf } from "@/components/ui";
import { projektSpeichern } from "../actions";
import { ProjektFormular } from "../projekt-formular";

export const metadata: Metadata = { title: "Projekt anlegen · Lagerblick" };

export default function NeuesProjektSeite() {
  return (
    <div className="max-w-2xl space-y-6">
      <Seitenkopf nummer="05" bereich="Projekte" titel="Projekt anlegen" />
      <Suspense fallback={<p className="text-sm text-grau">Formular wird geladen …</p>}>
        <Formular />
      </Suspense>
    </div>
  );
}

async function Formular() {
  const benutzer = await getBenutzer();
  if (benutzer.rolle !== "admin") redirect("/projekte");

  return <ProjektFormular aktion={projektSpeichern.bind(null, null)} abbrechenHref="/projekte" />;
}
