import { EINHEITEN, type Einheit } from "@/lib/materialien/schema";

const zahl = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 3 });

export function formatMenge(menge: number, einheit?: Einheit) {
  const wert = zahl.format(menge);
  return einheit ? `${wert} ${EINHEITEN[einheit]}` : wert;
}
