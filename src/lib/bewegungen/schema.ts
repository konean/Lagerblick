import { z } from "zod";
import { istGanzzahligeEinheit, mengeSchema, type Einheit } from "@/lib/materialien/schema";

// Anzeigenamen der Bewegungsarten. Die Schlüssel entsprechen dem Enum public.bewegungsart.
export const BEWEGUNGSARTEN = {
  eingang: "Eingang",
  entnahme: "Entnahme",
  korrektur: "Korrektur",
  storno: "Storno",
} as const;

export type Bewegungsart = keyof typeof BEWEGUNGSARTEN;

// Arten, die über das Buchungsformular gebucht werden. Storno läuft über die einzelne Bewegung.
export const FORMULAR_ARTEN = ["eingang", "entnahme", "korrektur"] as const;
export type FormularArt = (typeof FORMULAR_ARTEN)[number];

export const formularArtSchema = z.enum(FORMULAR_ARTEN, "Unbekannte Buchungsart.");

const optionalerKommentar = z
  .string()
  .trim()
  .max(500, "Der Kommentar ist zu lang (höchstens 500 Zeichen).")
  .transform((wert) => (wert === "" ? null : wert));

const pflichtGrund = z
  .string()
  .trim()
  .min(1, "Bitte einen Grund angeben.")
  .max(500, "Der Grund ist zu lang (höchstens 500 Zeichen).");

// Dieselben Regeln prüfen buche_eingang, buche_entnahme und buche_korrektur in der Datenbank.
// Eingang und Entnahme: Menge > 0, bei der Entnahme optional ein Projekt. Korrektur: gezählter Bestand ≥ 0 und Grund ist Pflicht.
export function buchungSchema(art: FormularArt, einheit: Einheit) {
  const ganzzahlig = (menge: number) => !istGanzzahligeEinheit(einheit) || Number.isInteger(menge);
  const ganzzahligMeldung = "Bei Stück, Rolle und Packung sind nur ganze Zahlen möglich.";

  if (art === "korrektur") {
    return z.object({
      menge: mengeSchema.refine(ganzzahlig, ganzzahligMeldung),
      kommentar: pflichtGrund,
    });
  }
  return z.object({
    menge: mengeSchema
      .refine((menge) => menge > 0, "Die Menge muss größer als 0 sein.")
      .refine(ganzzahlig, ganzzahligMeldung),
    kommentar: optionalerKommentar,
    // Nur das Entnahmeformular sendet ein Projekt. Leer bedeutet: ohne Projektbezug.
    projekt_id: z
      .union([z.uuid("Bitte ein gültiges Projekt wählen."), z.literal("")])
      .optional()
      .transform((wert) => wert || undefined),
  });
}

export const stornoSchema = z.object({ kommentar: pflichtGrund });
