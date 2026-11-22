import Link from "next/link";
import { reservierungAufheben } from "@/app/(app)/reservierungen/actions";
import { formatMenge, formatZeitpunkt } from "@/lib/format";
import type { ladeReservierungen } from "@/lib/reservierungen/daten";
import { AktionsKnopf } from "./aktions-knopf";

type Reservierung = Awaited<ReturnType<typeof ladeReservierungen>>[number];

// Liste offener Reservierungen. Auf der Materialseite ist das Material bekannt,
// auf der Projektseite das Projekt; die jeweilige Spalte entfällt dann.
export function ReservierungsTabelle({
  reservierungen,
  spalten,
  leer = "Keine offenen Reservierungen.",
}: {
  reservierungen: Reservierung[];
  spalten: "material" | "projekt" | "beide";
  leer?: string;
}) {
  if (reservierungen.length === 0) {
    return <p className="px-4 py-6 text-center text-sm text-grau">{leer}</p>;
  }

  const mitMaterial = spalten !== "projekt";
  const mitProjekt = spalten !== "material";

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-linie font-mono text-[11px] tracking-wider text-grau uppercase">
          <tr>
            {mitMaterial && <th className="px-4 py-3 font-normal">Material</th>}
            {mitProjekt && <th className="px-4 py-3 font-normal">Projekt</th>}
            <th className="px-4 py-3 text-right font-normal">Reserviert</th>
            <th className="hidden px-4 py-3 font-normal md:table-cell">Zuletzt geändert</th>
            <th className="px-4 py-3 font-normal">
              <span className="sr-only">Aktion</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-linie">
          {reservierungen.map((r) => (
            <tr key={`${r.material_id}-${r.projekt_id}`} className="align-top hover:bg-papier">
              {mitMaterial && (
                <td className="px-4 py-3">
                  <Link href={`/materialien/${r.material_id}`} className="font-medium hover:underline">
                    {r.material?.name}
                  </Link>
                </td>
              )}
              {mitProjekt && (
                <td className="px-4 py-3">
                  <Link href={`/projekte/${r.projekt_id}`} className={mitMaterial ? "hover:underline" : "font-medium hover:underline"}>
                    {r.projekt?.name}
                  </Link>
                  {r.projekt?.nummer && <span className="block font-mono text-xs text-grau">{r.projekt.nummer}</span>}
                </td>
              )}
              <td className="px-4 py-3 text-right font-mono whitespace-nowrap text-reserviert tabular-nums">
                {formatMenge(r.menge, r.material?.einheit)}
              </td>
              <td className="hidden px-4 py-3 text-xs text-grau md:table-cell">
                {formatZeitpunkt(r.geaendert_am)} · {r.bearbeiter?.anzeigename ?? "Unbekannt"}
              </td>
              <td className="px-4 py-3 text-right">
                <AktionsKnopf
                  aktion={reservierungAufheben.bind(null, r.material_id, r.projekt_id)}
                  beschriftung="Aufheben"
                  laeuftText="Wird aufgehoben …"
                  className="text-xs text-grau underline-offset-2 hover:text-fehler hover:underline disabled:opacity-60"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
