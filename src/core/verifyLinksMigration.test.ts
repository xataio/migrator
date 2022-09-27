import { describe, it, expect, vitest } from "vitest";
import { XataTables } from "./getXataNewTables";
import { verifyLinksMigration } from "./verifyLinksMigration";

describe("verifyLinksMigration", () => {
  it("should returns the list of successful migrated tables", async () => {
    const tables: XataTables = {
      team: {
        name: "team",
        columns: [{ name: "name", type: "string" }],
      },
      teamMember: {
        name: "teamMember",
        columns: [
          { name: "name", type: "string" },
          { name: "team_unresolved", type: "string" },
          { name: "team", type: "link", link: { table: "team" } },
        ],
      },
    };
    const hasUnresolvedLinks = vitest.fn(
      async (tableName: string, linkColumns: string[]) => {
        if (tableName === "team")
          throw new Error("This should not be requested");

        if (tableName === "teamMember") {
          return false;
        }
        return true;
      }
    );

    const res = await verifyLinksMigration({
      tables,
      hasUnresolvedLinks,
    });

    expect(res).toEqual({
      errorTables: [],
      migration: {
        teamMember: {
          removedColumns: ["team_unresolved"],
          newColumnOrder: ["name", "team"],
        },
      },
    });
  });

  it("should returns the list of error tables", async () => {
    const tables: XataTables = {
      team: {
        name: "team",
        columns: [{ name: "name", type: "string" }],
      },
      teamMember: {
        name: "teamMember",
        columns: [
          { name: "name", type: "string" },
          { name: "team_unresolved", type: "string" },
          { name: "team", type: "link", link: { table: "team" } },
        ],
      },
    };
    const hasUnresolvedLinks = vitest.fn(
      async (tableName: string, linkColumns: string[]) => {
        if (tableName === "team")
          throw new Error("This should not be requested");

        if (tableName === "teamMember") {
          return true;
        }
        return true;
      }
    );

    const res = await verifyLinksMigration({
      tables,
      hasUnresolvedLinks,
    });

    expect(res).toEqual({
      errorTables: ["teamMember"],
      migration: {},
    });
  });
});
