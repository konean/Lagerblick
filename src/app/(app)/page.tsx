import Link from "next/link";
import { Suspense } from "react";
import { getBenutzer } from "@/lib/auth";
import { ladeNeuesteBewegungen } from "@/lib/bewegungen/daten";
import { BEWEGUNGSARTEN } from "@/lib/bewegungen/schema";
import { formatMenge, formatMengeMitVorzeichen, formatZeitpunkt } from "@/lib/format";
import { ladeMaterialLage, ladeOffeneReservierungen } from "@/lib/uebersicht/daten";
import {
  BestandsHinweis,
  eingabeBasis,
  knopfPrimaer,
  knopfSekundaer,
  StorniertLabel,
  UeberreserviertLabel,
} from "@/components/ui";

// Wie viele Einträge die Blöcke zeigen. Der Rest ist über „Alle anzeigen“ erreichbar.
const ANZAHL_KNAPP = 8;
const ANZAHL_RESERVIERUNGEN = 5;
const ANZAHL_BEWEGUNGEN = 8;

export default function Uebersicht() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-wider text-grau uppercase">01 · Übersicht</p>
          <Suspense fallback={<h1 className="mt-1 text-2xl font-semibold">Willkommen</h1>}>
            <Begruessung />
          </Suspense>
        </div>
        <Schnelleinstieg />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Kennzahl label="Aktive Artikel" href="/materialien">
          <AnzahlAktiv />
        </Kennzahl>
        <Kennzahl label="Unter Mindestbestand" href="/materialien?bestand=knapp">
          <AnzahlKnapp />
        </Kennzahl>
        <Kennzahl label="Offene Reservierungen" href="/reservierungen">
          <AnzahlReservierungen />
        </Kennzahl>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Block titel="Unter Mindestbestand" href="/materialien?bestand=knapp">
          <Suspense fallback={<Platzhalter zeilen={3} />}>
            <KnappeListe />
          </Suspense>
        </Block>
        <Block titel="Aktuelle Reservierungen" href="/reservierungen">
          <Suspense fallback={<Platzhalter zeilen={3} />}>
            <ReservierungsListe />
          </Suspense>
        </Block>
      </div>

      <Block titel="Letzte Bewegungen" href="/bewegungen">
        <Suspense fallback={<Platzhalter zeilen={5} />}>
          <BewegungsListe />
        </Suspense>
      </Block>
    </div>
  );
}

async function Begruessung() {
  const benutzer = await getBenutzer();
  return <h1 className="mt-1 text-2xl font-semibold">Willkommen, {benutzer.anzeigename}</h1>;
}

// Suche führt direkt in die gefilterte Materialliste.
function Schnelleinstieg() {
  return (
    <div className="flex w-full flex-wrap gap-2 sm:w-auto">
      <form action="/materialien" role="search" className="flex min-w-0 flex-1 gap-2 sm:w-80 sm:flex-none">
        <label htmlFor="schnellsuche" className="sr-only">
          Material suchen
        </label>
        <input
          id="schnellsuche"
          name="q"
          type="search"
          placeholder="Material suchen"
          className={`${eingabeBasis} min-w-0`}
        />
        <button type="submit" className={knopfSekundaer}>
          Suchen
        </button>
      </form>
      <Suspense>
        <AdminSchnelleinstieg />
      </Suspense>
    </div>
  );
}

async function AdminSchnelleinstieg() {
  const benutzer = await getBenutzer();
  if (benutzer.rolle !== "admin") return null;
  return (
    <Link href="/materialien/neu" className={knopfPrimaer}>
      Material anlegen
    </Link>
  );
}

// --- Kennzahlen ---------------------------------------------------------------

function Kennzahl({ label, href, children }: { label: string; href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block rounded-m border border-linie bg-flaeche px-4 py-3 hover:border-linie-stark hover:bg-papier"
    >
      <span className="font-mono text-[11px] tracking-wider text-grau uppercase">{label}</span>
      <Suspense fallback={<span className="mt-1 block h-8 w-12 rounded-s bg-papier" />}>{children}</Suspense>
    </Link>
  );
}

