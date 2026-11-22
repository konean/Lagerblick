import { abmelden } from "@/app/actions";
import { getBenutzer } from "@/lib/auth";
import { RollenLabel } from "@/components/rollen-label";

export async function BenutzerMenue() {
  const benutzer = await getBenutzer();

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="hidden sm:inline">{benutzer.anzeigename}</span>
      <RollenLabel rolle={benutzer.rolle} />
      <form action={abmelden}>
        <button
          type="submit"
          className="rounded-s border border-linie-stark px-2.5 py-1.5 hover:bg-papier"
        >
          Abmelden
        </button>
      </form>
    </div>
  );
}
