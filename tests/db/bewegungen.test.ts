import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { anonymerClient, angemeldeterClient, dbKonfiguriert } from "./hilfen";

type Client = SupabaseClient<Database>;
type Einheit = Database["public"]["Enums"]["einheit"];

// Eindeutiges Kürzel pro Testlauf. Materialien mit Buchungen lassen sich nicht löschen;
// sie werden am Ende archiviert und bleiben mit dem Präfix TEST- im Entwicklungsprojekt.
const lauf = `TEST-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

describe.skipIf(!dbKonfiguriert)("Bewegungen und Wareneingang", () => {
  let admin: Client;
  let mitarbeiter: Client;
  let adminId: string;
  let mitarbeiterId: string;
  let kategorieId: string;

  async function neuesMaterial(name: string, einheit: Einheit = "stueck") {
    const { data, error } = await admin
      .from("materialien")
      .insert({ name: `${lauf} ${name}`, kategorie_id: kategorieId, hersteller: "Testwerk", modell: "T-1", einheit })
      .select("id")
      .single();
    if (error) throw error;
    return data.id;
  }

  async function bestand(materialId: string) {
    const { data, error } = await admin
      .from("material_bestand")
      .select("bestand")
      .eq("material_id", materialId)
      .single();
    if (error) throw error;
    return data.bestand;
  }

  beforeAll(async () => {
    ({ client: admin, userId: adminId } = await angemeldeterClient("admin"));
    ({ client: mitarbeiter, userId: mitarbeiterId } = await angemeldeterClient("mitarbeiter"));

    // Vorhandene Kategorie nutzen: Kategorien mit gebuchtem Material lassen sich nicht löschen.
    const k = await admin.from("kategorien").select("id").order("name").limit(1).single();
    if (k.error) throw k.error;
    kategorieId = k.data.id;
  });

  afterAll(async () => {
    if (!admin) return;
    await admin.from("materialien").update({ status: "archiviert" }).like("name", `${lauf}%`);
    // Materialien ohne Buchungen lassen sich löschen, die übrigen bleiben archiviert.
    const { data } = await admin.from("materialien").select("id").like("name", `${lauf}%`);
    for (const { id } of data ?? []) await admin.from("materialien").delete().eq("id", id);
  });

  it("zeigt für neues Material den Bestand 0", async () => {
    const id = await neuesMaterial("Leer");
    expect(await bestand(id)).toBe(0);
  });

  it("erhöht den Bestand bei Eingängen von Admin und Mitarbeiter", async () => {
    const id = await neuesMaterial("Eingang");

    const a = await admin.rpc("buche_eingang", { p_material_id: id, p_menge: 5, p_kommentar: "  Lieferung 1 " });
    expect(a.error).toBeNull();
    const m = await mitarbeiter.rpc("buche_eingang", { p_material_id: id, p_menge: 3 });
    expect(m.error).toBeNull();

    expect(await bestand(id)).toBe(8);

    const { data } = await mitarbeiter
      .from("bewegungen")
      .select("id, art, menge, kommentar, erstellt_von")
      .eq("material_id", id)
      .order("erstellt_am");
    expect(data).toEqual([
      { id: a.data, art: "eingang", menge: 5, kommentar: "Lieferung 1", erstellt_von: adminId },
      { id: m.data, art: "eingang", menge: 3, kommentar: null, erstellt_von: mitarbeiterId },
    ]);
  });

  it("erlaubt Nachkommastellen nur bei Meter und kg", async () => {
    const stueck = await neuesMaterial("Stück");
    const meter = await neuesMaterial("Meter", "meter");

    expect((await admin.rpc("buche_eingang", { p_material_id: stueck, p_menge: 1.5 })).error?.code).toBe("23514");
    expect((await admin.rpc("buche_eingang", { p_material_id: meter, p_menge: 2.5 })).error).toBeNull();
    expect((await admin.rpc("buche_eingang", { p_material_id: meter, p_menge: 1.2345 })).error?.code).toBe("23514");
    expect(await bestand(meter)).toBe(2.5);
  });

  it("weist Menge 0 und negative Mengen ab", async () => {
    const id = await neuesMaterial("Menge");
    expect((await admin.rpc("buche_eingang", { p_material_id: id, p_menge: 0 })).error?.code).toBe("23514");
    expect((await admin.rpc("buche_eingang", { p_material_id: id, p_menge: -3 })).error?.code).toBe("23514");
    expect(await bestand(id)).toBe(0);
  });

  it("verweigert Buchungen auf archiviertes und unbekanntes Material", async () => {
    const id = await neuesMaterial("Archiv");
    await admin.from("materialien").update({ status: "archiviert" }).eq("id", id);

    expect((await mitarbeiter.rpc("buche_eingang", { p_material_id: id, p_menge: 1 })).error?.code).toBe("P0001");
    const unbekannt = "00000000-0000-0000-0000-000000000000";
    expect((await admin.rpc("buche_eingang", { p_material_id: unbekannt, p_menge: 1 })).error?.code).toBe("P0002");
  });

  it("verweigert nicht angemeldeten Benutzern Lesen und Buchen", async () => {
    const id = await neuesMaterial("Anonym");
    const anon = anonymerClient();
    expect((await anon.rpc("buche_eingang", { p_material_id: id, p_menge: 1 })).error?.code).toBe("42501");
    expect((await anon.from("bewegungen").select("id")).error?.code).toBe("42501");
    expect((await anon.from("material_bestand").select("bestand")).error?.code).toBe("42501");
    expect(await bestand(id)).toBe(0);
  });

  it("verweigert direkte Schreibzugriffe auf die Bewegungen", async () => {
    const id = await neuesMaterial("Direkt");
    const { data: bewegungId } = await admin.rpc("buche_eingang", { p_material_id: id, p_menge: 4 });

    for (const client of [admin, mitarbeiter]) {
      const insert = await client
        .from("bewegungen")
        .insert({ material_id: id, art: "eingang", menge: 100, erstellt_von: adminId });
      expect(insert.error?.code).toBe("42501");

      const update = await client.from("bewegungen").update({ menge: 100 }).eq("id", bewegungId!);
      expect(update.error?.code).toBe("42501");

      const del = await client.from("bewegungen").delete().eq("id", bewegungId!);
      expect(del.error?.code).toBe("42501");
    }

    expect(await bestand(id)).toBe(4);
  });

  it("verhindert das Löschen von Material mit Buchungen", async () => {
    const id = await neuesMaterial("Löschen");
    await admin.rpc("buche_eingang", { p_material_id: id, p_menge: 1 });

    expect((await admin.from("materialien").delete().eq("id", id)).error?.code).toBe("23503");
    const { data } = await admin.from("materialien").select("id").eq("id", id);
    expect(data).toHaveLength(1);
  });

  it("sperrt die Einheit nach der ersten Buchung", async () => {
    const id = await neuesMaterial("Einheit");
    // Vor der ersten Buchung ist die Änderung erlaubt.
    expect((await admin.from("materialien").update({ einheit: "meter" }).eq("id", id)).error).toBeNull();

    await admin.rpc("buche_eingang", { p_material_id: id, p_menge: 2.5 });
    const update = await admin.from("materialien").update({ einheit: "stueck" }).eq("id", id);
    expect(update.error?.code).toBe("23514");

    // Andere Felder bleiben änderbar.
    expect((await admin.from("materialien").update({ modell: "T-2" }).eq("id", id)).error).toBeNull();
  });

  it("bleibt bei 10 gleichzeitigen Eingängen konsistent", async () => {
    const id = await neuesMaterial("Parallel");
    const ergebnisse = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        (i % 2 ? admin : mitarbeiter).rpc("buche_eingang", { p_material_id: id, p_menge: i + 1 }),
      ),
    );

    expect(ergebnisse.map((e) => e.error)).toEqual(Array(10).fill(null));
    expect(await bestand(id)).toBe(55);
    const { count } = await admin.from("bewegungen").select("id", { count: "exact", head: true }).eq("material_id", id);
    expect(count).toBe(10);
  });

  // Entnahme, Korrektur und Storno ---------------------------------------------

  async function mitBestand(name: string, menge: number, einheit: Einheit = "stueck") {
    const id = await neuesMaterial(name, einheit);
    const { error } = await admin.rpc("buche_eingang", { p_material_id: id, p_menge: menge });
    if (error) throw error;
    return id;
  }

  it("senkt den Bestand bei Entnahmen beider Rollen und speichert sie negativ", async () => {
    const id = await mitBestand("Entnahme", 10);

    const m = await mitarbeiter.rpc("buche_entnahme", { p_material_id: id, p_menge: 3, p_kommentar: " Baustelle " });
    expect(m.error).toBeNull();
    expect((await admin.rpc("buche_entnahme", { p_material_id: id, p_menge: 2 })).error).toBeNull();
    expect(await bestand(id)).toBe(5);

    const { data } = await admin
      .from("bewegungen")
      .select("art, menge, kommentar, erstellt_von")
      .eq("id", m.data!)
      .single();
    expect(data).toEqual({ art: "entnahme", menge: -3, kommentar: "Baustelle", erstellt_von: mitarbeiterId });
  });

  it("verhindert Entnahmen über den Bestand hinaus und ungültige Mengen", async () => {
    const id = await mitBestand("Überentnahme", 2);
    expect((await mitarbeiter.rpc("buche_entnahme", { p_material_id: id, p_menge: 3 })).error?.code).toBe("P0001");
    expect((await admin.rpc("buche_entnahme", { p_material_id: id, p_menge: 0 })).error?.code).toBe("23514");
    expect((await admin.rpc("buche_entnahme", { p_material_id: id, p_menge: 1.5 })).error?.code).toBe("23514");
    expect(await bestand(id)).toBe(2);
  });

  it("lässt bei 10 gleichzeitigen Entnahmen nur so viele zu, wie Bestand da ist", async () => {
    const id = await mitBestand("Parallel-Entnahme", 5);
    const ergebnisse = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        (i % 2 ? admin : mitarbeiter).rpc("buche_entnahme", { p_material_id: id, p_menge: 1 }),
      ),
    );

    expect(ergebnisse.filter((e) => e.error === null)).toHaveLength(5);
    expect(ergebnisse.filter((e) => e.error?.code === "P0001")).toHaveLength(5);
    expect(await bestand(id)).toBe(0);
  });

  it("korrigiert auf den gezählten Bestand, nur für Admins und mit Grund", async () => {
    const id = await mitBestand("Korrektur", 10, "meter");
    const korrektur = (client: Client, gezaehlt: number, kommentar: string) =>
      client.rpc("buche_korrektur", { p_material_id: id, p_gezaehlter_bestand: gezaehlt, p_kommentar: kommentar });

    expect((await korrektur(mitarbeiter, 7, "Inventur")).error?.code).toBe("42501");
    expect((await korrektur(admin, 7, "  ")).error?.code).toBe("23514");
    expect((await korrektur(admin, -1, "Inventur")).error?.code).toBe("23514");
    expect((await korrektur(admin, 10, "Inventur")).error?.code).toBe("P0001");
    expect(await bestand(id)).toBe(10);

    const k = await korrektur(admin, 7.5, "Inventur");
    expect(k.error).toBeNull();
    expect(await bestand(id)).toBe(7.5);
    const { data } = await admin.from("bewegungen").select("art, menge").eq("id", k.data!).single();
    expect(data).toEqual({ art: "korrektur", menge: -2.5 });

    expect((await korrektur(admin, 0, "Leer")).error).toBeNull();
    expect(await bestand(id)).toBe(0);
  });

  it("storniert eine Bewegung genau einmal, nur für Admins und mit Grund", async () => {
    const id = await mitBestand("Storno", 10);
    const { data: entnahmeId } = await mitarbeiter.rpc("buche_entnahme", { p_material_id: id, p_menge: 4 });
    const storno = (client: Client, bewegungId: string, kommentar: string) =>
      client.rpc("buche_storno", { p_bewegung_id: bewegungId, p_kommentar: kommentar });

    expect((await storno(mitarbeiter, entnahmeId!, "Falsch")).error?.code).toBe("42501");
    expect((await storno(admin, entnahmeId!, "")).error?.code).toBe("23514");

    const s = await storno(admin, entnahmeId!, "Falsch erfasst");
    expect(s.error).toBeNull();
    expect(await bestand(id)).toBe(10);
    const { data } = await admin
      .from("bewegungen")
      .select("art, menge, storno_von, erstellt_von")
      .eq("id", s.data!)
      .single();
    expect(data).toEqual({ art: "storno", menge: 4, storno_von: entnahmeId, erstellt_von: adminId });

    expect((await storno(admin, entnahmeId!, "Nochmal")).error?.code).toBe("P0001");
    expect((await storno(admin, s.data!, "Storno vom Storno")).error?.code).toBe("P0001");
    expect((await storno(admin, "00000000-0000-0000-0000-000000000000", "x")).error?.code).toBe("P0002");
    expect(await bestand(id)).toBe(10);
  });

  it("lässt gleichzeitige Stornos derselben Bewegung nur einmal zu", async () => {
    const id = await mitBestand("Parallel-Storno", 5);
    const { data: entnahmeId } = await admin.rpc("buche_entnahme", { p_material_id: id, p_menge: 2 });
    const ergebnisse = await Promise.all(
      Array.from({ length: 5 }, () =>
        admin.rpc("buche_storno", { p_bewegung_id: entnahmeId!, p_kommentar: "Doppelt" }),
      ),
    );

    expect(ergebnisse.filter((e) => e.error === null)).toHaveLength(1);
    expect(await bestand(id)).toBe(5);
  });

  it("verhindert ein Storno, das den Bestand negativ machen würde", async () => {
    const id = await neuesMaterial("Storno-Negativ");
    const { data: eingangId } = await admin.rpc("buche_eingang", { p_material_id: id, p_menge: 5 });
    await mitarbeiter.rpc("buche_entnahme", { p_material_id: id, p_menge: 4 });

    const s = await admin.rpc("buche_storno", { p_bewegung_id: eingangId!, p_kommentar: "Falscher Artikel" });
    expect(s.error?.code).toBe("P0001");
    expect(await bestand(id)).toBe(1);
  });

  it("verweigert Entnahme, Korrektur und Storno auf archiviertem Material", async () => {
    const id = await mitBestand("Archiv-Buchungen", 5);
    const { data: entnahmeId } = await admin.rpc("buche_entnahme", { p_material_id: id, p_menge: 1 });
    await admin.from("materialien").update({ status: "archiviert" }).eq("id", id);

    expect((await mitarbeiter.rpc("buche_entnahme", { p_material_id: id, p_menge: 1 })).error?.code).toBe("P0001");
    const k = await admin.rpc("buche_korrektur", { p_material_id: id, p_gezaehlter_bestand: 1, p_kommentar: "Inventur" });
    expect(k.error?.code).toBe("P0001");
    const s = await admin.rpc("buche_storno", { p_bewegung_id: entnahmeId!, p_kommentar: "Falsch" });
    expect(s.error?.code).toBe("P0001");
    expect(await bestand(id)).toBe(4);
  });

  it("verweigert nicht angemeldeten Benutzern Entnahme, Korrektur und Storno", async () => {
    const id = await mitBestand("Anonym-Buchungen", 3);
    const { data: eingang } = await admin.from("bewegungen").select("id").eq("material_id", id).single();
    const anon = anonymerClient();

    expect((await anon.rpc("buche_entnahme", { p_material_id: id, p_menge: 1 })).error?.code).toBe("42501");
    const k = await anon.rpc("buche_korrektur", { p_material_id: id, p_gezaehlter_bestand: 0, p_kommentar: "x" });
    expect(k.error?.code).toBe("42501");
    expect((await anon.rpc("buche_storno", { p_bewegung_id: eingang!.id, p_kommentar: "x" })).error?.code).toBe("42501");
    expect(await bestand(id)).toBe(3);
  });

  it("verweigert direkte Storno-Einträge", async () => {
    const id = await mitBestand("Direkt-Storno", 3);
    const { data: entnahmeId } = await admin.rpc("buche_entnahme", { p_material_id: id, p_menge: 1 });
    const insert = await admin
      .from("bewegungen")
      .insert({ material_id: id, art: "storno", menge: 1, erstellt_von: adminId, storno_von: entnahmeId });

    expect(insert.error?.code).toBe("42501");
    expect(await bestand(id)).toBe(2);
  });
});