function Wert({ zahl, ton, zusatz }: { zahl: number; ton?: "warnung" | "reserviert"; zusatz?: string }) {
  const farbe = ton === "warnung" ? "text-warnung" : ton === "reserviert" ? "text-reserviert" : "";
  return (
    <span className="mt-1 flex items-baseline gap-2">
      <span className={`font-mono text-2xl font-semibold tabular-nums ${farbe}`}>{zahl}</span>
      {zusatz && <span className="text-xs text-grau">{zusatz}</span>}
    </span>
  );
}

async function AnzahlAktiv() {
  const { anzahlAktiv } = await ladeMaterialLage();
  return <Wert zahl={anzahlAktiv} />;
}

async function AnzahlKnapp() {
  const { knappe } = await ladeMaterialLage();
  const knapp = knappe.filter((e) => e.knapp).length;
  const nurUeber = knappe.filter((e) => e.ueber && !e.knapp).length;
  return (
    <Wert
      zahl={knapp}
      ton={knapp > 0 ? "warnung" : undefined}
      zusatz={nurUeber > 0 ? `+ ${nurUeber} überreserviert` : undefined}
    />
  );
}

async function AnzahlReservierungen() {
  const reservierungen = await ladeOffeneReservierungen();
  const projekte = new Set(reservierungen.map((r) => r.projekt_id)).size;
  return (
    <Wert
      zahl={reservierungen.length}
      ton={reservierungen.length > 0 ? "reserviert" : undefined}
      zusatz={projekte > 0 ? `für ${projekte} ${projekte === 1 ? "Projekt" : "Projekte"}` : undefined}
    />
  );
}

// --- Blöcke -------------------------------------------------------------------

function Block({ titel, href, children }: { titel: string; href: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-m border border-linie bg-flaeche">
      <div className="flex items-center justify-between gap-3 border-b border-linie px-4 py-3">
        <h2 className="text-sm font-semibold">{titel}</h2>
        <Link href={href} className="text-xs text-grau underline-offset-2 hover:text-tinte hover:underline">
          Alle anzeigen →
        </Link>
      </div>
      {children}
    </section>
  );
}

function Platzhalter({ zeilen }: { zeilen: number }) {
  return (
    <ul aria-hidden className="divide-y divide-linie">
      {Array.from({ length: zeilen }, (_, i) => (
        <li key={i} className="flex justify-between gap-4 px-4 py-3">
          <span className="h-4 w-40 rounded-s bg-papier" />
          <span className="h-4 w-16 rounded-s bg-papier" />
        </li>
      ))}
    </ul>
  );
}

