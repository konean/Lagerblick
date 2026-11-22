"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getBenutzer } from "@/lib/auth";
import type { PostgrestError } from "@supabase/supabase-js";
import { buchungSchema, formularArtSchema, stornoSchema, type FormularArt } from "@/lib/bewegungen/schema";
import { dbFehlermeldung, funktionsfehler } from "@/lib/db-fehler";
import { formatMenge } from "@/lib/format";
import { formularwerte } from "@/lib/formular";
import { feldfehler, kategorieSchema, materialSchema, type Einheit } from "@/lib/materialien/schema";
import { createClient } from "@/lib/supabase/server";

export type FormZustand = {
  fehler?: string;
  erfolg?: string;
  feldfehler?: Record<string, string>;
  werte?: Record<string, string>;
};

const KEINE_BERECHTIGUNG: FormZustand = { fehler: "Nur Admins dürfen Stammdaten ändern." };

// Frühe Prüfung für eine verständliche Meldung. Verbindlich prüft RLS in der Datenbank.
async function istAdmin() {
  const benutzer = await getBenutzer();
  return benutzer.rolle === "admin";
}

// Materialien -----------------------------------------------------------------

export async function materialSpeichern(
  id: string | null,
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const werte = formularwerte(formData);
  if (!(await istAdmin())) return { ...KEINE_BERECHTIGUNG, werte };

  const geprueft = materialSchema.safeParse(werte);
  if (!geprueft.success) {
    return { fehler: "Bitte die markierten Felder prüfen.", feldfehler: feldfehler(geprueft.error), werte };
  }

  const supabase = await createClient();
  const anfrage = id
    ? supabase.from("materialien").update(geprueft.data).eq("id", id).select("id")
    : supabase.from("materialien").insert(geprueft.data).select("id");
  const { data, error } = await anfrage;

  if (error) {
    if (error.code === "23505") {
      return { feldfehler: { sku: "Diese Artikelnummer ist bereits vergeben." }, werte };
    }
    // Trigger materialien_einheit_sperren: Einheit nach der ersten Buchung fest.
    if (error.code === "23514" && error.message.includes("Einheit")) {
      return { feldfehler: { einheit: "Nach der ersten Buchung lässt sich die Einheit nicht mehr ändern." }, werte };
    }
    return { fehler: dbFehlermeldung(error), werte };
  }
  // Ohne Berechtigung liefert ein Update durch RLS keine Zeile zurück statt eines Fehlers.
  if (!data?.length) return { ...KEINE_BERECHTIGUNG, werte };

  redirect(`/materialien/${data[0].id}`);
}

export async function materialStatusSetzen(
  id: string,
  status: "aktiv" | "archiviert",
): Promise<FormZustand> {
  if (!(await istAdmin())) return KEINE_BERECHTIGUNG;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("materialien")
    .update({ status })
    .eq("id", id)
    .select("id");
  // P0001: Offene Reservierungen sperren das Archivieren (Trigger in der Datenbank).
  if (error) return { fehler: error.code === "P0001" ? error.message : dbFehlermeldung(error) };
  if (!data?.length) return KEINE_BERECHTIGUNG;

  redirect(`/materialien/${id}`);
}

export async function materialLoeschen(id: string): Promise<FormZustand> {
  if (!(await istAdmin())) return KEINE_BERECHTIGUNG;

  const supabase = await createClient();
  const { data, error } = await supabase.from("materialien").delete().eq("id", id).select("id");
  if (error) {
    if (error.code === "23503") {
      return { fehler: "Für dieses Material gibt es Buchungen. Es kann nur archiviert werden." };
    }
    return { fehler: dbFehlermeldung(error) };
  }
  if (!data?.length) return KEINE_BERECHTIGUNG;

  redirect("/materialien");
}

// Buchungen -------------------------------------------------------------------
// Eingang und Entnahme dürfen beide Rollen buchen, Korrektur und Storno nur Admins.
// Die Einheit dient nur der verständlichen Vorprüfung; verbindlich prüfen die
// Datenbankfunktionen anhand des gespeicherten Materials und der Rolle.

function buchungsfehler(error: PostgrestError) {
  return funktionsfehler(error, "Das Material, das Projekt oder die Buchung wurde nicht gefunden.");
}

