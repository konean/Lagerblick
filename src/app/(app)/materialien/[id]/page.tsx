import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getBenutzer } from "@/lib/auth";
import { ladeBestand, ladeLetzteBewegungen, unterMindestbestand } from "@/lib/bewegungen/daten";
import { BEWEGUNGSARTEN } from "@/lib/bewegungen/schema";
import { formatMenge, formatMengeMitVorzeichen, formatZeitpunkt } from "@/lib/format";
import { ladeMaterial } from "@/lib/materialien/daten";
import { EINHEITEN } from "@/lib/materialien/schema";
import { AktionsKnopf } from "@/components/aktions-knopf";
import { StornoKnopf } from "@/components/storno-knopf";
import {
  Angabe,
  BestandsHinweis,
  knopfGefahr,
  knopfPrimaer,
  knopfSekundaer,
  Seitenkopf,
  StatusLabel,
  StorniertLabel,
} from "@/components/ui";
import { buchen, materialLoeschen, materialStatusSetzen, stornieren } from "../actions";
import { BuchungsFormular } from "./buchungs-formular";

export const metadata: Metadata = { title: "Material · Lagerblick" };

export default function MaterialSeite(props: PageProps<"/materialien/[id]">) {
  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/materialien" className="text-sm text-grau hover:text-tinte">
        ← Alle Materialien
      </Link>
      <Suspense fallback={<p className="text-sm text-grau">Material wird geladen …</p>}>
        <Inhalt params={props.params} />
      </Suspense>
    </div>
  );
}

async function Inhalt({ params }: { params: PageProps<"/materialien/[id]">["params"] }) {
  const { id } = await params;
  const [material, benutzer, bestand, bewegungen] = await Promise.all([
    ladeMaterial(id),
    getBenutzer(),
    ladeBestand(id),
    ladeLetzteBewegungen(id),
  ]);
  const istAdmin = benutzer.rolle === "admin";
  const archiviert = material.status === "archiviert";

  return (
    <>
      <Seitenkopf
        nummer="02"
        bereich="Materialien"
        titel={
          <span className="inline-flex flex-wrap items-center gap-3">
            {material.name} <StatusLabel status={material.status} />
          </span>
        }
      >
        {istAdmin && (
          <Link href={`/materialien/${material.id}/bearbeiten`} className={knopfPrimaer}>
            Bearbeiten
          </Link>
        )}
      </Seitenkopf>

      <section className="grid rounded-m border border-linie bg-flaeche sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="border-b border-linie p-5 sm:border-r sm:border-b-0">
          <p className="font-mono text-[11px] tracking-wider text-grau uppercase">Bestand</p>
          <p className="mt-2 font-mono text-3xl font-medium tabular-nums">
            {formatMenge(bestand)}
            <span className="ml-2 text-base font-normal text-grau">{EINHEITEN[material.einheit]}</span>
          </p>
          <p className="mt-2 font-mono text-xs text-grau tabular-nums">
            Mindestbestand {formatMenge(material.mindestbestand, material.einheit)}
          </p>
          {unterMindestbestand(bestand, material.mindestbestand) && (
            <p className="mt-3">
              <BestandsHinweis />
            </p>
          )}
        </div>
        <div className="p-5">
          {archiviert ? (
            <p className="text-sm text-grau">
              Archiviertes Material kann nicht gebucht werden.
              {istAdmin && " Zum Buchen zuerst reaktivieren."}
            </p>
          ) : (
            <BuchungsFormular
              aktion={buchen.bind(null, material.id, material.einheit)}
              einheit={material.einheit}
              bestand={bestand}
              mitKorrektur={istAdmin}
            />
          )}
        </div>
      </section>

      <dl className="grid rounded-m border border-linie bg-flaeche sm:grid-cols-2">
        <Angabe label="Kategorie" wert={material.kategorie?.name} />
        <Angabe label="Artikelnummer / SKU" wert={material.sku} mono />
        <Angabe label="Hersteller" wert={material.hersteller} />
        <Angabe label="Modell" wert={material.modell} />
        <Angabe label="Einheit" wert={EINHEITEN[material.einheit]} />
        <Angabe label="Mindestbestand" wert={formatMenge(material.mindestbestand, material.einheit)} mono />
        <div className="border-t border-linie px-4 py-3 sm:col-span-2">
          <dt className="font-mono text-[11px] tracking-wider text-grau uppercase">Beschreibung</dt>
          <dd className="mt-1 text-sm whitespace-pre-line">{material.beschreibung ?? "–"}</dd>
        </div>
      </dl>

      <section className="rounded-m border border-linie bg-flaeche">
        <h2 className="border-b border-linie px-4 py-3 text-sm font-semibold">Letzte Bewegungen</h2>
        {bewegungen.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-grau">Noch keine Bewegungen.</p>
        ) : (
          <ul className="divide-y divide-linie">
            {bewegungen.map((b) => (
              <li key={b.id} className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 px-4 py-3 text-sm">
                <span className="inline-flex flex-wrap items-center gap-2">
                  <span className={`font-medium ${b.storniert ? "text-grau" : ""}`}>{BEWEGUNGSARTEN[b.art]}</span>
                  {b.storniert && <StorniertLabel />}
                </span>
                <span
                  className={`text-right font-mono tabular-nums ${
                    b.storniert ? "text-grau line-through" : b.menge > 0 ? "text-ok" : "text-tinte"
                  }`}
                >
                  {formatMengeMitVorzeichen(b.menge, material.einheit)}
                </span>
                <span className="col-span-2 text-xs text-grau">
                  {formatZeitpunkt(b.erstellt_am)} · {b.ersteller?.anzeigename ?? "Unbekannt"}
                  {b.original && ` · zu ${BEWEGUNGSARTEN[b.original.art]} vom ${formatZeitpunkt(b.original.erstellt_am)}`}
                </span>
                {b.kommentar && (
                  <span className="col-span-2 mt-1 text-xs text-tinte/80">{b.kommentar}</span>
                )}
                {istAdmin && !archiviert && b.art !== "storno" && !b.storniert && (
                  <span className="col-span-2 mt-1">
                    <StornoKnopf
                      aktion={stornieren.bind(null, b.id)}
                      beschreibung={`${BEWEGUNGSARTEN[b.art]} ${formatMengeMitVorzeichen(b.menge, material.einheit)}`}
                    />
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {istAdmin && (
        <section className="space-y-3 rounded-m border border-linie bg-flaeche p-4">
          <h2 className="text-sm font-semibold">Verwaltung</h2>
          <p className="text-sm text-grau">
            Archivierte Materialien bleiben mit ihrer Historie erhalten, erscheinen aber nicht mehr in
            der Standardliste. Löschen ist nur möglich, solange es keine Buchungen gibt.
          </p>
          <div className="flex flex-wrap gap-2">
            <AktionsKnopf
              aktion={materialStatusSetzen.bind(null, material.id, archiviert ? "aktiv" : "archiviert")}
              beschriftung={archiviert ? "Reaktivieren" : "Archivieren"}
              className={knopfSekundaer}
            />
            <AktionsKnopf
              aktion={materialLoeschen.bind(null, material.id)}
              beschriftung="Löschen"
              rueckfrage={`„${material.name}“ endgültig löschen?`}
              className={knopfGefahr}
            />
          </div>
        </section>
      )}
    </>
  );
}
