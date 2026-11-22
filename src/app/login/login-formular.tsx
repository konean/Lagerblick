"use client";

import { useActionState } from "react";
import { anmelden, type AnmeldeZustand } from "@/app/actions";

const feld =
  "mt-1.5 block w-full rounded-s border border-linie-stark bg-flaeche px-3 py-2 text-sm " +
  "outline-none focus:border-akzent focus:ring-2 focus:ring-akzent/15";

export function LoginFormular() {
  const [zustand, aktion, laeuft] = useActionState<AnmeldeZustand, FormData>(anmelden, {});

  return (
    <form action={aktion} className="mt-6 space-y-4" noValidate>
      {zustand.fehler && (
        <p
          role="alert"
          className="rounded-s border border-fehler/25 bg-fehler-hell px-3 py-2 text-sm text-fehler"
        >
          {zustand.fehler}
        </p>
      )}

      <label className="block text-sm font-medium">
        E-Mail
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          defaultValue={zustand.email}
          className={feld}
        />
      </label>

      <label className="block text-sm font-medium">
        Passwort
        <input
          name="passwort"
          type="password"
          autoComplete="current-password"
          required
          className={feld}
        />
      </label>

      <button
        type="submit"
        disabled={laeuft}
        className="w-full rounded-s bg-akzent px-3 py-2.5 text-sm font-medium text-white hover:bg-akzent-dunkel disabled:opacity-60"
      >
        {laeuft ? "Anmeldung läuft …" : "Anmelden"}
      </button>
    </form>
  );
}
