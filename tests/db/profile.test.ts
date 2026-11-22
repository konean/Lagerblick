import { describe, expect, it } from "vitest";
import { anonymerClient, angemeldeterClient, dbKonfiguriert } from "./hilfen";

describe.skipIf(!dbKonfiguriert)("Profile und Rollen (RLS)", () => {
  it("verweigert nicht angemeldeten Benutzern das Lesen", async () => {
    const { data, error } = await anonymerClient().from("profiles").select("id");
    expect(error?.code).toBe("42501");
    expect(data ?? []).toHaveLength(0);
  });

  it("erlaubt angemeldeten Benutzern das Lesen aller Profile", async () => {
    const { client, userId } = await angemeldeterClient("mitarbeiter");
    const { data, error } = await client.from("profiles").select("id, rolle");
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(2);
    expect(data!.find((p) => p.id === userId)?.rolle).toBe("mitarbeiter");
  });

  it("verhindert, dass ein Mitarbeiter sich selbst zum Admin macht", async () => {
    const { client, userId } = await angemeldeterClient("mitarbeiter");
    const { error } = await client.from("profiles").update({ rolle: "admin" }).eq("id", userId);
    expect(error?.code).toBe("42501");

    const { data } = await client.from("profiles").select("rolle").eq("id", userId).single();
    expect(data?.rolle).toBe("mitarbeiter");
  });

  it("verweigert das Anlegen und Löschen von Profilen", async () => {
    const { client, userId } = await angemeldeterClient("mitarbeiter");

    const anlegen = await client
      .from("profiles")
      .insert({ id: crypto.randomUUID(), anzeigename: "Eindringling" });
    expect(anlegen.error?.code).toBe("42501");

    const loeschen = await client.from("profiles").delete().eq("id", userId);
    expect(loeschen.error?.code).toBe("42501");
  });

  it("ist_admin unterscheidet die Rollen", async () => {
    const mitarbeiter = await angemeldeterClient("mitarbeiter");
    const admin = await angemeldeterClient("admin");

    expect((await mitarbeiter.client.rpc("ist_admin")).data).toBe(false);
    expect((await admin.client.rpc("ist_admin")).data).toBe(true);
  });

  it("verweigert ist_admin für nicht angemeldete Benutzer", async () => {
    const { error } = await anonymerClient().rpc("ist_admin");
    expect(error?.code).toBe("42501");
  });
});
