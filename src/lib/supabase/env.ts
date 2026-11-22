// Öffentliche Supabase-Konfiguration. Beide Werte dürfen im Browser landen;
// der Schutz der Daten liegt bei RLS in der Datenbank.
export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL oder NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY fehlt. Siehe .env.example.",
    );
  }
  return { url, key };
}
