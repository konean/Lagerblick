"use server";

import { redirect } from "next/navigation";
import { anmeldeFehlermeldung } from "@/lib/anmeldung";
import { createClient } from "@/lib/supabase/server";

export type AnmeldeZustand = { fehler?: string; email?: string };

export async function anmelden(
  _vorher: AnmeldeZustand,
  formData: FormData,
): Promise<AnmeldeZustand> {
  const email = String(formData.get("email") ?? "").trim();
  const passwort = String(formData.get("passwort") ?? "");

  if (!email || !passwort) {
    return { fehler: "Bitte E-Mail und Passwort eingeben.", email };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: passwort });

  if (error) {
    return { fehler: anmeldeFehlermeldung(error), email };
  }

  redirect("/");
}

export async function abmelden() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
