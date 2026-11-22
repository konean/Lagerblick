// Textwerte eines Formulars, damit sie nach einem Fehler wieder angezeigt werden.
// Interne Felder von React (Präfix $) werden ausgelassen.
export function formularwerte(formData: FormData) {
  const werte: Record<string, string> = {};
  formData.forEach((wert, schluessel) => {
    if (typeof wert === "string" && !schluessel.startsWith("$")) werte[schluessel] = wert;
  });
  return werte;
}
