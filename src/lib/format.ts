import { EINHEITEN, type Einheit } from "@/lib/materialien/schema";

const zahl = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 3 });

export function formatMenge(menge: number, einheit?: Einheit) {
  const wert = zahl.format(menge);
  return einheit ? `${wert} ${EINHEITEN[einheit]}` : wert;
}

// Bewegungen mit Vorzeichen anzeigen, damit Zu- und Abgänge sofort erkennbar sind.
export function formatMengeMitVorzeichen(menge: number, einheit?: Einheit) {
  const text = formatMenge(Math.abs(menge), einheit);
  return menge > 0 ? `+${text}` : `−${text}`;
}

// Feste Zeitzone, weil der Server sonst in UTC rendert.
const zeitpunkt = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Berlin",
});

export function formatZeitpunkt(wert: string) {
  return zeitpunkt.format(new Date(wert));
}
