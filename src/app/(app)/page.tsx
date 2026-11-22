import { Suspense } from "react";
import { getBenutzer } from "@/lib/auth";

export default function Uebersicht() {
  return (
    <div className="space-y-8">
      <div>
        <p className="font-mono text-xs tracking-wider text-grau uppercase">01 · Übersicht</p>
        <Suspense fallback={<h1 className="mt-1 text-2xl font-semibold">Willkommen</h1>}>
          <Begruessung />
        </Suspense>
      </div>

      <section className="rounded-m border border-linie bg-flaeche p-6">
        <h2 className="text-sm font-semibold">Hier entsteht die Übersicht</h2>
        <p className="mt-1 max-w-prose text-sm text-grau">
          Als Nächstes kommen Materialien, Wareneingang und Bestand. Danach Entnahmen,
          Buchungshistorie, Projekte und Reservierungen.
        </p>
      </section>
    </div>
  );
}

async function Begruessung() {
  const benutzer = await getBenutzer();
  return <h1 className="mt-1 text-2xl font-semibold">Willkommen, {benutzer.anzeigename}</h1>;
}
