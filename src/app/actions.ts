"use server";

import { redirect } from "next/navigation";
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
    const fehler =
      error.code === "invalid_credentials"
        ? "E-Mail oder Passwort ist falsch."
        : error.code === "over_request_rate_limit"
          ? "Zu viele Versuche. Bitte kurz warten und erneut versuchen."
          : "Anmeldung fehlgeschlagen. Bitte später erneut versuchen.";
    return { fehler, email };
  }

  redirect("/");
}

export async function abmelden() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
