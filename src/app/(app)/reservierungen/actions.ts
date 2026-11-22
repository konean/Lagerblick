"use server";

import { refresh } from "next/cache";
import { getBenutzer } from "@/lib/auth";
import { funktionsfehler } from "@/lib/db-fehler";
import { formatMenge } from "@/lib/format";
import { formularwerte } from "@/lib/formular";
import { feldfehler, type Einheit } from "@/lib/materialien/schema";
import { reservierungSchema } from "@/lib/reservierungen/schema";
import { createClient } from "@/lib/supabase/server";
import type { FormZustand } from "../materialien/actions";

// Beide Rollen dürfen reservieren. Freie Menge, Status und Anmeldung prüft
// setze_reservierung verbindlich in der Datenbank; hier nur die Formularwerte.

const NICHT_GEFUNDEN = "Das Material oder das Projekt wurde nicht gefunden.";

export async function reservierungSetzen(
  materialId: string,
  einheit: Einheit,
  _vorher: FormZustand,
  formData: FormData,
): Promise<FormZustand> {
  const werte = formularwerte(formData);
  await getBenutzer();

  const geprueft = reservierungSchema(einheit).safeParse(werte);
  if (!geprueft.success) {
    return { fehler: "Bitte die markierten Felder prüfen.", feldfehler: feldfehler(geprueft.error), werte };
  }
  const { projekt_id, menge } = geprueft.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("setze_reservierung", {
    p_material_id: materialId,
    p_projekt_id: projekt_id,
    p_menge: menge,
  });
  if (error) return { fehler: funktionsfehler(error, NICHT_GEFUNDEN), werte };

  refresh();
  return { erfolg: menge === 0 ? "Reservierung aufgehoben." : `Reservierung auf ${formatMenge(menge, einheit)} gesetzt.` };
}

export async function reservierungAufheben(materialId: string, projektId: string): Promise<FormZustand> {
  await getBenutzer();

  const supabase = await createClient();
  const { error } = await supabase.rpc("setze_reservierung", {
    p_material_id: materialId,
    p_projekt_id: projektId,
    p_menge: 0,
  });
  if (error) return { fehler: funktionsfehler(error, NICHT_GEFUNDEN) };

  refresh();
  return {};
}
