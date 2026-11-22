import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getBenutzer } from "@/lib/auth";
import { ladeBestaende, unterMindestbestand } from "@/lib/bewegungen/daten";
import { formatMenge } from "@/lib/format";
import { ladeKategorien, ladeMaterialien, type MaterialFilter } from "@/lib/materialien/daten";
import { BestandsHinweis, eingabeKlasse, knopfPrimaer, knopfSekundaer, Seitenkopf, StatusLabel } from "@/components/ui";

export const metadata: Metadata = { title: "Materialien · Lagerblick" };

export default function MaterialienSeite(props: PageProps<"/materialien">) {
  return (
    <div className="space-y-6">
      <Seitenkopf nummer="02" bereich="Materialien" titel="Materialien">
        <Suspense>
          <AdminAktionen />
        </Suspense>
      </Seitenkopf>
      <Suspense fallback={<p className="text-sm text-grau">Materialien werden geladen …</p>}>
        <Inhalt searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function AdminAktionen() {
  const benutzer = await getBenutzer();
  if (benutzer.rolle !== "admin") return null;
  return (
    <>
      <Link href="/materialien/kategorien" className={knopfSekundaer}>
        Kategorien
      </Link>
      <Link href="/materialien/neu" className={knopfPrimaer}>
        Material anlegen
      </Link>
    </>
  );
}

function einzelwert(wert: string | string[] | undefined) {
  return Array.isArray(wert) ? wert[0] : wert;
}

async function Inhalt({ searchParams }: { searchParams: PageProps<"/materialien">["searchParams"] }) {
  const parameter = await searchParams;
  const statusWert = einzelwert(parameter.status);
  const filter: MaterialFilter = {
    q: einzelwert(parameter.q) ?? "",
    kategorie: einzelwert(parameter.kategorie) || undefined,
    status: statusWert === "archiviert" || statusWert === "alle" ? statusWert : "aktiv",
  };

  const [kategorien, materialien, bestaende] = await Promise.all([
    ladeKategorien(),
    ladeMaterialien(filter),
    ladeBestaende(),
  ]);

  return (
    <>
      {/* GET-Formular: Filter landen in der URL und lassen sich teilen. */}
      <form className="grid grid-cols-2 gap-3 rounded-m border border-linie bg-flaeche p-4 lg:grid-cols-[1fr_200px_160px_auto] lg:items-end">
        <label className="col-span-2 block text-sm font-medium lg:col-span-1">
          Suche
          <input
            name="q"
            type="search"
            defaultValue={filter.q}
            placeholder="Name, Hersteller, Modell oder Artikelnummer"
            className={eingabeKlasse}
          />
        </label>
        <label className="block text-sm font-medium">
          Kategorie
          <select name="kategorie" defaultValue={filter.kategorie ?? ""} className={eingabeKlasse}>
            <option value="">Alle Kategorien</option>
            {kategorien.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Status
          <select name="status" defaultValue={filter.status} className={eingabeKlasse}>
            <option value="aktiv">Aktiv</option>
            <option value="archiviert">Archiviert</option>
            <option value="alle">Alle</option>
          </select>
        </label>
        <div className="col-span-2 flex gap-2 lg:col-span-1">
          <button type="submit" className={knopfPrimaer}>
            Filtern
          </button>
          <Link href="/materialien" className={knopfSekundaer}>
            Zurücksetzen
          </Link>
        </div>
      </form>

      <section className="overflow-x-auto rounded-m border border-linie bg-flaeche">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-linie font-mono text-[11px] tracking-wider text-grau uppercase">
            <tr>
              <th className="px-4 py-3 font-normal">Artikel</th>
              <th className="hidden px-4 py-3 font-normal md:table-cell">Kategorie</th>
              <th className="hidden px-4 py-3 font-normal lg:table-cell">Artikelnr.</th>
              <th className="px-4 py-3 text-right font-normal">Bestand</th>
              <th className="hidden px-4 py-3 text-right font-normal sm:table-cell">Mindestbestand</th>
              <th className="hidden px-4 py-3 font-normal sm:table-cell">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-linie">
            {materialien.map((m) => {
              const bestand = bestaende.get(m.id) ?? 0;
              const knapp = unterMindestbestand(bestand, m.mindestbestand);
              return (
                <tr key={m.id} className="hover:bg-papier">
                  <td className="px-4 py-3">
                    <Link href={`/materialien/${m.id}`} className="font-medium hover:underline">
                      {m.name}
                    </Link>
                    <span className="block text-xs text-grau">
                      {m.hersteller} · {m.modell}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">{m.kategorie?.name}</td>
                  <td className="hidden px-4 py-3 font-mono text-xs lg:table-cell">{m.sku ?? "–"}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-mono tabular-nums ${knapp ? "font-medium text-warnung" : ""}`}>
                      {formatMenge(bestand, m.einheit)}
                    </span>
                    {knapp && (
                      <span className="mt-1 block">
                        <BestandsHinweis kurz />
                      </span>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-right font-mono text-grau tabular-nums sm:table-cell">
                    {formatMenge(m.mindestbestand, m.einheit)}
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <StatusLabel status={m.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {materialien.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-grau">Keine Materialien gefunden.</p>
        )}
      </section>
      <p className="font-mono text-xs text-grau">{materialien.length} Einträge</p>
    </>
  );
}
