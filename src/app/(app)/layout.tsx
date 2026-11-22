import { Suspense } from "react";
import Link from "next/link";
import { Marke } from "@/components/marke";
import { HilfeLink, KopfNavigation, UntereNavigation } from "@/components/navigation";
import { WischNavigation } from "@/components/wisch-navigation";
import { BenutzerMenue } from "./benutzer-menue";

// Rahmen für alle Seiten nach der Anmeldung.
// Desktop: Navigation in der Kopfzeile. Smartphone: feste Leiste unten und Wischen zwischen den Bereichen.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-linie bg-flaeche">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link href="/" aria-label="Lagerblick – Übersicht" className="shrink-0">
            <Marke />
          </Link>
          <KopfNavigation />
          <div className="ml-auto flex shrink-0 items-center gap-3">
            <HilfeLink />
            <Suspense fallback={<span className="text-sm text-grau">…</span>}>
              <BenutzerMenue />
            </Suspense>
          </div>
        </div>
      </header>
      {/* Unten Platz für die mobile Navigationsleiste lassen. */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-6 md:py-8">
        <WischNavigation>{children}</WischNavigation>
      </main>
      <UntereNavigation />
    </>
  );
}
