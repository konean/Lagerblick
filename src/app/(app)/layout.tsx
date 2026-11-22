import { Suspense } from "react";
import Link from "next/link";
import { Marke } from "@/components/marke";
import { Navigation } from "@/components/navigation";
import { BenutzerMenue } from "./benutzer-menue";

// Rahmen für alle Seiten nach der Anmeldung.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-linie bg-flaeche">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:gap-6 sm:px-6">
          <Link href="/" aria-label="Lagerblick – Übersicht" className="shrink-0">
            <Marke />
          </Link>
          <Navigation />
          <div className="ml-auto shrink-0">
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
