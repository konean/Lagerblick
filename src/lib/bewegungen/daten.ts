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
    .select("id, art, menge, kommentar, erstellt_am, storno_von, ersteller:profiles(anzeigename)")
    .eq("material_id", materialId)
    .order("erstellt_am", { ascending: false })
    .limit(anzahl);
  if (error) throw error;
  return mitStornoInfo(data);
}

// Ergänzt pro Bewegung, ob sie storniert wurde, und bei Stornos die ursprüngliche Bewegung.
// Beides kann außerhalb der geladenen Seite liegen, deshalb eine gezielte Zusatzabfrage.
export async function mitStornoInfo<T extends { id: string; storno_von: string | null }>(bewegungen: T[]) {
  const ids = bewegungen.map((b) => b.id);
  const originalIds = bewegungen.flatMap((b) => (b.storno_von ? [b.storno_von] : []));
  if (ids.length === 0) return [];

  const supabase = await createClient();
  const [stornos, originale] = await Promise.all([
    supabase.from("bewegungen").select("storno_von").in("storno_von", ids),
    originalIds.length
      ? supabase.from("bewegungen").select("id, art, erstellt_am").in("id", originalIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (stornos.error) throw stornos.error;
  if (originale.error) throw originale.error;

  const storniert = new Set(stornos.data.map((s) => s.storno_von));
  const original = new Map(originale.data.map((o) => [o.id, o]));
  return bewegungen.map((b) => ({
    ...b,
    storniert: storniert.has(b.id),
    original: b.storno_von ? (original.get(b.storno_von) ?? null) : null,
  }));
}

// Markierung „unter Mindestbestand“ nur, wenn überhaupt ein Mindestbestand gesetzt ist.
export function unterMindestbestand(bestand: number, mindestbestand: number) {
  return mindestbestand > 0 && bestand < mindestbestand;
}
