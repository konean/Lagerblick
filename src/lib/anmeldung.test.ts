import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthApiError } from "@supabase/supabase-js";
import { anmeldeFehlermeldung } from "./anmeldung";

describe("anmeldeFehlermeldung", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("meldet falsche Zugangsdaten ohne Log", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const fehler = new AuthApiError("Invalid login credentials", 400, "invalid_credentials");
    expect(anmeldeFehlermeldung(fehler)).toBe("E-Mail oder Passwort ist falsch.");
    expect(log).not.toHaveBeenCalled();
  });

  it("meldet das Rate-Limit ohne Log", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const fehler = new AuthApiError("Too many requests", 429, "over_request_rate_limit");
    expect(anmeldeFehlermeldung(fehler)).toMatch(/Zu viele Versuche/);
    expect(log).not.toHaveBeenCalled();
  });

  it("loggt unbekannte Fehler mit Code und Status, aber ohne message", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const fehler = new AuthApiError("Fehler bei test@example.com", 500, "unexpected_failure");

    expect(anmeldeFehlermeldung(fehler)).toBe(
      "Anmeldung fehlgeschlagen. Bitte später erneut versuchen.",
    );
    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith("[anmelden] Anmeldung fehlgeschlagen", {
      code: "unexpected_failure",
      status: 500,
      name: "AuthApiError",
    });
    expect(JSON.stringify(log.mock.calls)).not.toContain("test@example.com");
  });
});
