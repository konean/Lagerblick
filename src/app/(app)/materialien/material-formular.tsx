"use client";

import Link from "next/link";
import { useActionState } from "react";
import { EINHEITEN } from "@/lib/materialien/schema";
import { eingabeKlasse, Feldfehler, knopfPrimaer, knopfSekundaer, Meldung } from "@/components/ui";
import type { FormZustand } from "./actions";

type Vorgabe = {
  name: string;
  kategorie_id: string;
  hersteller: string;
  modell: string;
  sku: string;
  einheit: string;
  mindestbestand: string;
  beschreibung: string;
};

const LEER: Vorgabe = {
  name: "",
  kategorie_id: "",
  hersteller: "",
  modell: "",
  sku: "",
  einheit: "stueck",
  mindestbestand: "0",
  beschreibung: "",
};

export function MaterialFormular({
  aktion,
  kategorien,
  vorgabe,
  abbrechenHref,
}: {
  aktion: (vorher: FormZustand, formData: FormData) => Promise<FormZustand>;
  kategorien: { id: string; name: string }[];
  vorgabe?: Vorgabe;
  abbrechenHref: string;
}) {
  const [zustand, absenden, laeuft] = useActionState(aktion, {});
  // Nach einem Fehler die eingegebenen Werte behalten.
  const werte = { ...LEER, ...vorgabe, ...zustand.werte };
  const fehler = zustand.feldfehler ?? {};

  function feld(name: keyof Vorgabe) {
    return {
      name,
      id: name,
      defaultValue: werte[name],
      "aria-invalid": fehler[name] ? true : undefined,
      "aria-describedby": fehler[name] ? `${name}-fehler` : undefined,
      className: eingabeKlasse,
    };
  }

  return (
    <form action={absenden} className="space-y-5 rounded-m border border-linie bg-flaeche p-6" noValidate>
      {zustand.fehler && <Meldung>{zustand.fehler}</Meldung>}

      <label className="block text-sm font-medium">
        Artikelname
        <input {...feld("name")} required maxLength={200} />
        <Feldfehler id="name-fehler" text={fehler.name} />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Hersteller
          <input {...feld("hersteller")} required maxLength={100} />
          <Feldfehler id="hersteller-fehler" text={fehler.hersteller} />
        </label>
        <label className="block text-sm font-medium">
          Modell
          <input {...feld("modell")} required maxLength={100} />
          <Feldfehler id="modell-fehler" text={fehler.modell} />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Kategorie
          <select {...feld("kategorie_id")} required>
            <option value="" disabled>
              Bitte wählen
            </option>
            {kategorien.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
          <Feldfehler id="kategorie_id-fehler" text={fehler.kategorie_id} />
        </label>
        <label className="block text-sm font-medium">
          Artikelnummer / SKU <span className="font-normal text-grau">(optional)</span>
          <input {...feld("sku")} maxLength={64} className={`${eingabeKlasse} font-mono`} />
          <Feldfehler id="sku-fehler" text={fehler.sku} />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Einheit
          <select {...feld("einheit")} required>
            {Object.entries(EINHEITEN).map(([wert, label]) => (
              <option key={wert} value={wert}>
                {label}
              </option>
            ))}
          </select>
          <Feldfehler id="einheit-fehler" text={fehler.einheit} />
        </label>
        <label className="block text-sm font-medium">
          Mindestbestand
          <input
            {...feld("mindestbestand")}
            inputMode="decimal"
            required
            className={`${eingabeKlasse} font-mono tabular-nums`}
          />
          <Feldfehler id="mindestbestand-fehler" text={fehler.mindestbestand} />
        </label>
      </div>

      <label className="block text-sm font-medium">
        Beschreibung <span className="font-normal text-grau">(optional)</span>
        <textarea {...feld("beschreibung")} rows={3} maxLength={2000} />
        <Feldfehler id="beschreibung-fehler" text={fehler.beschreibung} />
      </label>

      <div className="flex gap-2 border-t border-linie pt-5">
        <button type="submit" disabled={laeuft} className={knopfPrimaer}>
          {laeuft ? "Wird gespeichert …" : "Speichern"}
        </button>
        <Link href={abbrechenHref} className={knopfSekundaer}>
          Abbrechen
        </Link>
      </div>
    </form>
  );
}
