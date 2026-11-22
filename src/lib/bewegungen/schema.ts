import { z } from "zod";
import { istGanzzahligeEinheit, mengeSchema, type Einheit } from "@/lib/materialien/schema";

// Anzeigenamen der Bewegungsarten. Die Schlüssel entsprechen dem Enum public.bewegungsart.
export const BEWEGUNGSARTEN = {
  eingang: "Eingang",
  entnahme: "Entnahme",
  korrektur: "Korrektur",
  storno: "Storno",
} as const;

// Wareneingang: Menge > 0, bei Stückgut ganzzahlig. Dieselben Regeln prüft buche_eingang.
export function eingangSchema(einheit: Einheit) {
  return z
    .object({
      menge: mengeSchema
        .refine((menge) => menge > 0, "Die Menge muss größer als 0 sein.")
        .refine(
          (menge) => !istGanzzahligeEinheit(einheit) || Number.isInteger(menge),
          "Bei Stück, Rolle und Packung sind nur ganze Zahlen möglich.",
        ),
      kommentar: z
        .string()
        .trim()
        .max(500, "Der Kommentar ist zu lang (höchstens 500 Zeichen).")
        .transform((wert) => (wert === "" ? null : wert)),
    });
}
