import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getBenutzer } from "@/lib/auth";
import { ladeKategorien } from "@/lib/materialien/daten";
import { AktionsKnopf } from "@/components/aktions-knopf";
import { knopfGefahr, Seitenkopf } from "@/components/ui";
import { kategorieLoeschen, kategorieSpeichern } from "../actions";
import { KategorieFormular } from "./kategorie-formular";

export const metadata: Metadata = { title: "Kategorien · Lagerblick" };

export default function KategorienSeite() {
  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/materialien" className="text-sm text-grau hover:text-tinte">
        ← Alle Materialien
      </Link>
      <Seitenkopf nummer="02" bereich="Materialien" titel="Kategorien" />
      <Suspense fallback={<p className="text-sm text-grau">Kategorien werden geladen …</p>}>
        <Inhalt />
      </Suspense>
    </div>
  );
}

async function Inhalt() {
  const benutzer = await getBenutzer();
  if (benutzer.rolle !== "admin") redirect("/materialien");

  const kategorien = await ladeKategorien();

  return (
    <>
      <section className="rounded-m border border-linie bg-flaeche p-4">
        <h2 className="mb-1 text-sm font-semibold">Neue Kategorie</h2>
        <KategorieFormular aktion={kategorieSpeichern.bind(null, null)} beschriftung="Anlegen" />
      </section>

      <ul className="divide-y divide-linie rounded-m border border-linie bg-flaeche">
        {kategorien.map((k) => (
          <li key={k.id} className="flex flex-wrap items-end gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <KategorieFormular
                aktion={kategorieSpeichern.bind(null, k.id)}
                vorgabe={k.name}
                beschriftung="Umbenennen"
              />
            </div>
            <span className="pb-2 font-mono text-xs text-grau tabular-nums">
              {k.anzahl} {k.anzahl === 1 ? "Material" : "Materialien"}
            </span>
            {k.anzahl === 0 && (
              <AktionsKnopf
                aktion={kategorieLoeschen.bind(null, k.id)}
                beschriftung="Löschen"
                rueckfrage={`Kategorie „${k.name}“ löschen?`}
                className={knopfGefahr}
              />
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
