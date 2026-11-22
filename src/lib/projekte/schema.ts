import { z } from "zod";
import { optionalerText, pflichttext } from "@/lib/materialien/schema";

// Anzeigenamen der Projektstatus. Die Schlüssel entsprechen dem Enum public.projekt_status.
export const PROJEKT_STATUS = {
  aktiv: "Aktiv",
  abgeschlossen: "Abgeschlossen",
} as const;

export type ProjektStatus = keyof typeof PROJEKT_STATUS;

// Dieselben Grenzen prüft die Tabelle public.projekte.
export const projektSchema = z.object({
  name: pflichttext("Projektname", 200),
  nummer: optionalerText("Projektnummer", 64),
  hinweis: optionalerText("Hinweis", 2000),
});

export type ProjektEingabe = z.infer<typeof projektSchema>;
