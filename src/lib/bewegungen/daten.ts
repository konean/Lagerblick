import { createClient } from "@/lib/supabase/server";
import { EINTRAEGE_PRO_SEITE, zeitraumGrenzen, type HistorieFilter } from "./filter";

// Physischer Bestand, reservierte und freie Menge eines Materials.
// frei ist negativ, wenn ein Admin unter die reservierte Menge korrigiert hat.
export type Bestand = { bestand: number; reserviert: number; frei: number };

const LEER: Bestand = { bestand: 0, reserviert: 0, frei: 0 };

function alsBestand(z: { bestand: number | null; reserviert: number | null; frei: number | null }): Bestand {
  return { bestand: z.bestand ?? 0, reserviert: z.reserviert ?? 0, frei: z.frei ?? 0 };
}

// Bestände aller Materialien als Zuordnung material_id → Bestand.
// Die View ist klein (eine Zeile pro Material) und wird für die Liste komplett geladen.
export async function ladeBestaende() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("material_bestand").select("material_id, bestand, reserviert, frei");
  if (error) throw error;
  return new Map(data.map((z) => [z.material_id, alsBestand(z)]));
}

export async function ladeBestand(materialId: string): Promise<Bestand> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("material_bestand")
    .select("bestand, reserviert, frei")
    .eq("material_id", materialId)
    .maybeSingle();
  if (error) throw error;
  return data ? alsBestand(data) : LEER;
}

export async function ladeLetzteBewegungen(materialId: string, anzahl = 10) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bewegungen")
    .select("id, art, menge, kommentar, erstellt_am, storno_von, ersteller:profiles(anzeigename), projekt:projekte(id, name)")
    .eq("material_id", materialId)
    .order("erstellt_am", { ascending: false })
    .limit(anzahl);
  if (error) throw error;
  return mitStornoInfo(data);
}

// Buchungshistorie mit Filtern, neueste zuerst. Lädt einen Eintrag mehr als angezeigt,
// um zu wissen, ob es eine weitere Seite gibt.
export async function ladeBewegungen(filter: HistorieFilter) {
  const supabase = await createClient();
  const start = (filter.seite - 1) * EINTRAEGE_PRO_SEITE;
  let abfrage = supabase
    .from("bewegungen")
    // Als ein zusammenhängender Text, damit Supabase den Ergebnistyp ableiten kann.
    .select("id, art, menge, kommentar, erstellt_am, storno_von, material:materialien(id, name, einheit, status), ersteller:profiles(anzeigename), projekt:projekte(id, name)")
    .order("erstellt_am", { ascending: false })
    .order("id")
    .range(start, start + EINTRAEGE_PRO_SEITE);

  if (filter.material) abfrage = abfrage.eq("material_id", filter.material);
  if (filter.projekt) abfrage = abfrage.eq("projekt_id", filter.projekt);
  if (filter.art) abfrage = abfrage.eq("art", filter.art);
  const { ab, vor } = zeitraumGrenzen(filter);
  if (ab) abfrage = abfrage.gte("erstellt_am", ab);
  if (vor) abfrage = abfrage.lt("erstellt_am", vor);

  const { data, error } = await abfrage;
  if (error) throw error;
  return {
    bewegungen: await mitStornoInfo(data.slice(0, EINTRAEGE_PRO_SEITE)),
    weitere: data.length > EINTRAEGE_PRO_SEITE,
  };
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

export function ueberreserviert(b: Bestand) {
  return b.frei < 0;
}

// Markierung „unter Mindestbestand“ nur, wenn überhaupt ein Mindestbestand gesetzt ist.
export function unterMindestbestand(bestand: number, mindestbestand: number) {
  return mindestbestand > 0 && bestand < mindestbestand;
}
