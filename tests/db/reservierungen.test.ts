import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { anonymerClient, angemeldeterClient, dbKonfiguriert } from "./hilfen";

type Client = SupabaseClient<Database>;

// Materialien und Projekte mit Buchungen bleiben archiviert bzw. abgeschlossen
// mit dem Präfix TEST- im Entwicklungsprojekt.
const lauf = `TEST-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

describe.skipIf(!dbKonfiguriert)("Reservierungen", () => {
  let admin: Client;
  let mitarbeiter: Client;
  let kategorieId: string;

  async function neuesProjekt(name: string) {
    const { data, error } = await admin.from("projekte").insert({ name: `${lauf} ${name}` }).select("id").single();
    if (error) throw error;
    return data.id;
  }

  async function materialMitBestand(name: string, menge: number) {
    const { data, error } = await admin
      .from("materialien")
      .insert({ name: `${lauf} ${name}`, kategorie_id: kategorieId, hersteller: "Testwerk", modell: "T-1", einheit: "stueck" })
      .select("id")
      .single();
    if (error) throw error;
    if (menge > 0) {
      const eingang = await admin.rpc("buche_eingang", { p_material_id: data.id, p_menge: menge });
      if (eingang.error) throw eingang.error;
    }
    return data.id;
  }

  function reserviere(client: Client, materialId: string, projektId: string, menge: number) {
    return client.rpc("setze_reservierung", { p_material_id: materialId, p_projekt_id: projektId, p_menge: menge });
  }

  async function stand(materialId: string) {
    const { data, error } = await admin
      .from("material_bestand")
      .select("bestand, reserviert, frei")
      .eq("material_id", materialId)
      .single();
    if (error) throw error;
    return data;
  }

  async function reserviert(materialId: string, projektId: string) {
    const { data } = await admin
      .from("reservierungen")
      .select("menge")
      .eq("material_id", materialId)
      .eq("projekt_id", projektId)
      .maybeSingle();
    return data?.menge ?? 0;
  }

  beforeAll(async () => {
    admin = (await angemeldeterClient("admin")).client;
    mitarbeiter = (await angemeldeterClient("mitarbeiter")).client;

    const k = await admin.from("kategorien").select("id").order("name").limit(1).single();
    if (k.error) throw k.error;
    kategorieId = k.data.id;
  });

  afterAll(async () => {
    if (!admin) return;
    // Offene Reservierungen sperren Abschließen und Archivieren, also zuerst aufheben.
    const { data: materialien } = await admin.from("materialien").select("id").like("name", `${lauf}%`);
    const ids = (materialien ?? []).map((m) => m.id);
    const { data: offen } = await admin.from("reservierungen").select("material_id, projekt_id").in("material_id", ids);
    for (const r of offen ?? []) await reserviere(admin, r.material_id, r.projekt_id, 0);

    await admin.from("materialien").update({ status: "archiviert" }).like("name", `${lauf}%`);
    await admin.from("projekte").update({ status: "abgeschlossen" }).like("name", `${lauf}%`);
    for (const id of ids) await admin.from("materialien").delete().eq("id", id);
    const { data: projekte } = await admin.from("projekte").select("id").like("name", `${lauf}%`);
    for (const { id } of projekte ?? []) await admin.from("projekte").delete().eq("id", id);
  });

  it("senkt die freie Menge, nicht den Bestand, und ist für beide Rollen erlaubt", async () => {
    const materialId = await materialMitBestand("Frei", 10);
    const p1 = await neuesProjekt("Frei 1");
    const p2 = await neuesProjekt("Frei 2");

    expect((await reserviere(mitarbeiter, materialId, p1, 4)).error).toBeNull();
    expect((await reserviere(admin, materialId, p2, 3)).error).toBeNull();
    expect(await stand(materialId)).toEqual({ bestand: 10, reserviert: 7, frei: 3 });
  });

  it("ändert und hebt Reservierungen auf", async () => {
    const materialId = await materialMitBestand("Ändern", 10);
    const projektId = await neuesProjekt("Ändern");

    await reserviere(mitarbeiter, materialId, projektId, 4);
    expect((await reserviere(mitarbeiter, materialId, projektId, 6)).error).toBeNull();
    expect(await reserviert(materialId, projektId)).toBe(6);
    expect((await reserviere(mitarbeiter, materialId, projektId, 2)).error).toBeNull();
    expect(await reserviert(materialId, projektId)).toBe(2);
    expect((await reserviere(mitarbeiter, materialId, projektId, 0)).error).toBeNull();
    expect(await reserviert(materialId, projektId)).toBe(0);
    expect(await stand(materialId)).toEqual({ bestand: 10, reserviert: 0, frei: 10 });
  });

  it("verhindert Überreservierungen und ungültige Mengen", async () => {
    const materialId = await materialMitBestand("Über", 5);
    const p1 = await neuesProjekt("Über 1");
    const p2 = await neuesProjekt("Über 2");

    await reserviere(admin, materialId, p1, 3);
    expect((await reserviere(mitarbeiter, materialId, p2, 3)).error?.code).toBe("P0001");
    // Die eigene Reservierung zählt beim Erhöhen nicht doppelt.
    expect((await reserviere(mitarbeiter, materialId, p1, 5)).error).toBeNull();
    expect((await reserviere(mitarbeiter, materialId, p1, 6)).error?.code).toBe("P0001");

    expect((await reserviere(mitarbeiter, materialId, p2, -1)).error?.code).toBe("23514");
    expect((await reserviere(mitarbeiter, materialId, p2, 1.5)).error?.code).toBe("23514");
    expect(await stand(materialId)).toEqual({ bestand: 5, reserviert: 5, frei: 0 });
  });

  it("lässt bei 10 gleichzeitigen Reservierungen nur so viele zu, wie frei ist", async () => {
    const materialId = await materialMitBestand("Parallel", 5);
    const projekte = await Promise.all(Array.from({ length: 10 }, (_, i) => neuesProjekt(`Parallel ${i}`)));

    const ergebnisse = await Promise.all(
      projekte.map((projektId, i) => reserviere(i % 2 ? admin : mitarbeiter, materialId, projektId, 1)),
    );

    expect(ergebnisse.filter((e) => e.error === null)).toHaveLength(5);
    expect(ergebnisse.filter((e) => e.error?.code === "P0001")).toHaveLength(5);
    expect(await stand(materialId)).toEqual({ bestand: 5, reserviert: 5, frei: 0 });
  });

  it("erlaubt Entnahmen ohne Projekt nur aus der freien Menge", async () => {
    const materialId = await materialMitBestand("Ohne Projekt", 10);
    const projektId = await neuesProjekt("Ohne Projekt");
    await reserviere(admin, materialId, projektId, 7);

    expect((await mitarbeiter.rpc("buche_entnahme", { p_material_id: materialId, p_menge: 4 })).error?.code).toBe("P0001");
    expect((await mitarbeiter.rpc("buche_entnahme", { p_material_id: materialId, p_menge: 3 })).error).toBeNull();
    expect(await stand(materialId)).toEqual({ bestand: 7, reserviert: 7, frei: 0 });
  });

  it("verbraucht bei Entnahme mit Projekt zuerst dessen Reservierung", async () => {
    const materialId = await materialMitBestand("Mit Projekt", 10);
    const eigenes = await neuesProjekt("Eigenes");
    const fremdes = await neuesProjekt("Fremdes");
    await reserviere(admin, materialId, eigenes, 4);
    await reserviere(admin, materialId, fremdes, 3);

    const teil = await mitarbeiter.rpc("buche_entnahme", { p_material_id: materialId, p_menge: 3, p_projekt_id: eigenes });
    expect(teil.error).toBeNull();
    expect(await reserviert(materialId, eigenes)).toBe(1);

    // Mehr als reserviert: der Rest kommt aus der freien Menge, die Reservierung entfällt.
    const rest = await mitarbeiter.rpc("buche_entnahme", { p_material_id: materialId, p_menge: 4, p_projekt_id: eigenes });
    expect(rest.error).toBeNull();
    expect(await reserviert(materialId, eigenes)).toBe(0);
    expect(await stand(materialId)).toEqual({ bestand: 3, reserviert: 3, frei: 0 });

    // Die Reservierung des anderen Projekts bleibt geschützt.
    const zuViel = await mitarbeiter.rpc("buche_entnahme", { p_material_id: materialId, p_menge: 1, p_projekt_id: eigenes });
    expect(zuViel.error?.code).toBe("P0001");
    expect(await reserviert(materialId, fremdes)).toBe(3);
  });

  it("erlaubt Admins eine Korrektur unter die reservierte Menge, danach nur noch Senken", async () => {
    const materialId = await materialMitBestand("Überreserviert", 10);
    const projektId = await neuesProjekt("Überreserviert");
    await reserviere(admin, materialId, projektId, 8);

    const k = await admin.rpc("buche_korrektur", { p_material_id: materialId, p_gezaehlter_bestand: 5, p_kommentar: "Inventur" });
    expect(k.error).toBeNull();
    expect(await stand(materialId)).toEqual({ bestand: 5, reserviert: 8, frei: -3 });

    expect((await reserviere(mitarbeiter, materialId, projektId, 9)).error?.code).toBe("P0001");
    expect((await reserviere(mitarbeiter, materialId, projektId, 6)).error).toBeNull();
    expect(await stand(materialId)).toEqual({ bestand: 5, reserviert: 6, frei: -1 });
  });

  it("sperrt Abschließen und Archivieren, solange Reservierungen offen sind", async () => {
    const materialId = await materialMitBestand("Sperre", 5);
    const projektId = await neuesProjekt("Sperre");
    await reserviere(mitarbeiter, materialId, projektId, 2);

    const abschluss = await admin.from("projekte").update({ status: "abgeschlossen" }).eq("id", projektId);
    expect(abschluss.error?.code).toBe("P0001");
    const archiv = await admin.from("materialien").update({ status: "archiviert" }).eq("id", materialId);
    expect(archiv.error?.code).toBe("P0001");

    await reserviere(mitarbeiter, materialId, projektId, 0);
    expect((await admin.from("projekte").update({ status: "abgeschlossen" }).eq("id", projektId)).error).toBeNull();
    expect((await admin.from("materialien").update({ status: "archiviert" }).eq("id", materialId)).error).toBeNull();
  });

  it("verweigert Reservierungen auf archiviertes Material und abgeschlossene Projekte", async () => {
    const archiviert = await materialMitBestand("Archiviert", 5);
    await admin.from("materialien").update({ status: "archiviert" }).eq("id", archiviert);
    const aktiv = await materialMitBestand("Aktiv", 5);
    const offen = await neuesProjekt("Offen");
    const abgeschlossen = await neuesProjekt("Abgeschlossen");
    await admin.from("projekte").update({ status: "abgeschlossen" }).eq("id", abgeschlossen);

    expect((await reserviere(mitarbeiter, archiviert, offen, 1)).error?.code).toBe("P0001");
    expect((await reserviere(mitarbeiter, aktiv, abgeschlossen, 1)).error?.code).toBe("P0001");
    const unbekannt = "00000000-0000-0000-0000-000000000000";
    expect((await reserviere(mitarbeiter, aktiv, unbekannt, 1)).error?.code).toBe("P0002");
    expect((await reserviere(mitarbeiter, unbekannt, offen, 1)).error?.code).toBe("P0002");
  });

  it("verweigert direkte Schreibzugriffe und nicht angemeldete Benutzer", async () => {
    const materialId = await materialMitBestand("Direkt", 5);
    const projektId = await neuesProjekt("Direkt");
    await reserviere(admin, materialId, projektId, 2);
    const { data: zeile } = await admin.from("reservierungen").select("id, geaendert_von").eq("material_id", materialId).single();

    for (const client of [admin, mitarbeiter]) {
      const insert = await client
        .from("reservierungen")
        .insert({ material_id: materialId, projekt_id: projektId, menge: 1, geaendert_von: zeile!.geaendert_von });
      expect(insert.error?.code).toBe("42501");
      expect((await client.from("reservierungen").update({ menge: 1 }).eq("id", zeile!.id)).error?.code).toBe("42501");
      expect((await client.from("reservierungen").delete().eq("id", zeile!.id)).error?.code).toBe("42501");
    }

    const anon = anonymerClient();
    expect((await anon.from("reservierungen").select("id")).error?.code).toBe("42501");
    expect((await reserviere(anon, materialId, projektId, 1)).error?.code).toBe("42501");
    expect(await reserviert(materialId, projektId)).toBe(2);
  });
});
