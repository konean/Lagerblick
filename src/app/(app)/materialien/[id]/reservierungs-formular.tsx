"use client";

import { useActionState, useState } from "react";
import { formatMenge } from "@/lib/format";
import { istGanzzahligeEinheit, type Einheit } from "@/lib/materialien/schema";
import { eingabeKlasse, Feldfehler, knopfSekundaer, Meldung } from "@/components/ui";
import type { FormZustand } from "../actions";

type Projekt = { id: string; name: string; nummer: string | null };

// Setzt die reservierte Gesamtmenge eines Projekts für dieses Material.
// Ist für das Projekt schon etwas reserviert, wird die Menge ersetzt; 0 hebt sie auf.
export function ReservierungsFormular({
  aktion,
  einheit,
  frei,
  projekte,
  bisher,
}: {
  aktion: (vorher: FormZustand, formData: FormData) => Promise<FormZustand>;
  einheit: Einheit;
  frei: number;
  projekte: Projekt[];
  bisher: Record<string, number>;
}) {
  const [zustand, absenden, laeuft] = useActionState(aktion, {});
  const [projektId, setProjektId] = useState(zustand.werte?.projekt_id ?? "");
  const fehler = zustand.feldfehler ?? {};
  const eigene = bisher[projektId] ?? 0;

  if (projekte.length === 0) {
    return <p className="text-sm text-grau">Zum Reservieren gibt es noch kein aktives Projekt.</p>;
  }

  return (
    <form action={absenden} className="space-y-4" noValidate>
      {zustand.fehler && <Meldung>{zustand.fehler}</Meldung>}
      {zustand.erfolg && <Meldung art="hinweis">{zustand.erfolg}</Meldung>}

      <div className="grid gap-4 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <label htmlFor="reservierung-projekt" className="block text-sm font-medium">
          Projekt
          <select
            id="reservierung-projekt"
            name="projekt_id"
            required
            value={projektId}
            onChange={(e) => setProjektId(e.target.value)}
            aria-invalid={fehler.projekt_id ? true : undefined}
            aria-describedby={fehler.projekt_id ? "reservierung-projekt-fehler" : undefined}
            className={eingabeKlasse}
          >
            <option value="" disabled>
              Bitte wählen
            </option>
            {projekte.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nummer ? `${p.nummer} · ${p.name}` : p.name}
              </option>
            ))}
          </select>
          <Feldfehler id="reservierung-projekt-fehler" text={fehler.projekt_id} />
        </label>

        <label htmlFor="reservierung-menge" className="block text-sm font-medium">
          Menge gesamt
          <input
            key={projektId}
            id="reservierung-menge"
            name="menge"
            inputMode={istGanzzahligeEinheit(einheit) ? "numeric" : "decimal"}
            autoComplete="off"
            required
            defaultValue={zustand.werte?.projekt_id === projektId ? zustand.werte.menge : eigene ? String(eigene).replace(".", ",") : ""}
            aria-invalid={fehler.menge ? true : undefined}
            aria-describedby={fehler.menge ? "reservierung-menge-fehler" : "reservierung-menge-hinweis"}
            className={`${eingabeKlasse} font-mono tabular-nums`}
          />
          <Feldfehler id="reservierung-menge-fehler" text={fehler.menge} />
        </label>
      </div>

      <p id="reservierung-menge-hinweis" className="font-mono text-xs text-grau tabular-nums">
        Frei {formatMenge(Math.max(frei, 0), einheit)}
        {eigene > 0 && ` · für dieses Projekt bereits ${formatMenge(eigene, einheit)} reserviert, 0 hebt die Reservierung auf`}
      </p>

      <button type="submit" disabled={laeuft} className={`${knopfSekundaer} w-full sm:w-auto`}>
        {laeuft ? "Wird gespeichert …" : eigene > 0 ? "Reservierung ändern" : "Reservieren"}
      </button>
    </form>
  );
}
