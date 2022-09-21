import { describe, it, expect } from "vitest";
import { airtableColumnType, schemas } from "./airtableTypes";

describe("airtable column types", () => {
  // Note: `schemas` is unit-tested instead of having a type definition
  // in order to have correct type inference (we want `z.number` and not `z.any` from the type definition)
  Object.values(airtableColumnType.Values).forEach((i) => {
    it(`should have "${i}" zod schema defined`, () => {
      expect(typeof schemas[i]).toBe("object");
    });
  });
});
