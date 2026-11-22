import { createClient } from "@/lib/supabase/server";

export type ReservierungFilter = { material?: string; projekt?: string };

// Offene Reservierungen mit Material und Projekt, nach Material und Projekt sortiert.
// Es gibt höchstens eine Zeile pro Material und Projekt, die Liste bleibt also überschaubar.
export async function ladeReservierungen(filter: ReservierungFilter = {}) {
  const supabase = await createClient();
  let abfrage = supabase
    .from("reservierungen")
    // Als ein zusammenhängender Text, damit Supabase den Ergebnistyp ableiten kann.
    .select("material_id, projekt_id, menge, geaendert_am, material:materialien(id, name, einheit, status), projekt:projekte(id, name, nummer), bearbeiter:profiles(anzeigename)")
    .order("geaendert_am", { ascending: false });

  if (filter.material) abfrage = abfrage.eq("material_id", filter.material);
  if (filter.projekt) abfrage = abfrage.eq("projekt_id", filter.projekt);

  const { data, error } = await abfrage;
  if (error) throw error;
  return data;
}
