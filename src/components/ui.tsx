// Gemeinsame Klassen und kleine Bausteine für eine einheitliche Oberfläche.

export const eingabeBasis =
  "block w-full rounded-s border border-linie-stark bg-flaeche px-3 py-2 text-sm " +
  "outline-none focus:border-akzent focus:ring-2 focus:ring-akzent/15 " +
  "aria-[invalid=true]:border-fehler";

// Mit Abstand zur Beschriftung darüber.
export const eingabeKlasse = `mt-1.5 ${eingabeBasis}`;

export const knopfPrimaer =
  "inline-flex items-center justify-center rounded-s bg-akzent px-3 py-2 text-sm font-medium text-white " +
  "hover:bg-akzent-dunkel disabled:opacity-60";

export const knopfSekundaer =
  "inline-flex items-center justify-center rounded-s border border-linie-stark bg-flaeche px-3 py-2 text-sm " +
  "hover:bg-papier disabled:opacity-60";

export const knopfGefahr =
  "inline-flex items-center justify-center rounded-s border border-fehler/30 bg-flaeche px-3 py-2 text-sm " +
  "text-fehler hover:bg-fehler-hell disabled:opacity-60";

export function Seitenkopf({
  nummer,
  bereich,
  titel,
  children,
}: {
  nummer?: string;
  bereich: string;
  titel: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="font-mono text-xs tracking-wider text-grau uppercase">
          {nummer ? `${nummer} · ${bereich}` : bereich}
        </p>
        <h1 className="mt-1 text-2xl font-semibold">{titel}</h1>
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function Meldung({ art = "fehler", children }: { art?: "fehler" | "hinweis"; children: React.ReactNode }) {
  const farben =
    art === "fehler"
      ? "border-fehler/25 bg-fehler-hell text-fehler"
      : "border-linie bg-papier text-tinte";
  return (
    <p role={art === "fehler" ? "alert" : "status"} className={`rounded-s border px-3 py-2 text-sm ${farben}`}>
      {children}
    </p>
  );
}

export function Feldfehler({ text, id }: { text?: string; id: string }) {
  if (!text) return null;
  return (
    <span id={id} className="mt-1 block text-xs text-fehler">
      {text}
    </span>
  );
}

// Status von Materialien (aktiv/archiviert) und Projekten (aktiv/abgeschlossen).
export function StatusLabel({ status }: { status: "aktiv" | "archiviert" | "abgeschlossen" }) {
  return status === "aktiv" ? (
    <span className="rounded-s bg-ok-hell px-1.5 py-0.5 font-mono text-[11px] tracking-wider text-ok uppercase">
      Aktiv
    </span>
  ) : (
    <span className="rounded-s bg-papier px-1.5 py-0.5 font-mono text-[11px] tracking-wider text-grau uppercase ring-1 ring-linie">
      {status === "archiviert" ? "Archiviert" : "Abgeschlossen"}
    </span>
  );
}

// Gedämpftes Label für Bewegungen, die per Storno aufgehoben wurden.
export function StorniertLabel() {
  return (
    <span className="rounded-s bg-papier px-1.5 py-0.5 font-mono text-[11px] tracking-wider text-grau uppercase ring-1 ring-linie">
      Storniert
    </span>
  );
}

export function BestandsHinweis({ kurz = false }: { kurz?: boolean }) {
  return (
    <span
      title={kurz ? "Bestand unter Mindestbestand" : undefined}
      className="rounded-s bg-warnung-hell px-1.5 py-0.5 font-mono text-[11px] tracking-wider whitespace-nowrap text-warnung uppercase">
      {kurz ? "Unter Min." : "Unter Mindestbestand"}
    </span>
  );
}

// Mehr reserviert als vorhanden, etwa nach einer Inventurkorrektur durch einen Admin.
export function UeberreserviertLabel() {
  return (
    <span
      title="Mehr reserviert als im Lager vorhanden"
      className="rounded-s bg-warnung-hell px-1.5 py-0.5 font-mono text-[11px] tracking-wider whitespace-nowrap text-warnung uppercase"
    >
      Überreserviert
    </span>
  );
}

// Beschriftete Angabe in einer zweispaltigen Stammdaten-Liste (<dl>).
export function Angabe({ label, wert, mono = false }: { label: string; wert?: string | null; mono?: boolean }) {
  return (
    <div className="border-t border-linie px-4 py-3 first:border-t-0 sm:[&:nth-child(2)]:border-t-0">
      <dt className="font-mono text-[11px] tracking-wider text-grau uppercase">{label}</dt>
      <dd className={`mt-1 text-sm ${mono ? "font-mono tabular-nums" : ""}`}>{wert ?? "–"}</dd>
    </div>
  );
}
