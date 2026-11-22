import type { AuthError } from "@supabase/supabase-js";

// Übersetzt Fehler der Anmeldung in verständliche Meldungen.
// Unbekannte Fehler landen zusätzlich in den Server-Logs (Vercel), aber nur mit
// Code, HTTP-Status und Fehlerart. Die message bleibt draußen, weil sie Eingaben enthalten könnte.
export function anmeldeFehlermeldung(fehler: Pick<AuthError, "code" | "status" | "name">): string {
  switch (fehler.code) {
    case "invalid_credentials":
      return "E-Mail oder Passwort ist falsch.";
    case "over_request_rate_limit":
      return "Zu viele Versuche. Bitte kurz warten und erneut versuchen.";
    default:
      console.error("[anmelden] Anmeldung fehlgeschlagen", {
        code: fehler.code,
        status: fehler.status,
        name: fehler.name,
      });
      return "Anmeldung fehlgeschlagen. Bitte später erneut versuchen.";
  }
}
