import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ladeReservierungen } from "@/lib/reservierungen/daten";
import { ReservierungsTabelle } from "@/components/reservierungs-tabelle";
import { eingabeKlasse, knopfPrimaer, knopfSekundaer, Seitenkopf } from "@/components/ui";

export const metadata: Metadata = { title: "Reservierungen · Lagerblick" };

export default function ReservierungenSeite(props: PageProps<"/reservierungen">) {
  return (
    <div className="space-y-6">
      <Seitenkopf nummer="04" bereich="Reservierungen" titel="Offene Reservierungen" />
      <Suspense fallback={<p className="text-sm text-grau">Reservierungen werden geladen …</p>}>
        <Inhalt searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

function einzelwert(wert: string | string[] | undefined) {
  return Array.isArray(wert) ? wert[0] : wert;
}

async function Inhalt({ searchParams }: { searchParams: PageProps<"/reservierungen">["searchParams"] }) {
  const parameter = await searchParams;
  const material = einzelwert(parameter.material) ?? "";
  const projekt = einzelwert(parameter.projekt) ?? "";

  // Alle offenen Reservierungen laden (höchstens eine pro Material und Projekt) und
  // daraus die Auswahllisten bilden. So stehen dort nur Einträge, die auch etwas zeigen.
  const alle = await ladeReservierungen();
  const materialien = eindeutig(alle.map((r) => ({ id: r.material_id, name: r.material?.name ?? "" })));
  const projekte = eindeutig(alle.map((r) => ({ id: r.projekt_id, name: r.projekt?.name ?? "" })));
  const gefiltert = alle.filter(
    (r) => (!material || r.material_id === material) && (!projekt || r.projekt_id === projekt),
  );

  return (
    <>
      {/* GET-Formular: Filter landen in der URL und lassen sich teilen. */}
      <form className="grid grid-cols-2 gap-3 rounded-m border border-linie bg-flaeche p-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
        <label className="col-span-2 block text-sm font-medium sm:col-span-1">
          Projekt
          <select name="projekt" defaultValue={projekt} className={eingabeKlasse}>
            <option value="">Alle Projekte</option>
            {projekte.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="col-span-2 block text-sm font-medium sm:col-span-1">
          Material
          <select name="material" defaultValue={material} className={eingabeKlasse}>
            <option value="">Alle Materialien</option>
            {materialien.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <div className="col-span-2 flex gap-2 lg:col-span-1">
          <button type="submit" className={knopfPrimaer}>
            Filtern
          </button>
          <Link href="/reservierungen" className={knopfSekundaer}>
            Zurücksetzen
          </Link>
        </div>
      </form>

      <section className="rounded-m border border-linie bg-flaeche">
        <ReservierungsTabelle
          reservierungen={gefiltert}
          spalten="beide"
          leer={alle.length === 0 ? "Zurzeit ist nichts reserviert. Reserviert wird auf der Seite des Materials." : "Keine Reservierungen für diese Auswahl."}
        />
      </section>
      <p className="font-mono text-xs text-grau">{gefiltert.length} Einträge</p>
    </>
  );
}

// Doppelte Einträge entfernen und alphabetisch sortieren.
function eindeutig(eintraege: { id: string; name: string }[]) {
  const nachId = new Map(eintraege.map((e) => [e.id, e]));
  return [...nachId.values()].sort((a, b) => a.name.localeCompare(b.name, "de"));
}
