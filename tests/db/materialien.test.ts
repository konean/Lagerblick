import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { anonymerClient, angemeldeterClient, dbKonfiguriert } from "./hilfen";

type Client = SupabaseClient<Database>;

// Eindeutiges Kürzel pro Testlauf, damit parallele Läufe sich nicht stören.
const lauf = `TEST-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

describe.skipIf(!dbKonfiguriert)("Materialien und Kategorien (RLS und Constraints)", () => {
  let admin: Client;
  let mitarbeiter: Client;
  let kategorieId: string;
  let materialId: string;

  function material(ueberschreiben: Partial<Database["public"]["Tables"]["materialien"]["Insert"]> = {}) {
    return {
      name: `${lauf} Modul`,
      kategorie_id: kategorieId,
      hersteller: "Testwerk",
      modell: "T-1",
      einheit: "stueck" as const,
      mindestbestand: 5,
      ...ueberschreiben,
    };
  }

  beforeAll(async () => {
    admin = (await angemeldeterClient("admin")).client;
    mitarbeiter = (await angemeldeterClient("mitarbeiter")).client;

    const k = await admin.from("kategorien").insert({ name: `${lauf} Kategorie` }).select("id").single();
    if (k.error) throw k.error;
    kategorieId = k.data.id;

    const m = await admin.from("materialien").insert(material({ sku: `${lauf}-SKU` })).select("id").single();
    if (m.error) throw m.error;
    materialId = m.data.id;
  });

  // Testdaten wieder entfernen (Admins dürfen Materialien ohne Buchungen löschen).
  afterAll(async () => {
    if (!admin) return;
    await admin.from("materialien").delete().like("name", `${lauf}%`);
    await admin.from("kategorien").delete().like("name", `${lauf}%`);
  });

  it("verweigert nicht angemeldeten Benutzern das Lesen", async () => {
    const anon = anonymerClient();
    expect((await anon.from("materialien").select("id")).error?.code).toBe("42501");
    expect((await anon.from("kategorien").select("id")).error?.code).toBe("42501");
  });

  it("erlaubt Mitarbeitern das Lesen", async () => {
    const { data, error } = await mitarbeiter
      .from("materialien")
      .select("id, kategorie:kategorien(name)")
      .eq("id", materialId)
      .single();
    expect(error).toBeNull();
    expect(data?.kategorie?.name).toBe(`${lauf} Kategorie`);
  });

  it("verweigert Mitarbeitern das Anlegen von Material und Kategorien", async () => {
    const m = await mitarbeiter.from("materialien").insert(material({ name: `${lauf} Fremd` }));
    expect(m.error?.code).toBe("42501");

    const k = await mitarbeiter.from("kategorien").insert({ name: `${lauf} Fremd` });
    expect(k.error?.code).toBe("42501");
  });

  it("verhindert, dass Mitarbeiter Material ändern oder löschen", async () => {
    // RLS blendet die Zeile für Update und Delete aus: kein Fehler, aber auch keine Wirkung.
    const aendern = await mitarbeiter
      .from("materialien")
      .update({ mindestbestand: 999 })
      .eq("id", materialId)
      .select("id");
    expect(aendern.data ?? []).toHaveLength(0);

    const loeschen = await mitarbeiter.from("materialien").delete().eq("id", materialId).select("id");
    expect(loeschen.data ?? []).toHaveLength(0);

    const { data } = await admin.from("materialien").select("mindestbestand").eq("id", materialId).single();
    expect(data?.mindestbestand).toBe(5);
  });

  it("erlaubt Admins das Ändern und setzt geaendert_am", async () => {
    const vorher = await admin.from("materialien").select("geaendert_am").eq("id", materialId).single();
    const { data, error } = await admin
      .from("materialien")
      .update({ mindestbestand: 7, status: "archiviert" })
      .eq("id", materialId)
      .select("mindestbestand, status, geaendert_am")
      .single();
    expect(error).toBeNull();
    expect(data?.mindestbestand).toBe(7);
    expect(data?.status).toBe("archiviert");
    expect(new Date(data!.geaendert_am) > new Date(vorher.data!.geaendert_am)).toBe(true);
  });

  it("lehnt ungültige Materialdaten in der Datenbank ab", async () => {
    const faelle = [
      { daten: material({ name: "" }), code: "23514" },
      { daten: material({ name: "  Leerzeichen  " }), code: "23514" },
      { daten: material({ mindestbestand: -1 }), code: "23514" },
      { daten: material({ einheit: "stueck", mindestbestand: 2.5 }), code: "23514" },
      { daten: material({ einheit: "liter" as never }), code: "22P02" },
      { daten: material({ sku: `${lauf}-sku` }), code: "23505" }, // SKU ohne Rücksicht auf Groß-/Kleinschreibung
      { daten: material({ kategorie_id: crypto.randomUUID() }), code: "23503" },
    ];
    for (const fall of faelle) {
      const { error } = await admin.from("materialien").insert(fall.daten);
      expect(error?.code, JSON.stringify(fall.daten)).toBe(fall.code);
    }
  });

  it("erlaubt Nachkommastellen beim Mindestbestand für Meter", async () => {
    const { error } = await admin
      .from("materialien")
      .insert(material({ name: `${lauf} Kabel`, einheit: "meter", mindestbestand: 2.5 }));
    expect(error).toBeNull();
  });

  it("verhindert doppelte Kategorien und das Löschen benutzter Kategorien", async () => {
    const doppelt = await admin.from("kategorien").insert({ name: `${lauf} kategorie`.toUpperCase() });
    expect(doppelt.error?.code).toBe("23505");

    const loeschen = await admin.from("kategorien").delete().eq("id", kategorieId);
    expect(loeschen.error?.code).toBe("23503");
  });

  it("schützt technische Spalten vor direktem Schreiben", async () => {
    const { error } = await admin
      .from("materialien")
      .update({ erstellt_am: "2000-01-01T00:00:00Z" } as never)
      .eq("id", materialId);
    expect(error?.code).toBe("42501");
  });
});
