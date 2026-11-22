import { notFound } from "next/navigation";
import { suchbegriff } from "@/lib/materialien/daten";
import { createClient } from "@/lib/supabase/server";
import type { ProjektStatus } from "./schema";

export type ProjektFilter = {
  q?: string;
  status?: ProjektStatus | "alle";
};

export async function ladeProjekte(filter: ProjektFilter = {}) {
  const supabase = await createClient();
  let abfrage = supabase.from("projekte").select("id, name, nummer, status").order("name");

  const status = filter.status ?? "aktiv";
  if (status !== "alle") abfrage = abfrage.eq("status", status);

  const q = suchbegriff(filter.q ?? "");
  if (q) abfrage = abfrage.or(`name.ilike.*${q}*,nummer.ilike.*${q}*`);

  const { data, error } = await abfrage;
  if (error) throw error;
  return data;
}

export async function ladeProjekt(id: string) {
  // Ungültige IDs führen direkt zu „nicht gefunden“ statt zu einem Datenbankfehler.
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const { data, error } = await supabase.from("projekte").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) notFound();
  return data;
}
