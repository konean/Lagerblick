import { createClient } from "@/lib/supabase/server";

// Bestand aller Materialien als Zuordnung material_id → Bestand.
// Die View ist klein (eine Zeile pro Material) und wird für die Liste komplett geladen.
export async function ladeBestaende() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("material_bestand").select("material_id, bestand");
  if (error) throw error;
  return new Map(data.map((z) => [z.material_id, z.bestand ?? 0]));
}

export async function ladeBestand(materialId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("material_bestand")
    .select("bestand")
    .eq("material_id", materialId)
    .maybeSingle();
  if (error) throw error;
  return data?.bestand ?? 0;
}

export async function ladeLetzteBewegungen(materialId: string, anzahl = 10) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bewegungen")
    .select("id, art, menge, kommentar, erstellt_am, ersteller:profiles(anzeigename)")
    .eq("material_id", materialId)
    .order("erstellt_am", { ascending: false })
    .limit(anzahl);
  if (error) throw error;
  return data;
}

// Markierung „unter Mindestbestand“ nur, wenn überhaupt ein Mindestbestand gesetzt ist.
export function unterMindestbestand(bestand: number, mindestbestand: number) {
  return mindestbestand > 0 && bestand < mindestbestand;
}
