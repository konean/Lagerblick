import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getBenutzer } from "@/lib/auth";
import { formatMenge } from "@/lib/format";
import { ladeMaterial } from "@/lib/materialien/daten";
import { EINHEITEN } from "@/lib/materialien/schema";
import { AktionsKnopf } from "@/components/aktions-knopf";
import { knopfGefahr, knopfPrimaer, knopfSekundaer, Seitenkopf, StatusLabel } from "@/components/ui";
import { materialLoeschen, materialStatusSetzen } from "../actions";

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
  const [material, benutzer] = await Promise.all([ladeMaterial(id), getBenutzer()]);
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

      <p className="text-sm text-grau">Bestand und Buchungen folgen in der nächsten Ausbaustufe.</p>

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

function Angabe({ label, wert, mono = false }: { label: string; wert?: string | null; mono?: boolean }) {
  return (
    <div className="border-t border-linie px-4 py-3 first:border-t-0 sm:[&:nth-child(2)]:border-t-0">
      <dt className="font-mono text-[11px] tracking-wider text-grau uppercase">{label}</dt>
      <dd className={`mt-1 text-sm ${mono ? "font-mono tabular-nums" : ""}`}>{wert ?? "–"}</dd>
    </div>
  );
}
