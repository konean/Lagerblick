import { describe, expect, it } from "vitest";
import { reservierungSchema } from "./schema";

const projekt = "6f1c2a1e-8b1a-4c1e-9a4e-2f1d3c4b5a69";

describe("reservierungSchema", () => {
  it("wandelt die Menge um und erlaubt 0 zum Aufheben", () => {
    expect(reservierungSchema("meter").parse({ projekt_id: projekt, menge: "2,5" })).toEqual({ projekt_id: projekt, menge: 2.5 });
    expect(reservierungSchema("stueck").parse({ projekt_id: projekt, menge: "0" })).toEqual({ projekt_id: projekt, menge: 0 });
  });

  it("verlangt ein Projekt und bei Stückgut ganze Zahlen", () => {
    expect(reservierungSchema("stueck").safeParse({ projekt_id: "", menge: "1" }).success).toBe(false);
    expect(reservierungSchema("stueck").safeParse({ projekt_id: projekt, menge: "1,5" }).success).toBe(false);
    expect(reservierungSchema("stueck").safeParse({ projekt_id: projekt, menge: "-1" }).success).toBe(false);
  });
});
