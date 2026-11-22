"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

// Hauptbereiche der App. Die mobile Leiste ist für bis zu fünf Einträge ausgelegt.
const EINTRAEGE = [
  { href: "/", label: "Übersicht", kurz: "Übersicht", symbol: <SymbolUebersicht /> },
  { href: "/materialien", label: "Materialien", kurz: "Material", symbol: <SymbolMaterial /> },
  { href: "/bewegungen", label: "Bewegungen", kurz: "Bewegungen", symbol: <SymbolBewegungen /> },
  { href: "/reservierungen", label: "Reservierungen", kurz: "Reserviert", symbol: <SymbolReservierungen /> },
  { href: "/projekte", label: "Projekte", kurz: "Projekte", symbol: <SymbolProjekte /> },
];

function istAktiv(href: string, pfad: string | null) {
  if (pfad === null) return false;
  return href === "/" ? pfad === "/" : pfad.startsWith(href);
}

// Der aktuelle Pfad steht erst zur Laufzeit fest. Bis dahin zeigt der Fallback
// dieselben Links ohne Hervorhebung, damit die Seite sofort vorgerendert wird.
function MitPfad({ children }: { children: (pfad: string | null) => React.ReactNode }) {
  return (
    <Suspense fallback={children(null)}>
      <PfadLeser>{children}</PfadLeser>
    </Suspense>
  );
}

function PfadLeser({ children }: { children: (pfad: string | null) => React.ReactNode }) {
  return children(usePathname());
}

// Desktop: Navigation in der Kopfzeile.
export function KopfNavigation() {
  return (
    <MitPfad>
      {(pfad) => (
        <nav aria-label="Hauptnavigation" className="hidden gap-1 text-sm md:flex">
          {EINTRAEGE.map((eintrag) => {
            const aktiv = istAktiv(eintrag.href, pfad);
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
      )}
    </MitPfad>
  );
}

// Smartphone: feste Leiste unten, alle Bereiche gleich breit und ohne Wischen erreichbar.
export function UntereNavigation() {
  return (
    <MitPfad>
      {(pfad) => (
        <nav
          aria-label="Hauptnavigation"
          className="fixed inset-x-0 bottom-0 z-20 border-t border-linie bg-flaeche pb-[env(safe-area-inset-bottom)] md:hidden"
        >
          <ul className="flex">
            {EINTRAEGE.map((eintrag) => {
              const aktiv = istAktiv(eintrag.href, pfad);
              return (
                <li key={eintrag.href} className="flex-1">
                  <Link
                    href={eintrag.href}
                    aria-current={aktiv ? "page" : undefined}
                    className={`relative flex h-14 flex-col items-center justify-center gap-1 text-[11px] ${
                      aktiv ? "font-medium text-akzent" : "text-grau"
                    }`}
                  >
                    {aktiv && <span aria-hidden className="absolute inset-x-6 top-0 h-0.5 bg-akzent" />}
                    {eintrag.symbol}
                    {eintrag.kurz}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </MitPfad>
  );
}

// Schlichte Liniensymbole (20 px, 1,5 px Strich), passend zur ruhigen Gestaltung.
function Symbol({ children }: { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

function SymbolUebersicht() {
  return (
    <Symbol>
      <rect x="3" y="3" width="5.5" height="5.5" rx="1" />
      <rect x="11.5" y="3" width="5.5" height="5.5" rx="1" />
      <rect x="3" y="11.5" width="5.5" height="5.5" rx="1" />
      <rect x="11.5" y="11.5" width="5.5" height="5.5" rx="1" />
    </Symbol>
  );
}

function SymbolMaterial() {
  return (
    <Symbol>
      <path d="M10 2.5 17 6v8l-7 3.5L3 14V6l7-3.5Z" />
      <path d="M3 6l7 3.5L17 6M10 9.5v8" />
    </Symbol>
  );
}

function SymbolBewegungen() {
  return (
    <Symbol>
      <path d="M3 7h12M12 4l3 3-3 3" strokeLinecap="round" />
      <path d="M17 13H5M8 10l-3 3 3 3" strokeLinecap="round" />
    </Symbol>
  );
}

function SymbolProjekte() {
  return (
    <Symbol>
      <path d="M2.5 5.5a1 1 0 0 1 1-1h4l1.5 2h7.5a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1v-10Z" />
    </Symbol>
  );
}

function SymbolReservierungen() {
  return (
    <Symbol>
      <path d="M5.5 2.5h9a1 1 0 0 1 1 1v14l-5.5-3.5-5.5 3.5v-14a1 1 0 0 1 1-1Z" />
    </Symbol>
  );
}
