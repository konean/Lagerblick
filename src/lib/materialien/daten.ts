import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type MaterialFilter = {
  q?: string;
  kategorie?: string;
  status?: "aktiv" | "archiviert" | "alle";
};

// Zeichen, die in der PostgREST-Filtersyntax eine Bedeutung haben, aus der Suche entfernen.
export function suchbegriff(q: string) {
  return q.replace(/[,()*%\\"':]/g, " ").trim().slice(0, 100);
}

export async function ladeKategorien() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("kategorien")
    .select("id, name, materialien(count)")
    .order("name");
  if (error) throw error;
  return data.map((k) => ({ id: k.id, name: k.name, anzahl: k.materialien[0]?.count ?? 0 }));
}

export async function ladeMaterialien(filter: MaterialFilter) {
  const supabase = await createClient();
  let abfrage = supabase
    .from("materialien")
    .select("id, name, hersteller, modell, sku, einheit, mindestbestand, status, kategorie:kategorien(name)")
    .order("name");

  const status = filter.status ?? "aktiv";
  if (status !== "alle") abfrage = abfrage.eq("status", status);
  if (filter.kategorie) abfrage = abfrage.eq("kategorie_id", filter.kategorie);

  const q = suchbegriff(filter.q ?? "");
  if (q) {
    abfrage = abfrage.or(
      ["name", "hersteller", "modell", "sku"].map((spalte) => `${spalte}.ilike.*${q}*`).join(","),
    );
  }

  const { data, error } = await abfrage;
  if (error) throw error;
  return data;
}

export async function ladeMaterial(id: string) {
  // Ungültige IDs führen direkt zu „nicht gefunden“ statt zu einem Datenbankfehler.
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("materialien")
    .select("*, kategorie:kategorien(name)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) notFound();
  return data;
}
