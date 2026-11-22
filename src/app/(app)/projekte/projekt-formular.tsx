"use client";

import Link from "next/link";
import { useActionState } from "react";
import { eingabeKlasse, Feldfehler, knopfPrimaer, knopfSekundaer, Meldung } from "@/components/ui";
import type { FormZustand } from "../materialien/actions";

type Vorgabe = { name: string; nummer: string; hinweis: string };

const LEER: Vorgabe = { name: "", nummer: "", hinweis: "" };

export function ProjektFormular({
  aktion,
  vorgabe,
  abbrechenHref,
}: {
  aktion: (vorher: FormZustand, formData: FormData) => Promise<FormZustand>;
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

      <div className="grid gap-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <label className="block text-sm font-medium">
          Projektname
          <input {...feld("name")} required maxLength={200} />
          <Feldfehler id="name-fehler" text={fehler.name} />
        </label>
        <label className="block text-sm font-medium">
          Projektnummer <span className="font-normal text-grau">(optional)</span>
          <input {...feld("nummer")} maxLength={64} className={`${eingabeKlasse} font-mono`} />
          <Feldfehler id="nummer-fehler" text={fehler.nummer} />
        </label>
      </div>

      <label className="block text-sm font-medium">
        Hinweis <span className="font-normal text-grau">(optional)</span>
        <textarea {...feld("hinweis")} rows={3} maxLength={2000} />
        <Feldfehler id="hinweis-fehler" text={fehler.hinweis} />
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
