import { describe, expect, it } from "vitest";
import { eingangSchema } from "./schema";

describe("eingangSchema", () => {
  it("wandelt die Menge um und macht einen leeren Kommentar zu null", () => {
    expect(eingangSchema("meter").parse({ menge: "2,5", kommentar: "  " })).toEqual({
      menge: 2.5,
      kommentar: null,
    });
    expect(eingangSchema("stueck").parse({ menge: "12", kommentar: " Lieferung " })).toEqual({
      menge: 12,
      kommentar: "Lieferung",
    });
  });

  it("lehnt 0, negative Mengen und Text ab", () => {
    for (const menge of ["0", "0,000", "-1", "abc", ""]) {
      expect(eingangSchema("meter").safeParse({ menge, kommentar: "" }).success).toBe(false);
    }
  });

  it("erlaubt Nachkommastellen nur bei Meter und kg", () => {
    expect(eingangSchema("kg").safeParse({ menge: "0,5", kommentar: "" }).success).toBe(true);
    for (const einheit of ["stueck", "rolle", "packung"] as const) {
      expect(eingangSchema(einheit).safeParse({ menge: "1,5", kommentar: "" }).success).toBe(false);
    }
  });

  it("begrenzt den Kommentar auf 500 Zeichen", () => {
    expect(eingangSchema("stueck").safeParse({ menge: "1", kommentar: "x".repeat(501) }).success).toBe(false);
  });
});
