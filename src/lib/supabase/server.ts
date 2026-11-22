import { createServerClient } from "@supabase/ssr";
import { io } from "next/cache";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
import { supabaseEnv } from "./env";

// Supabase-Client für Server Components und Server Actions.
// Er nutzt die Sitzung des angemeldeten Benutzers, deshalb greift RLS.
export async function createClient() {
  const { url, key } = supabaseEnv();
  const cookieStore = await cookies();
  // Supabase liest die Uhrzeit (Date.now) für die Token-Prüfung. io() hält das
  // Vorrendern hier an, damit das nur bei echten Anfragen passiert.
  await io();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // In Server Components lassen sich keine Cookies setzen.
          // Die Sitzung erneuert dann proxy.ts beim nächsten Request.
        }
      },
    },
  });
}
