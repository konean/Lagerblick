"use client";

import { useActionState, useId } from "react";
import { eingabeBasis, Feldfehler, knopfSekundaer, Meldung } from "@/components/ui";
import type { FormZustand } from "../actions";

export function KategorieFormular({
  aktion,
  vorgabe = "",
  beschriftung,
}: {
  aktion: (vorher: FormZustand, formData: FormData) => Promise<FormZustand>;
  vorgabe?: string;
  beschriftung: string;
}) {
  const [zustand, absenden, laeuft] = useActionState(aktion, {});
  const fehler = zustand.feldfehler?.name;
  const fehlerId = useId();

  return (
    <form action={absenden} className="space-y-2" noValidate>
      {zustand.fehler && <Meldung>{zustand.fehler}</Meldung>}
      <div className="flex gap-2">
        <input
          name="name"
          aria-label="Kategoriename"
          defaultValue={zustand.werte?.name ?? vorgabe}
          required
          maxLength={60}
          aria-invalid={fehler ? true : undefined}
          aria-describedby={fehler ? fehlerId : undefined}
          className={eingabeBasis}
        />
        <button type="submit" disabled={laeuft} className={`${knopfSekundaer} shrink-0`}>
          {laeuft ? "…" : beschriftung}
        </button>
      </div>
      <Feldfehler id={fehlerId} text={fehler} />
    </form>
  );
}
