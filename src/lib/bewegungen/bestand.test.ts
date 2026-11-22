import { describe, expect, it } from "vitest";
import { knappeMaterialien, type Bestand } from "./bestand";

function material(id: string, mindestbestand: number, name = id) {
  return { id, name, mindestbestand };
}

function stand(bestand: number, reserviert = 0): Bestand {
  return { bestand, reserviert, frei: bestand - reserviert };
}

describe("knappeMaterialien", () => {
  it("lässt Materialien ohne Mindestbestand und auf oder über dem Mindestbestand weg", () => {
    const ergebnis = knappeMaterialien(
      [material("ohne", 0), material("genau", 10), material("darueber", 10)],
      new Map([
        ["ohne", stand(0)],
        ["genau", stand(10)],
        ["darueber", stand(15)],
      ]),
    );
    expect(ergebnis).toEqual([]);
  });

  it("erkennt Materialien unter Mindestbestand, auch ohne Bestandszeile", () => {
    const ergebnis = knappeMaterialien(
      [material("knapp", 10), material("leer", 5)],
      new Map([["knapp", stand(9)]]),
    );
    expect(ergebnis.map((e) => [e.material.id, e.knapp, e.ueber])).toEqual([
      ["leer", true, false],
      ["knapp", true, false],
    ]);
    expect(ergebnis[0].stand).toEqual({ bestand: 0, reserviert: 0, frei: 0 });
  });

  it("nimmt überreservierte Materialien auf und stellt sie an den Anfang", () => {
    const ergebnis = knappeMaterialien(
      [material("knapp", 10), material("ueber", 0), material("beides", 10)],
      new Map([
        ["knapp", stand(1)],
        ["ueber", stand(4, 6)],
        ["beides", stand(8, 9)],
      ]),
    );
    expect(ergebnis.map((e) => [e.material.id, e.knapp, e.ueber])).toEqual([
      ["beides", true, true],
      ["ueber", false, true],
      ["knapp", true, false],
    ]);
  });

  it("sortiert bei gleichem Füllgrad nach Name", () => {
    const ergebnis = knappeMaterialien(
      [material("b", 10, "Zähler"), material("a", 20, "Ösenkabel")],
      new Map([
        ["a", stand(10)],
        ["b", stand(5)],
      ]),
    );
    expect(ergebnis.map((e) => e.material.name)).toEqual(["Ösenkabel", "Zähler"]);
  });
});