const ERFOLG: Record<FormularArt, (menge: string) => string> = {
  eingang: (menge) => `Eingang über ${menge} gebucht.`,
  entnahme: (menge) => `Entnahme über ${menge} gebucht.`,
  korrektur: (menge) => `Bestand auf ${menge} korrigiert.`,
};

export async function buchen(
  materialId: string,
  einheit: Einheit,
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const werte = formularwerte(formData);
  const art = formularArtSchema.safeParse(werte.art);
  if (!art.success) return { fehler: "Unbekannte Buchungsart.", werte };
  if (art.data === "korrektur" && !(await istAdmin())) {
    return { fehler: "Nur Admins dürfen Bestände korrigieren.", werte };
  }
  await getBenutzer();

  const geprueft = buchungSchema(art.data, einheit).safeParse(werte);
  if (!geprueft.success) {
    return { fehler: "Bitte die markierten Felder prüfen.", feldfehler: feldfehler(geprueft.error), werte };
  }
  const { menge, kommentar } = geprueft.data;
  const projektId = "projekt_id" in geprueft.data ? geprueft.data.projekt_id : undefined;

  const supabase = await createClient();
  const { error } =
    art.data === "korrektur"
      ? await supabase.rpc("buche_korrektur", {
          p_material_id: materialId,
          p_gezaehlter_bestand: menge,
          // Bei der Korrektur ist der Grund laut Schema Pflicht; TypeScript sieht nur den gemeinsamen Typ.
          p_kommentar: kommentar ?? "",
        })
      : art.data === "eingang"
        ? await supabase.rpc("buche_eingang", {
            p_material_id: materialId,
            p_menge: menge,
            p_kommentar: kommentar ?? undefined,
          })
        : await supabase.rpc("buche_entnahme", {
            p_material_id: materialId,
            p_menge: menge,
            p_kommentar: kommentar ?? undefined,
            p_projekt_id: projektId,
          });
  if (error) return { fehler: buchungsfehler(error), werte };

  // Seite mit neuem Bestand und neuer Bewegung neu rendern.
  refresh();
  return { erfolg: ERFOLG[art.data](formatMenge(menge, einheit)) };
}

export async function stornieren(
  bewegungId: string,
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const werte = formularwerte(formData);
  if (!(await istAdmin())) return { fehler: "Nur Admins dürfen Buchungen stornieren.", werte };

  const geprueft = stornoSchema.safeParse(werte);
  if (!geprueft.success) return { feldfehler: feldfehler(geprueft.error), werte };

  const supabase = await createClient();
  const { error } = await supabase.rpc("buche_storno", {
    p_bewegung_id: bewegungId,
    p_kommentar: geprueft.data.kommentar,
  });
  if (error) return { fehler: buchungsfehler(error), werte };

  refresh();
  return { erfolg: "Buchung storniert." };
}

// Kategorien ------------------------------------------------------------------

export async function kategorieSpeichern(
  id: string | null,
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const werte = formularwerte(formData);
  if (!(await istAdmin())) return { ...KEINE_BERECHTIGUNG, werte };

  const geprueft = kategorieSchema.safeParse(werte);
  if (!geprueft.success) {
    return { feldfehler: feldfehler(geprueft.error), werte };
  }

  const supabase = await createClient();
  const anfrage = id
    ? supabase.from("kategorien").update(geprueft.data).eq("id", id).select("id")
    : supabase.from("kategorien").insert(geprueft.data).select("id");
  const { data, error } = await anfrage;

  if (error) {
    if (error.code === "23505") {
      return { feldfehler: { name: "Diese Kategorie gibt es bereits." }, werte };
    }
    return { fehler: dbFehlermeldung(error), werte };
  }
  if (!data?.length) return { ...KEINE_BERECHTIGUNG, werte };

  redirect("/materialien/kategorien");
}

export async function kategorieLoeschen(id: string): Promise<FormZustand> {
  if (!(await istAdmin())) return KEINE_BERECHTIGUNG;

  const supabase = await createClient();
  const { data, error } = await supabase.from("kategorien").delete().eq("id", id).select("id");
  if (error) {
    if (error.code === "23503") {
      return { fehler: "Die Kategorie wird noch von Materialien verwendet." };
    }
    return { fehler: dbFehlermeldung(error) };
  }
  if (!data?.length) return KEINE_BERECHTIGUNG;

  redirect("/materialien/kategorien");
}
