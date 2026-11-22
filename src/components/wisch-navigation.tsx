"use client";

import { usePathname, useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef } from "react";
import {
  bewerteGeste,
  richtungFestlegen,
  startErlaubt,
  verschiebung,
  zielBereich,
  type Richtung,
} from "@/lib/navigation/wischen";

// Nur dort, wo die untere Leiste sichtbar ist (unterhalb von Tailwind-md = 48rem).
const MOBIL = "(max-width: 47.99rem)";
const WENIGER_BEWEGUNG = "(prefers-reduced-motion: reduce)";
// Hier beginnt nie eine Wischgeste.
const AUSNAHMEN = "input, textarea, select, [contenteditable], dialog, [role='dialog'], [data-kein-wischen]";

// Ruhige Kurve mit langem Auslaufen, kurz gehalten für eine Arbeits-App.
const KURVE = "cubic-bezier(0.2, 0, 0, 1)";
const AUSBLENDEN_MS = 120;
const EINBLENDEN_MS = 220;
const ZURUECKFEDERN_MS = 200;
const VERSATZ_PX = 16;
// Bleibt der Seitenwechsel hängen, wird der Inhalt nach dieser Zeit wieder sichtbar.
const NOTFALL_MS = 4000;

type Geste = {
  startX: number;
  startY: number;
  startZeit: number;
  dx: number;
  dy: number;
  ziel: Element | null;
  zustand: "offen" | "zieht";
};

