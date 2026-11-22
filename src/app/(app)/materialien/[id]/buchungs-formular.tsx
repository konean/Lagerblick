"use client";

import { useActionState, useState } from "react";
import { BEWEGUNGSARTEN, type FormularArt } from "@/lib/bewegungen/schema";
import { formatMenge } from "@/lib/format";
import { EINHEITEN, istGanzzahligeEinheit, type Einheit } from "@/lib/materialien/schema";
import { eingabeKlasse, Feldfehler, knopfPrimaer, Meldung } from "@/components/ui";
import type { FormZustand } from "../actions";

// Beschriftungen je Buchungsart. Bei der Korrektur wird der gezählte Bestand eingegeben.
const TEXTE: Record<FormularArt, { menge: string; kommentar: string; knopf: string; laeuft: string }> = {
  eingang: { menge: "Menge", kommentar: "Kommentar", knopf: "Eingang buchen", laeuft: "Wird gebucht …" },
  entnahme: { menge: "Menge", kommentar: "Kommentar", knopf: "Entnahme buchen", laeuft: "Wird gebucht …" },
  korrektur: { menge: "Gezählter Bestand", kommentar: "Grund", knopf: "Bestand korrigieren", laeuft: "Wird korrigiert …" },
};

const PLATZHALTER: Record<FormularArt, string> = {
  eingang: "z. B. Lieferschein-Nr.",
  entnahme: "z. B. Baustelle oder Verwendung",
  korrektur: "z. B. Inventur, Bruch, Schwund",
};

export function BuchungsFormular({
  aktion,
  einheit,
  bestand,
  mitKorrektur,
}: {
  aktion: (vorher: FormZustand, formData: FormData) => Promise<FormZustand>;
  einheit: Einheit;
  bestand: number;
  mitKorrektur: boolean;
}) {
  const [zustand, absenden, laeuft] = useActionState(aktion, {});
  const [art, setArt] = useState<FormularArt>("eingang");
  const arten: FormularArt[] = mitKorrektur ? ["eingang", "entnahme", "korrektur"] : ["eingang", "entnahme"];
  const texte = TEXTE[art];

  // Meldungen und eingegebene Werte gehören zur Art, mit der abgeschickt wurde.
  // Nach einem Wechsel der Art beginnt das Formular leer.
  const passend = !zustand.werte || zustand.werte.art === art;
  const fehler = passend ? (zustand.feldfehler ?? {}) : {};
  const werte = passend ? zustand.werte : undefined;

  // React setzt das Formular nach dem Absenden zurück. Nach einem Fehler
  // stehen die eingegebenen Werte über defaultValue wieder drin.
  return (
    <form action={absenden} className="space-y-4" noValidate>
      <input type="hidden" name="art" value={art} />

      <div role="group" aria-label="Buchungsart" className="flex rounded-s border border-linie bg-papier p-0.5">
        {arten.map((a) => (
          <button
            key={a}
            type="button"
            aria-pressed={a === art}
            onClick={() => setArt(a)}
            className={`flex-1 rounded-[3px] px-2 py-1.5 text-sm ${
              a === art ? "bg-flaeche font-medium text-tinte shadow-[0_0_0_1px_var(--color-linie-stark)]" : "text-grau hover:text-tinte"
            }`}
          >
            {BEWEGUNGSARTEN[a]}
          </button>
        ))}
      </div>

      {passend && zustand.fehler && <Meldung>{zustand.fehler}</Meldung>}
      {zustand.erfolg && <Meldung art="hinweis">{zustand.erfolg}</Meldung>}

      <label htmlFor="menge" className="block text-sm font-medium">
        {texte.menge}
        <span className="relative block">
          <input
            key={`menge-${art}`}
            id="menge"
            name="menge"
            inputMode={istGanzzahligeEinheit(einheit) ? "numeric" : "decimal"}
            autoComplete="off"
            required
            defaultValue={werte?.menge ?? ""}
            aria-invalid={fehler.menge ? true : undefined}
            aria-describedby={fehler.menge ? "menge-fehler" : art !== "eingang" ? "menge-hinweis" : undefined}
            className={`${eingabeKlasse} pr-20 font-mono tabular-nums`}
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center font-mono text-xs text-grau">
            {EINHEITEN[einheit]}
          </span>
        </span>
        <Feldfehler id="menge-fehler" text={fehler.menge} />
        {art !== "eingang" && !fehler.menge && (
          <span id="menge-hinweis" className="mt-1 block font-mono text-xs font-normal text-grau tabular-nums">
            {art === "entnahme" ? "Verfügbar" : "Aktuell gebucht"} {formatMenge(bestand, einheit)}
          </span>
        )}
      </label>

      <label htmlFor="kommentar" className="block text-sm font-medium">
        {texte.kommentar}
        {art !== "korrektur" && <span className="font-normal text-grau"> (optional)</span>}
        <input
          key={`kommentar-${art}`}
          id="kommentar"
          name="kommentar"
          maxLength={500}
          required={art === "korrektur"}
          placeholder={PLATZHALTER[art]}
          defaultValue={werte?.kommentar ?? ""}
          aria-invalid={fehler.kommentar ? true : undefined}
          aria-describedby={fehler.kommentar ? "kommentar-fehler" : undefined}
          className={eingabeKlasse}
        />
        <Feldfehler id="kommentar-fehler" text={fehler.kommentar} />
      </label>

      <button type="submit" disabled={laeuft} className={`${knopfPrimaer} w-full sm:w-auto`}>
        {laeuft ? texte.laeuft : texte.knopf}
      </button>
    </form>
  );
}
