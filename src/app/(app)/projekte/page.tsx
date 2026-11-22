import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getBenutzer } from "@/lib/auth";
import { ladeProjekte, type ProjektFilter } from "@/lib/projekte/daten";
import { eingabeKlasse, knopfPrimaer, knopfSekundaer, Seitenkopf, StatusLabel } from "@/components/ui";

export const metadata: Metadata = { title: "Projekte · Lagerblick" };

export default function ProjekteSeite(props: PageProps<"/projekte">) {
  return (
    <div className="space-y-6">
      <Seitenkopf nummer="05" bereich="Projekte" titel="Projekte">
        <Suspense>
          <AdminAktionen />
        </Suspense>
      </Seitenkopf>
      <Suspense fallback={<p className="text-sm text-grau">Projekte werden geladen …</p>}>
        <Inhalt searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function AdminAktionen() {
  const benutzer = await getBenutzer();
  if (benutzer.rolle !== "admin") return null;
  return (
    <Link href="/projekte/neu" className={knopfPrimaer}>
      Projekt anlegen
    </Link>
  );
}

function einzelwert(wert: string | string[] | undefined) {
  return Array.isArray(wert) ? wert[0] : wert;
}

async function Inhalt({ searchParams }: { searchParams: PageProps<"/projekte">["searchParams"] }) {
  const parameter = await searchParams;
  const statusWert = einzelwert(parameter.status);
  const filter: ProjektFilter = {
    q: einzelwert(parameter.q) ?? "",
    status: statusWert === "abgeschlossen" || statusWert === "alle" ? statusWert : "aktiv",
  };

  const projekte = await ladeProjekte(filter);

  return (
    <>
      {/* GET-Formular: Filter landen in der URL und lassen sich teilen. */}
      <form className="grid grid-cols-2 gap-3 rounded-m border border-linie bg-flaeche p-4 lg:grid-cols-[1fr_180px_auto] lg:items-end">
        <label className="col-span-2 block text-sm font-medium lg:col-span-1">
          Suche
          <input
            name="q"
            type="search"
            defaultValue={filter.q}
            placeholder="Projektname oder Projektnummer"
            className={eingabeKlasse}
          />
        </label>
        <label className="block text-sm font-medium">
          Status
          <select name="status" defaultValue={filter.status} className={eingabeKlasse}>
            <option value="aktiv">Aktiv</option>
            <option value="abgeschlossen">Abgeschlossen</option>
            <option value="alle">Alle</option>
          </select>
        </label>
        <div className="flex gap-2 self-end">
          <button type="submit" className={knopfPrimaer}>
            Filtern
          </button>
          <Link href="/projekte" className={knopfSekundaer}>
            Zurücksetzen
          </Link>
        </div>
      </form>

      <section className="overflow-x-auto rounded-m border border-linie bg-flaeche">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-linie font-mono text-[11px] tracking-wider text-grau uppercase">
            <tr>
              <th className="px-4 py-3 font-normal">Projekt</th>
              <th className="hidden px-4 py-3 font-normal sm:table-cell">Projektnr.</th>
              <th className="px-4 py-3 font-normal">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-linie">
            {projekte.map((p) => (
              <tr key={p.id} className="hover:bg-papier">
                <td className="px-4 py-3">
                  <Link href={`/projekte/${p.id}`} className="font-medium hover:underline">
                    {p.name}
                  </Link>
                  {p.nummer && <span className="block font-mono text-xs text-grau sm:hidden">{p.nummer}</span>}
                </td>
                <td className="hidden px-4 py-3 font-mono text-xs sm:table-cell">{p.nummer ?? "–"}</td>
                <td className="px-4 py-3">
                  <StatusLabel status={p.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {projekte.length === 0 && <p className="px-4 py-8 text-center text-sm text-grau">Keine Projekte gefunden.</p>}
      </section>
      <p className="font-mono text-xs text-grau">{projekte.length} Einträge</p>
    </>
  );
}
