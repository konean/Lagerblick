// Hauptbereiche der App in der Reihenfolge der Navigation.
// Gemeinsame Grundlage für Kopfzeile, untere Leiste und Wischnavigation.
export const BEREICHE = [
  { href: "/", label: "Übersicht", kurz: "Übersicht" },
  { href: "/materialien", label: "Materialien", kurz: "Material" },
  { href: "/bewegungen", label: "Bewegungen", kurz: "Bewegungen" },
  { href: "/reservierungen", label: "Reservierungen", kurz: "Reserviert" },
  { href: "/projekte", label: "Projekte", kurz: "Projekte" },
] as const;

export type BereichPfad = (typeof BEREICHE)[number]["href"];
