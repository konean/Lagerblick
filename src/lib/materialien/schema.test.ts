import { describe, expect, it } from "vitest";
import { kategorieSchema, materialSchema, mengeSchema } from "./schema";

const gueltig = {
  name: "  Glas-Glas-Modul 430 Wp ",
  kategorie_id: "6f1c2a1e-8b1a-4c1e-9a4e-2f1d3c4b5a69",
  hersteller: "Beispielwerk",
  modell: "BW-430",
  sku: "",
  einheit: "stueck",
  mindestbestand: "10",
  beschreibung: "",
};

describe("mengeSchema", () => {
  it("akzeptiert Komma und Punkt", () => {
    expect(mengeSchema.parse("2,5")).toBe(2.5);
    expect(mengeSchema.parse("2.5")).toBe(2.5);
    expect(mengeSchema.parse(" 12 ")).toBe(12);
  });

  it("lehnt negative Zahlen, Text und zu viele Nachkommastellen ab", () => {
    for (const wert of ["-1", "abc", "1,2345", "", "1e3"]) {
      expect(mengeSchema.safeParse(wert).success).toBe(false);
    }
  });
});

describe("materialSchema", () => {
  it("bereinigt Leerzeichen und macht leere optionale Felder zu null", () => {
    const ergebnis = materialSchema.parse(gueltig);
    expect(ergebnis.name).toBe("Glas-Glas-Modul 430 Wp");
    expect(ergebnis.sku).toBeNull();
    expect(ergebnis.beschreibung).toBeNull();
    expect(ergebnis.mindestbestand).toBe(10);
  });

  it("verlangt Name, Hersteller, Modell und eine gültige Kategorie", () => {
    const ergebnis = materialSchema.safeParse({
      ...gueltig,
      name: " ",
      hersteller: "",
      modell: "",
      kategorie_id: "",
    });
    expect(ergebnis.success).toBe(false);
    const felder = ergebnis.error!.issues.map((i) => i.path[0]);
    expect(felder).toEqual(expect.arrayContaining(["name", "hersteller", "modell", "kategorie_id"]));
  });

  it("lehnt unbekannte Einheiten ab", () => {
    expect(materialSchema.safeParse({ ...gueltig, einheit: "liter" }).success).toBe(false);
  });

  it("erlaubt Nachkommastellen nur bei Meter und kg", () => {
    expect(materialSchema.safeParse({ ...gueltig, einheit: "stueck", mindestbestand: "2,5" }).success).toBe(false);
    expect(materialSchema.safeParse({ ...gueltig, einheit: "packung", mindestbestand: "0,5" }).success).toBe(false);
    expect(materialSchema.safeParse({ ...gueltig, einheit: "meter", mindestbestand: "2,5" }).success).toBe(true);
    expect(materialSchema.safeParse({ ...gueltig, einheit: "kg", mindestbestand: "0,125" }).success).toBe(true);
  });

  it("begrenzt die Länge der Artikelnummer", () => {
    expect(materialSchema.safeParse({ ...gueltig, sku: "X".repeat(65) }).success).toBe(false);
  });
});

describe("kategorieSchema", () => {
  it("verlangt einen nicht leeren Namen", () => {
    expect(kategorieSchema.safeParse({ name: "  " }).success).toBe(false);
    expect(kategorieSchema.parse({ name: " Kabel " }).name).toBe("Kabel");
  });
});
