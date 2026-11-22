import { Suspense } from "react";
import Link from "next/link";
import { Marke } from "@/components/marke";
import { BenutzerMenue } from "./benutzer-menue";

// Rahmen für alle Seiten nach der Anmeldung. Weitere Menüpunkte
// (Materialien, Bewegungen, Reservierungen, Projekte) folgen mit ihren Phasen.
const NAVIGATION = [{ href: "/", label: "Übersicht" }];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-linie bg-flaeche">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link href="/" aria-label="Lagerblick – Übersicht">
            <Marke />
          </Link>
          <nav className="flex gap-1 text-sm">
            {NAVIGATION.map((eintrag) => (
              <Link
                key={eintrag.href}
                href={eintrag.href}
                className="rounded-s px-2.5 py-1.5 text-tinte hover:bg-papier"
              >
                {eintrag.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto">
            <Suspense fallback={<span className="text-sm text-grau">…</span>}>
              <BenutzerMenue />
            </Suspense>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </>
  );
}
