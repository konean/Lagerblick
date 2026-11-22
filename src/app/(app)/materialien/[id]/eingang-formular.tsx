"use client";

import { useActionState } from "react";
import { EINHEITEN, istGanzzahligeEinheit, type Einheit } from "@/lib/materialien/schema";
import { eingabeKlasse, Feldfehler, knopfPrimaer, Meldung } from "@/components/ui";
import type { FormZustand } from "../actions";

export function EingangFormular({
  aktion,
  einheit,
}: {
  aktion: (vorher: FormZustand, formData: FormData) => Promise<FormZustand>;
  einheit: Einheit;
}) {
  const [zustand, absenden, laeuft] = useActionState(aktion, {});
  const fehler = zustand.feldfehler ?? {};

  // React setzt das Formular nach dem Absenden zurück. Nach einem Fehler
  // stehen die eingegebenen Werte über defaultValue wieder drin.
  return (
    <form action={absenden} className="space-y-4" noValidate>
      <h2 className="text-sm font-semibold">Wareneingang buchen</h2>
      {zustand.fehler && <Meldung>{zustand.fehler}</Meldung>}
      {zustand.erfolg && <Meldung art="hinweis">{zustand.erfolg}</Meldung>}

      <label htmlFor="menge" className="block text-sm font-medium">
        Menge
        <span className="relative block">
          <input
            id="menge"
            name="menge"
            inputMode={istGanzzahligeEinheit(einheit) ? "numeric" : "decimal"}
            autoComplete="off"
            required
            defaultValue={zustand.werte?.menge ?? ""}
            aria-invalid={fehler.menge ? true : undefined}
            aria-describedby={fehler.menge ? "menge-fehler" : undefined}
            className={`${eingabeKlasse} pr-20 font-mono tabular-nums`}
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center font-mono text-xs text-grau">
            {EINHEITEN[einheit]}
          </span>
        </span>
        <Feldfehler id="menge-fehler" text={fehler.menge} />
      </label>

      <label htmlFor="kommentar" className="block text-sm font-medium">
        Kommentar <span className="font-normal text-grau">(optional)</span>
        <input
          id="kommentar"
          name="kommentar"
          maxLength={500}
          placeholder="z. B. Lieferschein-Nr."
          defaultValue={zustand.werte?.kommentar ?? ""}
          aria-invalid={fehler.kommentar ? true : undefined}
          aria-describedby={fehler.kommentar ? "kommentar-fehler" : undefined}
          className={eingabeKlasse}
        />
        <Feldfehler id="kommentar-fehler" text={fehler.kommentar} />
      </label>

      <button type="submit" disabled={laeuft} className={`${knopfPrimaer} w-full sm:w-auto`}>
        {laeuft ? "Wird gebucht …" : "Eingang buchen"}
      </button>
    </form>
  );
}
