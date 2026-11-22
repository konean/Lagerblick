import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getBenutzer } from "@/lib/auth";
import { ladeBewegungen } from "@/lib/bewegungen/daten";
import { historieUrl, leseHistorieFilter } from "@/lib/bewegungen/filter";
import { BEWEGUNGSARTEN } from "@/lib/bewegungen/schema";
import { formatMengeMitVorzeichen, formatZeitpunkt } from "@/lib/format";
import { ladeMaterialien } from "@/lib/materialien/daten";
import { ladeProjekte } from "@/lib/projekte/daten";
import { StornoKnopf } from "@/components/storno-knopf";
import { eingabeKlasse, knopfPrimaer, knopfSekundaer, Meldung, Seitenkopf, StorniertLabel } from "@/components/ui";
import { stornieren } from "../materialien/actions";

export const metadata: Metadata = { title: "Bewegungen · Lagerblick" };

export default function BewegungenSeite(props: PageProps<"/bewegungen">) {
  return (
    <div className="space-y-6">
      <Seitenkopf nummer="03" bereich="Bewegungen" titel="Buchungshistorie" />
      <Suspense fallback={<p className="text-sm text-grau">Bewegungen werden geladen …</p>}>
        <Inhalt searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function Inhalt({ searchParams }: { searchParams: PageProps<"/bewegungen">["searchParams"] }) {
  const { filter, fehler } = leseHistorieFilter(await searchParams);
  const [benutzer, materialien, projekte, { bewegungen, weitere }] = await Promise.all([
    getBenutzer(),
    ladeMaterialien({ status: "alle" }),
    ladeProjekte({ status: "alle" }),
    ladeBewegungen(filter),
  ]);
  const istAdmin = benutzer.rolle === "admin";
  const gefiltert = Boolean(filter.material || filter.projekt || filter.art || filter.von || filter.bis);

  return (
    <>
      {/* GET-Formular: Filter landen in der URL und lassen sich teilen. */}
      <form className="grid grid-cols-2 gap-3 rounded-m border border-linie bg-flaeche p-4 lg:grid-cols-[1fr_1fr_150px_145px_145px_auto] lg:items-end">
        <label className="col-span-2 block text-sm font-medium lg:col-span-1">
          Artikel
          <select name="material" defaultValue={filter.material ?? ""} className={eingabeKlasse}>
            <option value="">Alle Artikel</option>
            {materialien.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
                {m.status === "archiviert" ? " (archiviert)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="col-span-2 block text-sm font-medium lg:col-span-1">
          Projekt
          <select name="projekt" defaultValue={filter.projekt ?? ""} className={eingabeKlasse}>
            <option value="">Alle Projekte</option>
            {projekte.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nummer ? `${p.nummer} · ${p.name}` : p.name}
                {p.status === "abgeschlossen" ? " (abgeschlossen)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="col-span-2 block text-sm font-medium sm:col-span-1">
          Art
          <select name="art" defaultValue={filter.art ?? ""} className={eingabeKlasse}>
            <option value="">Alle Arten</option>
            {Object.entries(BEWEGUNGSARTEN).map(([wert, name]) => (
              <option key={wert} value={wert}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Von
          <input type="date" name="von" defaultValue={filter.von ?? ""} className={eingabeKlasse} />
        </label>
        <label className="block text-sm font-medium">
          Bis
          <input type="date" name="bis" defaultValue={filter.bis ?? ""} className={eingabeKlasse} />
        </label>
        <div className="col-span-2 flex gap-2 lg:col-span-1">
          <button type="submit" className={knopfPrimaer}>
            Filtern
          </button>
          <Link href="/bewegungen" className={knopfSekundaer}>
            Zurücksetzen
          </Link>
        </div>
      </form>

      {fehler && <Meldung>{fehler}</Meldung>}

      <section className="overflow-x-auto rounded-m border border-linie bg-flaeche">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-linie font-mono text-[11px] tracking-wider text-grau uppercase">
            <tr>
              <th className="hidden px-4 py-3 font-normal md:table-cell">Zeitpunkt</th>
              <th className="px-4 py-3 font-normal">Artikel</th>
              <th className="hidden px-4 py-3 font-normal sm:table-cell">Art</th>
              <th className="px-4 py-3 text-right font-normal">Menge</th>
              <th className="hidden px-4 py-3 font-normal lg:table-cell">Benutzer</th>
              <th className="hidden px-4 py-3 font-normal md:table-cell">Kommentar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-linie">
            {bewegungen.map((b) => {
              const einheit = b.material?.einheit;
              const stornierbar =
                istAdmin && b.material?.status === "aktiv" && b.art !== "storno" && !b.storniert;
              return (
                <tr key={b.id} className="align-top hover:bg-papier">
                  <td className="hidden px-4 py-3 font-mono text-xs whitespace-nowrap text-grau tabular-nums md:table-cell">
                    {formatZeitpunkt(b.erstellt_am)}
                  </td>
                  <td className="px-4 py-3">
                    {b.material ? (
                      <Link href={`/materialien/${b.material.id}`} className="font-medium hover:underline">
                        {b.material.name}
                      </Link>
                    ) : (
                      "–"
                    )}
                    {b.projekt && (
                      <Link href={`/projekte/${b.projekt.id}`} className="block text-xs text-grau hover:text-tinte hover:underline">
                        Projekt {b.projekt.name}
                      </Link>
                    )}
                    {/* Auf schmalen Bildschirmen stehen Art, Zeitpunkt und Benutzer unter dem Artikel. */}
                    <span className="block text-xs text-grau sm:hidden">{BEWEGUNGSARTEN[b.art]}</span>
                    <span className="block text-xs text-grau md:hidden">
                      {formatZeitpunkt(b.erstellt_am)} · {b.ersteller?.anzeigename ?? "Unbekannt"}
                    </span>
                    <span className="hidden text-xs text-grau md:block lg:hidden">
                      {b.ersteller?.anzeigename ?? "Unbekannt"}
                    </span>
                    {b.storniert && (
                      <span className="mt-1 block sm:hidden">
                        <StorniertLabel />
                      </span>
                    )}
                    {b.kommentar && <span className="mt-1 block text-xs text-tinte/80 md:hidden">{b.kommentar}</span>}
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className={`block ${b.storniert ? "text-grau" : ""}`}>{BEWEGUNGSARTEN[b.art]}</span>
                    {b.storniert && (
                      <span className="mt-1 block">
                        <StorniertLabel />
                      </span>
                    )}
                    {b.original && (
                      <span className="mt-1 block text-xs text-grau">
                        zu {BEWEGUNGSARTEN[b.original.art]} vom {formatZeitpunkt(b.original.erstellt_am)}
                      </span>
                    )}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-mono whitespace-nowrap tabular-nums ${
                      b.storniert ? "text-grau line-through" : b.menge > 0 ? "text-ok" : "text-tinte"
                    }`}
                  >
                    {formatMengeMitVorzeichen(b.menge, einheit)}
                  </td>
                  <td className="hidden px-4 py-3 lg:table-cell">{b.ersteller?.anzeigename ?? "Unbekannt"}</td>
                  <td className="hidden max-w-xs px-4 py-3 text-xs text-tinte/80 md:table-cell">
                    {b.kommentar ?? <span className="text-grau">–</span>}
                    {stornierbar && (
                      <span className="mt-1 block">
                        <StornoKnopf
                          aktion={stornieren.bind(null, b.id)}
                          beschreibung={`${BEWEGUNGSARTEN[b.art]} ${formatMengeMitVorzeichen(b.menge, einheit)}`}
                        />
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {bewegungen.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-grau">
            {gefiltert ? "Keine Bewegungen für diese Filter." : "Noch keine Bewegungen."}
          </p>
        )}
      </section>

      <nav aria-label="Seiten" className="flex items-center justify-between gap-3">
        <p className="font-mono text-xs text-grau tabular-nums">
          Seite {filter.seite} · {bewegungen.length} Einträge
        </p>
        <div className="flex gap-2">
          {filter.seite > 1 && (
            <Link href={historieUrl(filter, filter.seite - 1)} className={knopfSekundaer}>
              ← Neuere
            </Link>
          )}
          {weitere && (
            <Link href={historieUrl(filter, filter.seite + 1)} className={knopfSekundaer}>
              Ältere →
            </Link>
          )}
        </div>
      </nav>
    </>
  );
}
