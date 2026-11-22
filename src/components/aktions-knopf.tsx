"use client";

import { useActionState } from "react";
import type { FormZustand } from "@/app/(app)/materialien/actions";
import { Meldung } from "./ui";

// Knopf für eine einzelne Server Action (Archivieren, Löschen …),
// optional mit Rückfrage und mit Anzeige einer Fehlermeldung.
export function AktionsKnopf({
  aktion,
  beschriftung,
  laeuftText,
  rueckfrage,
  className,
}: {
  aktion: (vorher: FormZustand) => Promise<FormZustand>;
  beschriftung: string;
  laeuftText?: string;
  rueckfrage?: string;
  className: string;
}) {
  const [zustand, ausloesen, laeuft] = useActionState(aktion, {});

  return (
    <form
      action={ausloesen}
      onSubmit={(e) => {
        if (rueckfrage && !window.confirm(rueckfrage)) e.preventDefault();
      }}
      className="contents"
    >
      <button type="submit" disabled={laeuft} className={className}>
        {laeuft ? (laeuftText ?? "…") : beschriftung}
      </button>
      {zustand.fehler && (
        <div className="basis-full">
          <Meldung>{zustand.fehler}</Meldung>
        </div>
      )}
    </form>
  );
}
