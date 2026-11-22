"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

// Hauptnavigation. Weitere Punkte (Bewegungen, Reservierungen, Projekte)
// folgen mit ihren Phasen.
const EINTRAEGE = [
  { href: "/", label: "Übersicht" },
  { href: "/materialien", label: "Materialien" },
];

// Der aktuelle Pfad steht erst zur Laufzeit fest. Bis dahin zeigt der Fallback
// dieselben Links ohne Hervorhebung, damit die Seite sofort vorgerendert wird.
export function Navigation() {
  return (
    <Suspense fallback={<Links pfad={null} />}>
      <AktiveNavigation />
    </Suspense>
  );
}

function AktiveNavigation() {
  return <Links pfad={usePathname()} />;
}

function Links({ pfad }: { pfad: string | null }) {
  return (
    <nav className="flex gap-1 overflow-x-auto text-sm">
      {EINTRAEGE.map((eintrag) => {
        const aktiv =
          pfad !== null && (eintrag.href === "/" ? pfad === "/" : pfad.startsWith(eintrag.href));
        return (
          <Link
            key={eintrag.href}
            href={eintrag.href}
            aria-current={aktiv ? "page" : undefined}
            className={`rounded-s px-2.5 py-1.5 whitespace-nowrap hover:bg-papier ${
              aktiv ? "bg-akzent-hell font-medium text-akzent hover:bg-akzent-hell" : "text-tinte"
            }`}
          >
            {eintrag.label}
          </Link>
        );
      })}
    </nav>
  );
}
