import { describe, expect, it } from "vitest";
import { buchungSchema, formularArtSchema, stornoSchema } from "./schema";

describe("buchungSchema für Eingang und Entnahme", () => {
  it("wandelt die Menge um und macht einen leeren Kommentar zu null", () => {
    expect(buchungSchema("eingang", "meter").parse({ menge: "2,5", kommentar: "  " })).toEqual({
      menge: 2.5,
      kommentar: null,
    });
    expect(buchungSchema("entnahme", "stueck").parse({ menge: "12", kommentar: " Baustelle " })).toEqual({
      menge: 12,
      kommentar: "Baustelle",
    });
  });

  it("lehnt 0, negative Mengen und Text ab", () => {
    for (const art of ["eingang", "entnahme"] as const) {
      for (const menge of ["0", "0,000", "-1", "abc", ""]) {
        expect(buchungSchema(art, "meter").safeParse({ menge, kommentar: "" }).success).toBe(false);
      }
    }
  });

  it("erlaubt Nachkommastellen nur bei Meter und kg", () => {
    expect(buchungSchema("entnahme", "kg").safeParse({ menge: "0,5", kommentar: "" }).success).toBe(true);
    for (const einheit of ["stueck", "rolle", "packung"] as const) {
      expect(buchungSchema("entnahme", einheit).safeParse({ menge: "1,5", kommentar: "" }).success).toBe(false);
    }
  });

  it("übernimmt bei der Entnahme ein gültiges Projekt, leer bedeutet ohne Projekt", () => {
    const projekt = "6f1c2a1e-8b1a-4c1e-9a4e-2f1d3c4b5a69";
    const schema = buchungSchema("entnahme", "stueck");
    expect(schema.parse({ menge: "1", kommentar: "", projekt_id: projekt })).toMatchObject({ projekt_id: projekt });
    expect(schema.parse({ menge: "1", kommentar: "", projekt_id: "" })).toEqual({ menge: 1, kommentar: null });
    expect(schema.safeParse({ menge: "1", kommentar: "", projekt_id: "kein-projekt" }).success).toBe(false);
  });

  it("begrenzt den Kommentar auf 500 Zeichen", () => {
    expect(buchungSchema("eingang", "stueck").safeParse({ menge: "1", kommentar: "x".repeat(501) }).success).toBe(false);
  });
});

describe("buchungSchema für die Korrektur", () => {
  it("erlaubt den gezählten Bestand 0 und verlangt einen Grund", () => {
    expect(buchungSchema("korrektur", "stueck").parse({ menge: "0", kommentar: " Inventur " })).toEqual({
      menge: 0,
      kommentar: "Inventur",
    });
    expect(buchungSchema("korrektur", "stueck").safeParse({ menge: "3", kommentar: "  " }).success).toBe(false);
  });

  it("lehnt negative und bei Stückgut gebrochene Bestände ab", () => {
    expect(buchungSchema("korrektur", "stueck").safeParse({ menge: "-1", kommentar: "x" }).success).toBe(false);
    expect(buchungSchema("korrektur", "stueck").safeParse({ menge: "1,5", kommentar: "x" }).success).toBe(false);
    expect(buchungSchema("korrektur", "meter").safeParse({ menge: "1,5", kommentar: "x" }).success).toBe(true);
  });
});

describe("formularArtSchema und stornoSchema", () => {
  it("lässt nur Eingang, Entnahme und Korrektur zu", () => {
    expect(formularArtSchema.safeParse("entnahme").success).toBe(true);
    expect(formularArtSchema.safeParse("storno").success).toBe(false);
  });

  it("verlangt beim Storno einen Grund", () => {
    expect(stornoSchema.safeParse({ kommentar: " " }).success).toBe(false);
    expect(stornoSchema.parse({ kommentar: " Falsch erfasst " })).toEqual({ kommentar: "Falsch erfasst" });
  });
});
