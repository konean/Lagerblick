import { z } from "zod";
import { istGanzzahligeEinheit, mengeSchema, type Einheit } from "@/lib/materialien/schema";

// Gesetzt wird die reservierte Gesamtmenge eines Projekts. 0 hebt die Reservierung auf.
// Dieselben Regeln prüft setze_reservierung in der Datenbank, dazu die freie Menge.
export function reservierungSchema(einheit: Einheit) {
  return z.object({
    projekt_id: z.uuid("Bitte ein Projekt wählen."),
    menge: mengeSchema.refine(
      (menge) => !istGanzzahligeEinheit(einheit) || Number.isInteger(menge),
      "Bei Stück, Rolle und Packung sind nur ganze Zahlen möglich.",
    ),
  });
}
