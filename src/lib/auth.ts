import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Benutzer = {
  id: string;
  anzeigename: string;
  rolle: "admin" | "mitarbeiter";
};

// Verbindliche Prüfung der Anmeldung für Seiten und Server Actions.
// Ohne gültige Sitzung oder ohne Profil geht es zur Anmeldung.
export const getBenutzer = cache(async (): Promise<Benutzer> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) redirect("/login");

  const { data: profil } = await supabase
    .from("profiles")
    .select("id, anzeigename, rolle")
    .eq("id", id)
    .single();
  if (!profil) redirect("/login");

  return profil;
});
