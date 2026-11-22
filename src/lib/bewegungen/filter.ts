import { z } from "zod";
import { BEWEGUNGSARTEN, type Bewegungsart } from "./schema";

// Filter der Buchungshistorie aus der URL. Ungültige Einzelwerte werden ignoriert,
// damit eine veränderte oder alte URL die Seite nicht unbrauchbar macht.

export const EINTRAEGE_PRO_SEITE = 50;

export type HistorieFilter = {
  material?: string;
  projekt?: string;
  art?: Bewegungsart;
  von?: string; // YYYY-MM-DD
  bis?: string; // YYYY-MM-DD
  seite: number;
};

const ART_SCHLUESSEL = Object.keys(BEWEGUNGSARTEN) as [Bewegungsart, ...Bewegungsart[]];

const datumSchema = z.iso.date();

const parameterSchema = z.object({
  material: z.uuid().optional().catch(undefined),
  projekt: z.uuid().optional().catch(undefined),
  art: z.enum(ART_SCHLUESSEL).optional().catch(undefined),
  von: datumSchema.optional().catch(undefined),
  bis: datumSchema.optional().catch(undefined),
  seite: z.coerce.number().int().min(1).max(10_000).catch(1),
});

type Parameter = Record<string, string | string[] | undefined>;

function einzelwert(wert: string | string[] | undefined) {
  const text = Array.isArray(wert) ? wert[0] : wert;
  return text === "" ? undefined : text;
}

export function leseHistorieFilter(parameter: Parameter): { filter: HistorieFilter; fehler?: string } {
  const filter: HistorieFilter = parameterSchema.parse({
    material: einzelwert(parameter.material),
    projekt: einzelwert(parameter.projekt),
    art: einzelwert(parameter.art),
    von: einzelwert(parameter.von),
    bis: einzelwert(parameter.bis),
    seite: einzelwert(parameter.seite) ?? 1,
  });

  if (filter.von && filter.bis && filter.von > filter.bis) {
    return {
      filter: { ...filter, von: undefined, bis: undefined },
      fehler: "Der Zeitraum ist ungültig: „Von“ liegt nach „Bis“. Der Zeitraum wird ignoriert.",
    };
  }
  return { filter };
}

// Beginn eines Kalendertags in Europe/Berlin als UTC-Zeitpunkt.
// Der Versatz (+1 oder +2 Stunden) hängt von Sommer- oder Winterzeit an diesem Tag ab.
export function tagesbeginnBerlin(datum: string): Date {
  const [jahr, monat, tag] = datum.split("-").map(Number);
  const utcMitternacht = Date.UTC(jahr, monat - 1, tag);
  const teil = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Berlin", timeZoneName: "longOffset" })
    .formatToParts(new Date(utcMitternacht))
    .find((t) => t.type === "timeZoneName")?.value; // z. B. „GMT+01:00“
  const treffer = /GMT([+-])(\d{2}):(\d{2})/.exec(teil ?? "");
  const versatzMinuten = treffer
    ? (treffer[1] === "-" ? -1 : 1) * (Number(treffer[2]) * 60 + Number(treffer[3]))
    : 0;
  return new Date(utcMitternacht - versatzMinuten * 60_000);
}

// Zeitraum als halboffenes Intervall [ab, vor): „bis“ schließt den ganzen Tag ein.
export function zeitraumGrenzen(filter: Pick<HistorieFilter, "von" | "bis">) {
  let vor: string | undefined;
  if (filter.bis) {
    const folgetag = new Date(`${filter.bis}T00:00:00Z`);
    folgetag.setUTCDate(folgetag.getUTCDate() + 1);
    vor = tagesbeginnBerlin(folgetag.toISOString().slice(0, 10)).toISOString();
  }
  return {
    ab: filter.von ? tagesbeginnBerlin(filter.von).toISOString() : undefined,
    vor,
  };
}

// URL einer Historienseite mit den aktuellen Filtern, z. B. für das Blättern.
export function historieUrl(filter: HistorieFilter, seite: number) {
  const parameter = new URLSearchParams();
  if (filter.material) parameter.set("material", filter.material);
  if (filter.projekt) parameter.set("projekt", filter.projekt);
  if (filter.art) parameter.set("art", filter.art);
  if (filter.von) parameter.set("von", filter.von);
  if (filter.bis) parameter.set("bis", filter.bis);
  if (seite > 1) parameter.set("seite", String(seite));
  const text = parameter.toString();
  return text ? `/bewegungen?${text}` : "/bewegungen";
}
