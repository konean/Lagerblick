import { cache } from "react";
import { knappeMaterialien, ladeBestaende } from "@/lib/bewegungen/daten";
import { ladeMaterialien } from "@/lib/materialien/daten";
import { ladeReservierungen } from "@/lib/reservierungen/daten";

// Die Übersicht zeigt Kennzahlen und Listen in getrennten Suspense-Grenzen.
// cache() sorgt dafür, dass gemeinsame Abfragen pro Aufruf nur einmal laufen.

export const ladeMaterialLage = cache(async () => {
  const [materialien, bestaende] = await Promise.all([ladeMaterialien({ status: "aktiv" }), ladeBestaende()]);
  return { anzahlAktiv: materialien.length, knappe: knappeMaterialien(materialien, bestaende) };
});

export const ladeOffeneReservierungen = cache(() => ladeReservierungen());
