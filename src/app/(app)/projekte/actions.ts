"use server";

import { redirect } from "next/navigation";
import { getBenutzer } from "@/lib/auth";
import { dbFehlermeldung } from "@/lib/db-fehler";
import { formularwerte } from "@/lib/formular";
import { feldfehler } from "@/lib/materialien/schema";
import { projektSchema, type ProjektStatus } from "@/lib/projekte/schema";
import { createClient } from "@/lib/supabase/server";
import type { FormZustand } from "../materialien/actions";

// Projekte sind Stammdaten: Nur Admins legen sie an, ändern und schließen sie ab.
// Die Rollenprüfung hier dient der verständlichen Meldung, verbindlich prüft RLS.
const KEINE_BERECHTIGUNG: FormZustand = { fehler: "Nur Admins dürfen Projekte ändern." };

async function istAdmin() {
  const benutzer = await getBenutzer();
  return benutzer.rolle === "admin";
}

export async function projektSpeichern(
  id: string | null,
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const werte = formularwerte(formData);
  if (!(await istAdmin())) return { ...KEINE_BERECHTIGUNG, werte };

  const geprueft = projektSchema.safeParse(werte);
  if (!geprueft.success) {
    return { fehler: "Bitte die markierten Felder prüfen.", feldfehler: feldfehler(geprueft.error), werte };
  }

  const supabase = await createClient();
  const anfrage = id
    ? supabase.from("projekte").update(geprueft.data).eq("id", id).select("id")
    : supabase.from("projekte").insert(geprueft.data).select("id");
  const { data, error } = await anfrage;

  if (error) {
    if (error.code === "23505") {
      return { feldfehler: { nummer: "Diese Projektnummer ist bereits vergeben." }, werte };
    }
    return { fehler: dbFehlermeldung(error), werte };
  }
  // Ohne Berechtigung liefert ein Update durch RLS keine Zeile zurück statt eines Fehlers.
  if (!data?.length) return { ...KEINE_BERECHTIGUNG, werte };

  redirect(`/projekte/${data[0].id}`);
}

export async function projektStatusSetzen(id: string, status: ProjektStatus): Promise<FormZustand> {
  if (!(await istAdmin())) return KEINE_BERECHTIGUNG;

  const supabase = await createClient();
  const { data, error } = await supabase.from("projekte").update({ status }).eq("id", id).select("id");
  // P0001: Offene Reservierungen sperren das Abschließen (Trigger in der Datenbank).
  if (error) return { fehler: error.code === "P0001" ? error.message : dbFehlermeldung(error) };
  if (!data?.length) return KEINE_BERECHTIGUNG;

  redirect(`/projekte/${id}`);
}

export async function projektLoeschen(id: string): Promise<FormZustand> {
  if (!(await istAdmin())) return KEINE_BERECHTIGUNG;

  const supabase = await createClient();
  const { data, error } = await supabase.from("projekte").delete().eq("id", id).select("id");
  if (error) {
    if (error.code === "23503") {
      return { fehler: "Für dieses Projekt gibt es Buchungen. Es kann nur abgeschlossen werden." };
    }
    return { fehler: dbFehlermeldung(error) };
  }
  if (!data?.length) return KEINE_BERECHTIGUNG;

  redirect("/projekte");
}
