import { describe, expect, it } from "vitest";
import { projektSchema } from "./schema";

describe("projektSchema", () => {
  it("trimmt Eingaben und macht leere optionale Felder zu null", () => {
    expect(projektSchema.parse({ name: "  Dach Nord ", nummer: " ", hinweis: "" })).toEqual({
      name: "Dach Nord",
      nummer: null,
      hinweis: null,
    });
  });

  it("verlangt einen Projektnamen", () => {
    const ergebnis = projektSchema.safeParse({ name: "   ", nummer: "P-1", hinweis: "" });
    expect(ergebnis.success).toBe(false);
    expect(ergebnis.error?.issues[0].path).toEqual(["name"]);
  });

  it("begrenzt die Länge der Projektnummer", () => {
    expect(projektSchema.safeParse({ name: "Dach", nummer: "x".repeat(65), hinweis: "" }).success).toBe(false);
  });
});
