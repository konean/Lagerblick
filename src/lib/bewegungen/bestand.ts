// Reine Bestandsregeln ohne Datenbankzugriff, damit sie sich direkt testen lassen.

// Physischer Bestand, reservierte und freie Menge eines Materials.
// frei ist negativ, wenn ein Admin unter die reservierte Menge korrigiert hat.
export type Bestand = { bestand: number; reserviert: number; frei: number };

export const LEERER_BESTAND: Bestand = { bestand: 0, reserviert: 0, frei: 0 };

export function ueberreserviert(b: Bestand) {
  return b.frei < 0;
}

// Markierung „unter Mindestbestand“ nur, wenn überhaupt ein Mindestbestand gesetzt ist.
export function unterMindestbestand(bestand: number, mindestbestand: number) {
  return mindestbestand > 0 && bestand < mindestbestand;
}

export type KnappesMaterial<M> = {
  material: M;
  stand: Bestand;
  knapp: boolean;
  ueber: boolean;
};

// Materialien, die Aufmerksamkeit brauchen: unter Mindestbestand oder überreserviert.
// Überreservierte zuerst, danach nach Füllgrad (Bestand / Mindestbestand) aufsteigend,
// bei Gleichstand nach Name.
export function knappeMaterialien<M extends { id: string; name: string; mindestbestand: number }>(
  materialien: M[],
  bestaende: { get(materialId: string): Bestand | undefined },
): KnappesMaterial<M>[] {
  return materialien
    .map((material) => {
      const stand = bestaende.get(material.id) ?? LEERER_BESTAND;
      return {
        material,
        stand,
        knapp: unterMindestbestand(stand.bestand, material.mindestbestand),
        ueber: ueberreserviert(stand),
      };
    })
    .filter((e) => e.knapp || e.ueber)
    .sort((a, b) => {
      if (a.ueber !== b.ueber) return a.ueber ? -1 : 1;
      const diff = fuellgrad(a) - fuellgrad(b);
      return diff !== 0 ? diff : a.material.name.localeCompare(b.material.name, "de");
    });
}

function fuellgrad(e: { stand: Bestand; material: { mindestbestand: number } }) {
  return e.material.mindestbestand > 0 ? e.stand.bestand / e.material.mindestbestand : Infinity;
}
