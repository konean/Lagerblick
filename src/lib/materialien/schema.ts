import { z } from "zod";

// Anzeigenamen der Einheiten. Die Schlüssel entsprechen dem Enum public.einheit.
export const EINHEITEN = {
  stueck: "Stück",
  meter: "Meter",
  rolle: "Rolle",
  packung: "Packung",
  kg: "kg",
} as const;

export type Einheit = keyof typeof EINHEITEN;

const EINHEIT_SCHLUESSEL = Object.keys(EINHEITEN) as [Einheit, ...Einheit[]];

// Stückgut wird nur ganzzahlig gezählt (gleiche Regel wie in der Datenbank).
export function istGanzzahligeEinheit(einheit: Einheit) {
  return einheit !== "meter" && einheit !== "kg";
}

export function pflichttext(feld: string, max: number) {
  return z
    .string()
    .trim()
    .min(1, `${feld} fehlt.`)
    .max(max, `${feld} ist zu lang (höchstens ${max} Zeichen).`);
}

// Leere Eingabe wird zu null, damit optionale Felder in der Datenbank leer bleiben.
export function optionalerText(feld: string, max: number) {
  return z
    .string()
    .trim()
    .max(max, `${feld} ist zu lang (höchstens ${max} Zeichen).`)
    .transform((wert) => (wert === "" ? null : wert));
}

// Menge als Text aus dem Formular: Komma oder Punkt, höchstens drei Nachkommastellen.
export const mengeSchema = z
  .string()
  .trim()
  .regex(/^\d{1,9}([.,]\d{1,3})?$/, "Bitte eine Zahl ≥ 0 mit höchstens drei Nachkommastellen eingeben.")
  .transform((wert) => Number(wert.replace(",", ".")));

export const materialSchema = z
  .object({
    name: pflichttext("Artikelname", 200),
    kategorie_id: z.uuid("Bitte eine Kategorie wählen."),
    hersteller: pflichttext("Hersteller", 100),
    modell: pflichttext("Modell", 100),
    sku: optionalerText("Artikelnummer", 64),
    einheit: z.enum(EINHEIT_SCHLUESSEL, "Bitte eine Einheit wählen."),
    mindestbestand: mengeSchema,
    beschreibung: optionalerText("Beschreibung", 2000),
  })
  .refine(
    (m) => !istGanzzahligeEinheit(m.einheit) || Number.isInteger(m.mindestbestand),
    {
      path: ["mindestbestand"],
      message: "Bei Stück, Rolle und Packung sind nur ganze Zahlen möglich.",
    },
  );

export type MaterialEingabe = z.infer<typeof materialSchema>;

export const kategorieSchema = z.object({
  name: pflichttext("Kategoriename", 60),
});

// Erste Fehlermeldung pro Feld, für die Anzeige im Formular.
export function feldfehler(fehler: z.ZodError): Record<string, string> {
  const ergebnis: Record<string, string> = {};
  for (const problem of fehler.issues) {
    const feld = String(problem.path[0] ?? "_");
    ergebnis[feld] ??= problem.message;
  }
  return ergebnis;
}
