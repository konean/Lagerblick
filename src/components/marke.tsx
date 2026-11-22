// Wortmarke: kleines Quadrat als Markierung plus Name.
export function Marke({ gross = false }: { gross?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden className={`${gross ? "size-2.5" : "size-2"} bg-akzent`} />
      <span className={`${gross ? "text-xl" : "text-base"} font-semibold tracking-tight`}>
        Lagerblick
      </span>
    </span>
  );
}
