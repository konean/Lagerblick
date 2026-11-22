import { BEREICHE, type BereichPfad } from "./bereiche";

// "vor" = nach links gewischt, nächster Bereich. "zurueck" = nach rechts, voriger Bereich.
export type Richtung = "vor" | "zurueck";

export const WISCH = {
  // Ab diesem Weg wird entschieden, ob die Geste waagerecht oder senkrecht ist.
  richtungsSchwelle: 10,
  // Waagerecht gilt nur, wenn |dy| kleiner als dieser Anteil von |dx| ist (ca. 27°).
  steilheit: 0.5,
  // Ab diesem Weg schaltet ein normales Wischen um.
  mindestweg: 60,
  // Ein kurzes, schnelles Schnippen schaltet schon ab diesem Weg um ...
  schnippWeg: 30,
  // ... wenn es mindestens so schnell ist (px pro ms).
  schnippTempo: 0.5,
  // Am Bildschirmrand liegt die Zurück-Geste von iOS und Android.
  randBreite: 20,
  // Der Inhalt folgt dem Finger gedämpft und höchstens so weit.
  daempfung: 0.25,
  maxVerschiebung: 40,
} as const;

// Ziel beim Wischen. Nur auf den Hauptseiten selbst, nicht auf Unterseiten. Endlos.
export function zielBereich(pfad: string, richtung: Richtung): BereichPfad | null {
  const index = BEREICHE.findIndex((bereich) => bereich.href === pfad);
  if (index === -1) return null;
  const schritt = richtung === "vor" ? 1 : -1;
  return BEREICHE[(index + schritt + BEREICHE.length) % BEREICHE.length].href;
}

// Darf an dieser waagerechten Position eine Geste beginnen?
export function startErlaubt(x: number, breite: number): boolean {
  return x >= WISCH.randBreite && x <= breite - WISCH.randBreite;
}

// Früh festlegen, ob der Finger waagerecht oder senkrecht unterwegs ist. null = noch offen.
export function richtungFestlegen(dx: number, dy: number): "waagerecht" | "senkrecht" | null {
  if (Math.hypot(dx, dy) < WISCH.richtungsSchwelle) return null;
  return istFlach(dx, dy) ? "waagerecht" : "senkrecht";
}

// Ergebnis beim Loslassen: Richtung zum Umschalten oder null zum Zurückfedern.
export function bewerteGeste({ dx, dy, dauer }: { dx: number; dy: number; dauer: number }): Richtung | null {
  if (!istFlach(dx, dy)) return null;
  const weg = Math.abs(dx);
  const tempo = weg / Math.max(dauer, 1);
  const reicht = weg >= WISCH.mindestweg || (weg >= WISCH.schnippWeg && tempo >= WISCH.schnippTempo);
  if (!reicht) return null;
  return dx < 0 ? "vor" : "zurueck";
}

// Wie weit der Inhalt dem Finger folgt.
export function verschiebung(dx: number): number {
  const gedaempft = dx * WISCH.daempfung;
  return Math.max(-WISCH.maxVerschiebung, Math.min(WISCH.maxVerschiebung, gedaempft));
}

function istFlach(dx: number, dy: number) {
  return Math.abs(dy) < Math.abs(dx) * WISCH.steilheit;
}
