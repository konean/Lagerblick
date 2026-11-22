"use client";

import { useActionState, useId, useState } from "react";
import type { FormZustand } from "@/app/(app)/materialien/actions";
import { eingabeBasis, Feldfehler, knopfGefahr, knopfSekundaer, Meldung } from "./ui";

// Storno einer einzelnen Bewegung. Klappt ein kleines Formular für den
// Pflicht-Grund auf, damit nicht versehentlich storniert wird.
export function StornoKnopf({
  aktion,
  beschreibung,
}: {
  aktion: (vorher: FormZustand, formData: FormData) => Promise<FormZustand>;
  beschreibung: string;
}) {
  const [offen, setOffen] = useState(false);
  const [zustand, absenden, laeuft] = useActionState(aktion, {});
  const id = useId();

  if (!offen) {
    return (
      <button
        type="button"
        onClick={() => setOffen(true)}
        className="text-xs text-grau underline-offset-2 hover:text-fehler hover:underline"
      >
        Stornieren
      </button>
    );
  }

  const fehler = zustand.feldfehler?.kommentar;
  return (
    <form action={absenden} className="mt-2 space-y-2 rounded-s border border-linie bg-papier p-3" noValidate>
      <label htmlFor={`${id}-grund`} className="block text-xs font-medium">
        Grund für das Storno von {beschreibung}
        <input
          id={`${id}-grund`}
          name="kommentar"
          maxLength={500}
          required
          autoFocus
          placeholder="z. B. falsch erfasst"
          defaultValue={zustand.werte?.kommentar ?? ""}
          aria-invalid={fehler ? true : undefined}
          aria-describedby={fehler ? `${id}-fehler` : undefined}
          className={`mt-1 ${eingabeBasis}`}
        />
        <Feldfehler id={`${id}-fehler`} text={fehler} />
      </label>
      {zustand.fehler && <Meldung>{zustand.fehler}</Meldung>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={laeuft} className={knopfGefahr}>
          {laeuft ? "Wird storniert …" : "Storno buchen"}
        </button>
        <button type="button" onClick={() => setOffen(false)} className={knopfSekundaer}>
          Abbrechen
        </button>
      </div>
    </form>
  );
}
