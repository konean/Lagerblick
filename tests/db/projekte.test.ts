import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { anonymerClient, angemeldeterClient, dbKonfiguriert } from "./hilfen";

type Client = SupabaseClient<Database>;

// Projekte und Materialien mit Buchungen lassen sich nicht löschen; sie bleiben
// abgeschlossen bzw. archiviert mit dem Präfix TEST- im Entwicklungsprojekt.
const lauf = `TEST-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

describe.skipIf(!dbKonfiguriert)("Projekte und Projektbezug", () => {
  let admin: Client;
  let mitarbeiter: Client;
  let kategorieId: string;

  async function neuesProjekt(name: string, nummer?: string) {
    const { data, error } = await admin
      .from("projekte")
      .insert({ name: `${lauf} ${name}`, nummer })
      .select("id")
      .single();
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
    const eingang = await admin.rpc("buche_eingang", { p_material_id: data.id, p_menge: menge });
    if (eingang.error) throw eingang.error;
    return data.id;
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
    await admin.from("materialien").update({ status: "archiviert" }).like("name", `${lauf}%`);
    await admin.from("projekte").update({ status: "abgeschlossen" }).like("name", `${lauf}%`);
    // Ohne Bewegungen lassen sich Projekte löschen, die übrigen bleiben abgeschlossen.
    const { data } = await admin.from("projekte").select("id").like("name", `${lauf}%`);
    for (const { id } of data ?? []) await admin.from("projekte").delete().eq("id", id);
  });

  it("verweigert nicht angemeldeten Benutzern das Lesen", async () => {
    expect((await anonymerClient().from("projekte").select("id")).error?.code).toBe("42501");
  });

  it("lässt Admins Projekte anlegen, ändern und abschließen, Mitarbeiter nur lesen", async () => {
    const id = await neuesProjekt("Dach Nord", `${lauf}-P1`);

    const gelesen = await mitarbeiter.from("projekte").select("name, status").eq("id", id).single();
    expect(gelesen.data).toEqual({ name: `${lauf} Dach Nord`, status: "aktiv" });

    expect((await mitarbeiter.from("projekte").insert({ name: `${lauf} Fremd` })).error?.code).toBe("42501");
    // RLS blendet die Zeile für Update und Delete aus: kein Fehler, aber auch keine Wirkung.
    const aendern = await mitarbeiter.from("projekte").update({ status: "abgeschlossen" }).eq("id", id).select("id");
    expect(aendern.data ?? []).toHaveLength(0);
    const loeschen = await mitarbeiter.from("projekte").delete().eq("id", id).select("id");
    expect(loeschen.data ?? []).toHaveLength(0);

    const abschluss = await admin.from("projekte").update({ status: "abgeschlossen" }).eq("id", id).select("status");
    expect(abschluss.data).toEqual([{ status: "abgeschlossen" }]);
  });

  it("verlangt eindeutige Projektnummern ohne Rücksicht auf Groß- und Kleinschreibung", async () => {
    await neuesProjekt("Nummer 1", `${lauf}-ab`);
    const doppelt = await admin.from("projekte").insert({ name: `${lauf} Nummer 2`, nummer: `${lauf}-AB` });
    expect(doppelt.error?.code).toBe("23505");
  });

  it("speichert den Projektbezug einer Entnahme und übernimmt ihn beim Storno", async () => {
    const projektId = await neuesProjekt("Entnahme");
    const materialId = await materialMitBestand("Projekt-Entnahme", 10);

    const e = await mitarbeiter.rpc("buche_entnahme", { p_material_id: materialId, p_menge: 3, p_projekt_id: projektId });
    expect(e.error).toBeNull();
    const s = await admin.rpc("buche_storno", { p_bewegung_id: e.data!, p_kommentar: "Falsches Projekt" });
    expect(s.error).toBeNull();

    const { data } = await admin
      .from("bewegungen")
      .select("art, projekt_id")
      .in("id", [e.data!, s.data!])
      .order("erstellt_am");
    expect(data).toEqual([
      { art: "entnahme", projekt_id: projektId },
      { art: "storno", projekt_id: projektId },
    ]);
  });

  it("verweigert Entnahmen auf abgeschlossene oder unbekannte Projekte", async () => {
    const projektId = await neuesProjekt("Abgeschlossen");
    await admin.from("projekte").update({ status: "abgeschlossen" }).eq("id", projektId);
    const materialId = await materialMitBestand("Projekt-Abgeschlossen", 5);

    const abgeschlossen = await mitarbeiter.rpc("buche_entnahme", { p_material_id: materialId, p_menge: 1, p_projekt_id: projektId });
    expect(abgeschlossen.error?.code).toBe("P0001");
    const unbekannt = await mitarbeiter.rpc("buche_entnahme", {
      p_material_id: materialId,
      p_menge: 1,
      p_projekt_id: "00000000-0000-0000-0000-000000000000",
    });
    expect(unbekannt.error?.code).toBe("P0002");
  });

  it("verhindert das Löschen von Projekten mit Bewegungen", async () => {
    const projektId = await neuesProjekt("Löschen");
    const materialId = await materialMitBestand("Projekt-Löschen", 2);
    await admin.rpc("buche_entnahme", { p_material_id: materialId, p_menge: 1, p_projekt_id: projektId });

    expect((await admin.from("projekte").delete().eq("id", projektId)).error?.code).toBe("23503");
  });
});
