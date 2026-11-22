import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export const testbenutzer = {
  admin: {
    email: process.env.TEST_ADMIN_EMAIL ?? "",
    passwort: process.env.TEST_ADMIN_PASSWORT ?? "",
  },
  mitarbeiter: {
    email: process.env.TEST_MITARBEITER_EMAIL ?? "",
    passwort: process.env.TEST_MITARBEITER_PASSWORT ?? "",
  },
};

// DB-Tests nur ausführen, wenn Projekt und Testbenutzer konfiguriert sind.
export const dbKonfiguriert = Boolean(
  url &&
    key &&
    testbenutzer.admin.email &&
    testbenutzer.admin.passwort &&
    testbenutzer.mitarbeiter.email &&
    testbenutzer.mitarbeiter.passwort,
);

export function anonymerClient() {
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function angemeldeterClient(rolle: keyof typeof testbenutzer) {
  const client = anonymerClient();
  const { email, passwort } = testbenutzer[rolle];
  const { data, error } = await client.auth.signInWithPassword({ email, password: passwort });
  if (error) throw new Error(`Anmeldung als ${rolle} fehlgeschlagen: ${error.message}`);
  return { client, userId: data.user.id };
}
