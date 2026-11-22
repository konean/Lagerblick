import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "@/lib/supabase/env";

const OEFFENTLICHE_PFADE = ["/login"];

// Läuft vor jedem Seitenaufruf: erneuert die Supabase-Sitzung und leitet
// nicht angemeldete Benutzer zur Anmeldung um. Das ist nur eine Vorprüfung;
// verbindlich prüfen die Seiten (getBenutzer) und RLS in der Datenbank.
export async function proxy(request: NextRequest) {
  const { url, key } = supabaseEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });

  // getClaims prüft das Zugriffstoken und erneuert es bei Bedarf.
  const { data } = await supabase.auth.getClaims();
  const angemeldet = Boolean(data?.claims?.sub);
  const pfad = request.nextUrl.pathname;
  const oeffentlich = OEFFENTLICHE_PFADE.includes(pfad);

  if (!angemeldet && !oeffentlich) {
    return umleiten(request, response, "/login");
  }
  if (angemeldet && pfad === "/login") {
    return umleiten(request, response, "/");
  }
  return response;
}

// Umleitung, die erneuerte Sitzungs-Cookies mitnimmt.
function umleiten(request: NextRequest, response: NextResponse, ziel: string) {
  const umleitung = NextResponse.redirect(new URL(ziel, request.url));
  response.cookies.getAll().forEach((cookie) => umleitung.cookies.set(cookie));
  return umleitung;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
