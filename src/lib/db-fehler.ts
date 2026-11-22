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