function Leer({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-6 text-center text-sm text-grau">{children}</p>;
}

function Mehr({ anzahl, href }: { anzahl: number; href: string }) {
  if (anzahl <= 0) return null;
  return (
    <Link href={href} className="block border-t border-linie px-4 py-2 text-xs text-grau hover:bg-papier hover:text-tinte">
      + {anzahl} weitere
    </Link>
  );
}

async function KnappeListe() {
  const { knappe } = await ladeMaterialLage();
  if (knappe.length === 0) return <Leer>Alle Artikel liegen auf oder über dem Mindestbestand.</Leer>;

  return (
    <>
      <ul className="divide-y divide-linie">
        {knappe.slice(0, ANZAHL_KNAPP).map(({ material: m, stand, knapp, ueber }) => (
          <li key={m.id} className="flex items-start justify-between gap-4 px-4 py-3 text-sm hover:bg-papier">
            <div className="min-w-0">
              <Link href={`/materialien/${m.id}`} className="font-medium hover:underline">
                {m.name}
              </Link>
              <span className="mt-1 flex flex-wrap gap-1.5">
                {knapp && <BestandsHinweis kurz />}
                {ueber && <UeberreserviertLabel />}
              </span>
            </div>
            <div className="text-right font-mono whitespace-nowrap tabular-nums">
              <span className={knapp ? "font-medium text-warnung" : ""}>{formatMenge(stand.bestand, m.einheit)}</span>
              <span className="block text-xs text-grau">
                {ueber
                  ? `reserviert ${formatMenge(stand.reserviert, m.einheit)}`
                  : `Min. ${formatMenge(m.mindestbestand, m.einheit)}`}
              </span>
            </div>
          </li>
        ))}
      </ul>
      <Mehr anzahl={knappe.length - ANZAHL_KNAPP} href="/materialien?bestand=knapp" />
    </>
  );
}

async function ReservierungsListe() {
  const reservierungen = await ladeOffeneReservierungen();
  if (reservierungen.length === 0) return <Leer>Keine offenen Reservierungen.</Leer>;

  return (
    <>
      <ul className="divide-y divide-linie">
        {reservierungen.slice(0, ANZAHL_RESERVIERUNGEN).map((r) => (
          <li
            key={`${r.material_id}-${r.projekt_id}`}
            className="flex items-start justify-between gap-4 px-4 py-3 text-sm hover:bg-papier"
          >
            <div className="min-w-0">
              <Link href={`/materialien/${r.material_id}`} className="font-medium hover:underline">
                {r.material?.name}
              </Link>
              <Link href={`/projekte/${r.projekt_id}`} className="block text-xs text-grau hover:text-tinte hover:underline">
                {r.projekt?.nummer ? `${r.projekt.nummer} · ${r.projekt.name}` : r.projekt?.name}
              </Link>
            </div>
            <div className="text-right whitespace-nowrap">
              <span className="font-mono text-reserviert tabular-nums">{formatMenge(r.menge, r.material?.einheit)}</span>
              <span className="block text-xs text-grau">{formatZeitpunkt(r.geaendert_am)}</span>
            </div>
          </li>
        ))}
      </ul>
      <Mehr anzahl={reservierungen.length - ANZAHL_RESERVIERUNGEN} href="/reservierungen" />
    </>
  );
}

async function BewegungsListe() {
  const bewegungen = await ladeNeuesteBewegungen(ANZAHL_BEWEGUNGEN);
  if (bewegungen.length === 0) return <Leer>Noch keine Bewegungen.</Leer>;

  return (
    <ul className="divide-y divide-linie">
      {bewegungen.map((b) => (
        <li
          key={b.id}
          className="grid grid-cols-[1fr_auto] items-start gap-x-4 gap-y-1 px-4 py-3 text-sm hover:bg-papier sm:grid-cols-[150px_1fr_140px_auto]"
        >
          <span className="hidden font-mono text-xs whitespace-nowrap text-grau tabular-nums sm:block sm:pt-0.5">
            {formatZeitpunkt(b.erstellt_am)}
          </span>
          <div className="min-w-0">
            {b.material ? (
              <Link href={`/materialien/${b.material.id}`} className="font-medium hover:underline">
                {b.material.name}
              </Link>
            ) : (
              "–"
            )}
            {b.projekt && (
              <Link href={`/projekte/${b.projekt.id}`} className="block text-xs text-grau hover:text-tinte hover:underline">
                Projekt {b.projekt.name}
              </Link>
            )}
            {/* Auf schmalen Bildschirmen stehen Art, Zeitpunkt und Benutzer unter dem Artikel. */}
            <span className="block text-xs text-grau sm:hidden">
              {BEWEGUNGSARTEN[b.art]} · {formatZeitpunkt(b.erstellt_am)}
            </span>
          </div>
          <div className="hidden sm:block">
            <span className={`block ${b.storniert ? "text-grau" : ""}`}>{BEWEGUNGSARTEN[b.art]}</span>
            <span className="block text-xs text-grau">{b.ersteller?.anzeigename ?? "Unbekannt"}</span>
          </div>
          <div className="text-right">
            <span
              className={`block font-mono whitespace-nowrap tabular-nums ${
                b.storniert ? "text-grau line-through" : b.menge > 0 ? "text-ok" : ""
              }`}
            >
              {formatMengeMitVorzeichen(b.menge, b.material?.einheit)}
            </span>
            {b.storniert && (
              <span className="mt-1 block">
                <StorniertLabel />
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
