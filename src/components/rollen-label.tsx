import type { Benutzer } from "@/lib/auth";

export function RollenLabel({ rolle }: { rolle: Benutzer["rolle"] }) {
  return (
    <span className="rounded-s bg-akzent-hell px-1.5 py-0.5 font-mono text-[11px] tracking-wider text-akzent uppercase">
      {rolle === "admin" ? "Admin" : "Mitarbeiter"}
    </span>
  );
}
