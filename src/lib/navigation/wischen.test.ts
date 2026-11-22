import { describe, expect, it } from "vitest";
import { bewerteGeste, richtungFestlegen, startErlaubt, verschiebung, zielBereich } from "./wischen";

describe("zielBereich", () => {
  it("folgt der Reihenfolge der Navigation", () => {
    expect(zielBereich("/", "vor")).toBe("/materialien");
    expect(zielBereich("/materialien", "vor")).toBe("/bewegungen");
    expect(zielBereich("/bewegungen", "zurueck")).toBe("/materialien");
    expect(zielBereich("/reservierungen", "vor")).toBe("/projekte");
  });

  it("lässt Seiten außerhalb der Hauptbereiche aus, etwa die Hilfe", () => {
    expect(zielBereich("/hilfe", "vor")).toBeNull();
    expect(zielBereich("/hilfe", "zurueck")).toBeNull();
  });

  it("ist endlos", () => {
    expect(zielBereich("/projekte", "vor")).toBe("/");
    expect(zielBereich("/", "zurueck")).toBe("/projekte");
  });

  it("gilt nicht auf Unterseiten und unbekannten Pfaden", () => {
    expect(zielBereich("/materialien/3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f", "vor")).toBeNull();
    expect(zielBereich("/materialien/neu", "zurueck")).toBeNull();
    expect(zielBereich("/projekte/", "vor")).toBeNull();
    expect(zielBereich("/anmelden", "vor")).toBeNull();
  });
});

describe("startErlaubt", () => {
  it("sperrt die äußersten 20 px", () => {
    expect(startErlaubt(10, 390)).toBe(false);
    expect(startErlaubt(380, 390)).toBe(false);
    expect(startErlaubt(20, 390)).toBe(true);
    expect(startErlaubt(195, 390)).toBe(true);
    expect(startErlaubt(370, 390)).toBe(true);
  });
});

describe("richtungFestlegen", () => {
  it("wartet, bis der Finger weit genug unterwegs ist", () => {
    expect(richtungFestlegen(5, 3)).toBeNull();
  });

  it("erkennt waagerechte und senkrechte Gesten", () => {
    expect(richtungFestlegen(-12, 2)).toBe("waagerecht");
    expect(richtungFestlegen(3, 14)).toBe("senkrecht");
  });

  it("wertet schräge Gesten als Scrollen", () => {
    expect(richtungFestlegen(12, 8)).toBe("senkrecht");
  });
});

describe("bewerteGeste", () => {
  it("schaltet ab 60 px um, nach links vor und nach rechts zurück", () => {
    expect(bewerteGeste({ dx: -60, dy: 5, dauer: 400 })).toBe("vor");
    expect(bewerteGeste({ dx: 80, dy: -10, dauer: 600 })).toBe("zurueck");
  });

  it("federt bei zu kurzem, langsamem Weg zurück", () => {
    expect(bewerteGeste({ dx: -59, dy: 0, dauer: 400 })).toBeNull();
    expect(bewerteGeste({ dx: -40, dy: 0, dauer: 200 })).toBeNull();
  });

  it("schaltet bei schnellem Schnippen schon ab 30 px um", () => {
    expect(bewerteGeste({ dx: -35, dy: 3, dauer: 60 })).toBe("vor");
    expect(bewerteGeste({ dx: 30, dy: 0, dauer: 50 })).toBe("zurueck");
    expect(bewerteGeste({ dx: -25, dy: 0, dauer: 20 })).toBeNull();
  });

  it("schaltet bei zu steiler Geste nicht um", () => {
    expect(bewerteGeste({ dx: -100, dy: 60, dauer: 300 })).toBeNull();
  });

  it("verträgt eine Dauer von 0", () => {
    expect(bewerteGeste({ dx: -40, dy: 0, dauer: 0 })).toBe("vor");
  });
});

describe("verschiebung", () => {
  it("dämpft und begrenzt die Bewegung", () => {
    expect(verschiebung(40)).toBe(10);
    expect(verschiebung(-80)).toBe(-20);
    expect(verschiebung(400)).toBe(40);
    expect(verschiebung(-400)).toBe(-40);
  });
});
