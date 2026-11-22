import type { Metadata } from "next";
import { Marke } from "@/components/marke";
import { LoginFormular } from "./login-formular";

export const metadata: Metadata = { title: "Anmelden · Lagerblick" };

export default function LoginSeite() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <Marke gross />
          <p className="mt-2 font-mono text-xs tracking-wider text-grau uppercase">
            Material · Bewegungen · Reservierungen
          </p>
        </div>

        <section className="rounded-m border border-linie bg-flaeche p-6 sm:p-8">
          <h1 className="text-lg font-semibold">Anmelden</h1>
          <p className="mt-1 text-sm text-grau">Interner Zugang für Mitarbeitende.</p>
          <LoginFormular />
        </section>

        <p className="mt-6 text-xs text-grau">
          Noch kein Zugang? Die Administration legt Benutzerkonten an.
        </p>
      </div>
    </main>
  );
}