// Wischen nach links öffnet den nächsten Hauptbereich, nach rechts den vorigen.
// Die Geste funktioniert überall auf der Seite, auch auf Karten, Links und den Leisten.
// Bewegt wird nur der Seiteninhalt, Kopfzeile und untere Leiste bleiben stehen.
export function WischNavigation({ children }: { children: React.ReactNode }) {
  const huelle = useRef<HTMLDivElement>(null);
  const router = useRouter();
  // Ziel und Bewegungsrichtung eines laufenden Seitenwechsels per Wischen.
  const wechsel = useRef<{ pfad: string; vorzeichen: number; notfall: number } | null>(null);

  useEffect(() => {
    const element = huelle.current;
    if (!element) return;
    const mobil = window.matchMedia(MOBIL);
    const wenigerBewegung = window.matchMedia(WENIGER_BEWEGUNG);
    let geste: Geste | null = null;

    function zuruecksetzen() {
      if (!element) return;
      element.style.transform = "";
      element.style.willChange = "";
    }

    function zurueckfedern(von: number) {
      zuruecksetzen();
      if (!element || von === 0 || wenigerBewegung.matches) return;
      element.animate([{ transform: `translateX(${von}px)` }, { transform: "translateX(0)" }], {
        duration: ZURUECKFEDERN_MS,
        easing: KURVE,
      });
    }

    function umschalten(richtung: Richtung, von: number) {
      const pfad = zielBereich(window.location.pathname, richtung);
      if (!element || !pfad) return zurueckfedern(von);
      // Der Inhalt bewegt sich in Fingerrichtung weiter, der neue kommt von der Gegenseite.
      const vorzeichen = richtung === "vor" ? -1 : 1;
      zuruecksetzen();
      if (wenigerBewegung.matches) {
        router.push(pfad);
        return;
      }
      const notfall = window.setTimeout(() => {
        element.getAnimations().forEach((animation) => animation.cancel());
        wechsel.current = null;
      }, NOTFALL_MS);
      wechsel.current = { pfad, vorzeichen, notfall };
      const ausblenden = element.animate(
        [
          { transform: `translateX(${von}px)`, opacity: 1 },
          { transform: `translateX(${von + vorzeichen * VERSATZ_PX}px)`, opacity: 0 },
        ],
        { duration: AUSBLENDEN_MS, easing: "ease-in", fill: "forwards" },
      );
      ausblenden.finished.then(
        () => router.push(pfad),
        () => {},
      );
    }

    // Nach einem Wischen darf der Finger beim Loslassen keinen Link auslösen.
    function klickSperren() {
      const sperre = (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
      };
      window.addEventListener("click", sperre, { capture: true, once: true });
      window.setTimeout(() => window.removeEventListener("click", sperre, { capture: true }), 400);
    }

    function beiStart(event: TouchEvent) {
      geste = null;
      if (event.touches.length !== 1 || !mobil.matches || wechsel.current) return;
      if (!zielBereich(window.location.pathname, "vor")) return;
      const finger = event.touches[0];
      const ziel = event.target instanceof Element ? event.target : null;
      if (ziel?.closest(AUSNAHMEN)) return;
      if (!startErlaubt(finger.clientX, window.innerWidth)) return;
      const auswahl = window.getSelection();
      if (auswahl && !auswahl.isCollapsed) return;
      geste = {
        startX: finger.clientX,
        startY: finger.clientY,
        startZeit: event.timeStamp,
        dx: 0,
        dy: 0,
        ziel,
        zustand: "offen",
      };
    }

    function beiBewegung(event: TouchEvent) {
      if (!geste || !element) return;
      if (event.touches.length !== 1) {
        zurueckfedern(geste.zustand === "zieht" ? verschiebung(geste.dx) : 0);
        geste = null;
        return;
      }
      const finger = event.touches[0];
      geste.dx = finger.clientX - geste.startX;
      geste.dy = finger.clientY - geste.startY;

      if (geste.zustand === "offen") {
        const achse = richtungFestlegen(geste.dx, geste.dy);
        if (achse === null) return;
        if (achse === "senkrecht" || kannWaagerechtScrollen(geste.ziel, geste.dx)) {
          geste = null;
          return;
        }
        geste.zustand = "zieht";
        if (!wenigerBewegung.matches) element.style.willChange = "transform";
      }

      // Ab hier gehört die Geste uns: Die Seite scrollt nicht schräg mit.
      if (event.cancelable) event.preventDefault();
      if (!wenigerBewegung.matches) element.style.transform = `translateX(${verschiebung(geste.dx)}px)`;
    }

    function beiEnde(event: TouchEvent) {
      if (!geste) return;
      const beendet = geste;
      geste = null;
      if (beendet.zustand !== "zieht") return;
      klickSperren();
      const von = wenigerBewegung.matches ? 0 : verschiebung(beendet.dx);
      const richtung = bewerteGeste({
        dx: beendet.dx,
        dy: beendet.dy,
        dauer: event.timeStamp - beendet.startZeit,
      });
      if (richtung) umschalten(richtung, von);
      else zurueckfedern(von);
    }

    function beiAbbruch() {
      if (geste?.zustand === "zieht") zurueckfedern(verschiebung(geste.dx));
      geste = null;
    }

    document.addEventListener("touchstart", beiStart, { passive: true });
    document.addEventListener("touchmove", beiBewegung, { passive: false });
    document.addEventListener("touchend", beiEnde);
    document.addEventListener("touchcancel", beiAbbruch);
    return () => {
      document.removeEventListener("touchstart", beiStart);
      document.removeEventListener("touchmove", beiBewegung);
      document.removeEventListener("touchend", beiEnde);
      document.removeEventListener("touchcancel", beiAbbruch);
    };
  }, [router]);

  // Sobald der neue Bereich angezeigt wird, kommt er ruhig von der Gegenseite herein.
  const beiPfadWechsel = useCallback((pfad: string) => {
    const element = huelle.current;
    const laufend = wechsel.current;
    if (!element || !laufend || laufend.pfad !== pfad) return;
    window.clearTimeout(laufend.notfall);
    wechsel.current = null;
    element.getAnimations().forEach((animation) => animation.cancel());
    element.animate(
      [
        { transform: `translateX(${-laufend.vorzeichen * VERSATZ_PX}px)`, opacity: 0 },
        { transform: "translateX(0)", opacity: 1 },
      ],
      { duration: EINBLENDEN_MS, easing: KURVE },
    );
  }, []);

  return (
    <>
      <div ref={huelle}>{children}</div>
      <Suspense fallback={null}>
        <PfadBeobachter beiWechsel={beiPfadWechsel} />
      </Suspense>
    </>
  );
}

// Der Pfad steht erst zur Laufzeit fest und wird deshalb in einer eigenen Suspense-Grenze gelesen.
function PfadBeobachter({ beiWechsel }: { beiWechsel: (pfad: string) => void }) {
  const pfad = usePathname();
  useEffect(() => beiWechsel(pfad), [pfad, beiWechsel]);
  return null;
}

// Liegt der Start in einem waagerecht scrollbaren Bereich (etwa einer breiten Tabelle),
// der in Wischrichtung noch scrollen kann? Dann scrollt er, statt umzuschalten.
function kannWaagerechtScrollen(start: Element | null, dx: number) {
  for (let knoten = start; knoten && knoten !== document.documentElement; knoten = knoten.parentElement) {
    if (knoten.scrollWidth <= knoten.clientWidth) continue;
    const overflow = window.getComputedStyle(knoten).overflowX;
    if (overflow !== "auto" && overflow !== "scroll") continue;
    // Nach links wischen (dx < 0) schiebt den Inhalt nach rechts weiter.
    const rest = dx < 0 ? knoten.scrollWidth - knoten.clientWidth - knoten.scrollLeft : knoten.scrollLeft;
    if (rest > 1) return true;
  }
  return false;
}
