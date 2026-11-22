import { describe, expect, it } from "vitest";
import { historieUrl, leseHistorieFilter, tagesbeginnBerlin, zeitraumGrenzen } from "./filter";

const materialId = "3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f";

describe("leseHistorieFilter", () => {
  it("übernimmt gültige Werte", () => {
    expect(
      leseHistorieFilter({ material: materialId, art: "entnahme", von: "2026-11-01", bis: "2026-11-22", seite: "3" }),
    ).toEqual({ filter: { material: materialId, art: "entnahme", von: "2026-11-01", bis: "2026-11-22", seite: 3 } });
  });

  it("ignoriert ungültige und leere Werte", () => {
    expect(
      leseHistorieFilter({ material: "abc", art: "diebstahl", von: "2026-13-01", bis: "", seite: "-2" }),
    ).toEqual({ filter: { seite: 1 } });
    expect(leseHistorieFilter({ seite: ["2", "5"] }).filter.seite).toBe(2);
  });

  it("verwirft einen umgekehrten Zeitraum mit Hinweis", () => {
    const ergebnis = leseHistorieFilter({ von: "2026-11-22", bis: "2026-11-01" });
    expect(ergebnis.filter.von).toBeUndefined();
    expect(ergebnis.filter.bis).toBeUndefined();
    expect(ergebnis.fehler).toMatch(/Zeitraum/);
  });
});

describe("Tagesgrenzen in Europe/Berlin", () => {
  it("berücksichtigt Winter- und Sommerzeit", () => {
    expect(tagesbeginnBerlin("2026-01-15").toISOString()).toBe("2026-01-14T23:00:00.000Z");
    expect(tagesbeginnBerlin("2026-07-15").toISOString()).toBe("2026-07-14T22:00:00.000Z");
    // Tag der Zeitumstellung: Mitternacht liegt noch in der Winterzeit.
    expect(tagesbeginnBerlin("2026-03-29").toISOString()).toBe("2026-03-28T23:00:00.000Z");
  });

  it("schließt den Bis-Tag vollständig ein", () => {
    expect(zeitraumGrenzen({ von: "2026-11-01", bis: "2026-11-30" })).toEqual({
      ab: "2026-10-31T23:00:00.000Z",
      vor: "2026-11-30T23:00:00.000Z",
    });
    expect(zeitraumGrenzen({ bis: "2026-12-31" }).vor).toBe("2026-12-31T23:00:00.000Z");
    expect(zeitraumGrenzen({})).toEqual({ ab: undefined, vor: undefined });
  });
});

describe("historieUrl", () => {
  it("behält die Filter beim Blättern bei", () => {
    expect(historieUrl({ art: "storno", von: "2026-11-01", seite: 1 }, 2)).toBe("/bewegungen?art=storno&von=2026-11-01&seite=2");
    expect(historieUrl({ seite: 2 }, 1)).toBe("/bewegungen");
  });
});
