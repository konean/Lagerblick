import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getBenutzer } from "@/lib/auth";
import { formatZeitpunkt } from "@/lib/format";
import { ladeProjekt } from "@/lib/projekte/daten";
import { ladeReservierungen } from "@/lib/reservierungen/daten";
import { AktionsKnopf } from "@/components/aktions-knopf";
import { ReservierungsTabelle } from "@/components/reservierungs-tabelle";
import { Angabe, knopfGefahr, knopfPrimaer, knopfSekundaer, Seitenkopf, StatusLabel } from "@/components/ui";
import { projektLoeschen, projektStatusSetzen } from "../actions";

export const metadata: Metadata = { title: "Projekt · Lagerblick" };

export default function ProjektSeite(props: PageProps<"/projekte/[id]">) {
  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/projekte" className="text-sm text-grau hover:text-tinte">
        ← Alle Projekte
      </Link>
      <Suspense fallback={<p className="text-sm text-grau">Projekt wird geladen …</p>}>
        <Inhalt params={props.params} />
      </Suspense>
    </div>
  );
}

async function Inhalt({ params }: { params: PageProps<"/projekte/[id]">["params"] }) {
  const { id } = await params;
  const [projekt, benutzer, reservierungen] = await Promise.all([
    ladeProjekt(id),
    getBenutzer(),
    ladeReservierungen({ projekt: id }),
  ]);
  const istAdmin = benutzer.rolle === "admin";
  const abgeschlossen = projekt.status === "abgeschlossen";

  return (
    <>
      <Seitenkopf
        nummer="05"
        bereich="Projekte"
        titel={
          <span className="inline-flex flex-wrap items-center gap-3">
            {projekt.name} <StatusLabel status={projekt.status} />
          </span>
        }
      >
        <Link href={`/bewegungen?projekt=${projekt.id}`} className={knopfSekundaer}>
          Buchungen
        </Link>
        {istAdmin && (
          <Link href={`/projekte/${projekt.id}/bearbeiten`} className={knopfPrimaer}>
            Bearbeiten
          </Link>
        )}
      </Seitenkopf>

      <dl className="grid rounded-m border border-linie bg-flaeche sm:grid-cols-2">
        <Angabe label="Projektnummer" wert={projekt.nummer} mono />
        <Angabe label="Angelegt" wert={formatZeitpunkt(projekt.erstellt_am)} mono />
        <div className="border-t border-linie px-4 py-3 sm:col-span-2">
          <dt className="font-mono text-[11px] tracking-wider text-grau uppercase">Hinweis</dt>
          <dd className="mt-1 text-sm whitespace-pre-line">{projekt.hinweis ?? "–"}</dd>
        </div>
      </dl>

      <section className="rounded-m border border-linie bg-flaeche">
        <h2 className="border-b border-linie px-4 py-3 text-sm font-semibold">Reservierungen</h2>
        <ReservierungsTabelle
          reservierungen={reservierungen}
          spalten="material"
          leer={abgeschlossen ? "Abgeschlossene Projekte haben keine Reservierungen." : "Für dieses Projekt ist nichts reserviert. Reserviert wird auf der Seite des Materials."}
        />
      </section>

      {istAdmin && (
        <section className="space-y-3 rounded-m border border-linie bg-flaeche p-4">
          <h2 className="text-sm font-semibold">Verwaltung</h2>
          <p className="text-sm text-grau">
            Abgeschlossene Projekte bleiben mit ihren Buchungen erhalten, lassen sich aber nicht mehr
            für Entnahmen und Reservierungen auswählen. Abschließen geht nur ohne offene
            Reservierungen, Löschen nur, solange es keine Buchungen gibt.
          </p>
          <div className="flex flex-wrap gap-2">
            <AktionsKnopf
              aktion={projektStatusSetzen.bind(null, projekt.id, abgeschlossen ? "aktiv" : "abgeschlossen")}
              beschriftung={abgeschlossen ? "Wieder öffnen" : "Abschließen"}
              className={knopfSekundaer}
            />
            <AktionsKnopf
              aktion={projektLoeschen.bind(null, projekt.id)}
              beschriftung="Löschen"
              rueckfrage={`„${projekt.name}“ endgültig löschen?`}
              className={knopfGefahr}
            />
          </div>
        </section>
      )}
    </>
  );
}
