"use server";

import { redirect } from "next/navigation";
import { getBenutzer } from "@/lib/auth";
import { dbFehlermeldung } from "@/lib/db-fehler";
import { feldfehler, kategorieSchema, materialSchema } from "@/lib/materialien/schema";
import { createClient } from "@/lib/supabase/server";

export type FormZustand = {
  fehler?: string;
  feldfehler?: Record<string, string>;
  werte?: Record<string, string>;
};

const KEINE_BERECHTIGUNG: FormZustand = { fehler: "Nur Admins dürfen Stammdaten ändern." };

// Frühe Prüfung für eine verständliche Meldung. Verbindlich prüft RLS in der Datenbank.
async function istAdmin() {
  const benutzer = await getBenutzer();
  return benutzer.rolle === "admin";
}

function formularwerte(formData: FormData) {
  const werte: Record<string, string> = {};
  formData.forEach((wert, schluessel) => {
    if (typeof wert === "string" && !schluessel.startsWith("$")) werte[schluessel] = wert;
  });
  return werte;
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
  if (error) return { fehler: dbFehlermeldung(error) };
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
