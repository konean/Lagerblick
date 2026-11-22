import type { PostgrestError } from "@supabase/supabase-js";

// Übersetzt typische Datenbankfehler in verständliche Meldungen.
// Spezielle Fälle (z. B. doppelte SKU) behandeln die Aufrufer vorher selbst.
export function dbFehlermeldung(fehler: PostgrestError): string {
  switch (fehler.code) {
    case "42501":
      return "Dafür fehlt die Berechtigung.";
    case "23505":
      return "Ein Eintrag mit diesem Wert existiert bereits.";
    case "23503":
      return "Der Eintrag wird noch verwendet oder verweist auf etwas, das es nicht gibt.";
    case "23514":
    case "22P02":
      return "Die Eingabe ist ungültig.";
    default:
      return "Speichern fehlgeschlagen. Bitte erneut versuchen.";
  }
}

// Eigene Meldungen der Buchungs- und Reservierungsfunktionen (Bestand reicht nicht,
// archiviert, ungültige Menge, fehlende Berechtigung) sind verständlich und werden direkt angezeigt.
export function funktionsfehler(fehler: PostgrestError, nichtGefunden: string): string {
  if (["P0001", "23514", "42501"].includes(fehler.code)) return fehler.message;
  if (fehler.code === "P0002") return nichtGefunden;
  return dbFehlermeldung(fehler);
}
