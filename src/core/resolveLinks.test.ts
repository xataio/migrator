import { EMPTY, lastValueFrom, Observable } from "rxjs";
import { describe, it, expect, vitest } from "vitest";
import { Schema } from "../xataWorkspace/xataWorkspaceSchemas";
import { resolveLinks, ResolveLinksOptions } from "./resolveLinks";

describe("resolveLinks", () => {
  it("should resolved any columns with `_unresolved` suffix", async () => {
    const xataSchema: Schema = {
      tables: [
        {
          name: "team",
          columns: [{ name: "name", type: "string" }],
        },
        {
          name: "city",
          columns: [{ name: "name", type: "string" }],
        },
        {
          name: "teamMember",
          columns: [
            { name: "name", type: "string" },
            { name: "location_unresolved", type: "string" },
            {
              name: "location",
              type: "link",
              link: {
                table: "city",
              },
            },
          ],
        },
        {
          name: "teamMember_team",
          columns: [
            {
              name: "teamMember",
              type: "link",
              link: {
                table: "teamMember",
              },
            },
            {
              name: "teamMember_unresolved",
              type: "string",
            },
            {
              name: "team",
              type: "link",
              link: {
                table: "team",
              },
            },
            {
              name: "team_unresolved",
              type: "string",
            },
          ],
        },
      ],
    };

    const getTableTargetRecords$: ResolveLinksOptions["getTableTargetRecords$"] =
      (tableName) => {
        if (tableName === "team") {
          return new Observable((s) => {
            s.next({
              id: "team-1",
              fields: {
                xata: { version: 0 },
                name: "devrel",
              },
            });
            return s.complete();
          });
        }
        if (tableName === "city") {
          return new Observable((s) => {
            s.next({
              id: "city-1",
              fields: {
                xata: { version: 0 },
                name: "Berlin",
              },
            });
            return s.complete();
          });
        }

        if (tableName === "teamMember") {
          return new Observable((s) => {
            s.next({
              id: "teamMember-1",
              fields: {
                xata: { version: 0 },
                name: "Fabien",
                location: {
                  id: "city-1", // this should be ignore
                  name: "Berlin",
                },
                location_unresolved: "city-1",
              },
            });
            return s.complete();
          });
        }

        if (tableName === "teamMember_team") {
          return new Observable((s) => {
            s.next({
              id: "teamMember_team-1",
              fields: {
                xata: { version: 0 },
                teamMember_unresolved: "teamMember-1",
                team_unresolved: "team-1",
              },
            });
            return s.complete();
          });
        }

        return EMPTY;
      };

    const updateRecord = vitest.fn(async () => {});

    await lastValueFrom(
      resolveLinks({
        xataSchema,
        updateRecord,
        getTableTargetRecords$,
      })
    );

    expect(updateRecord).toBeCalledWith({
      tableName: "teamMember",
      id: "teamMember-1",
      fields: {
        name: "Fabien",
        location: "city-1",
      },
    });

    expect(updateRecord).toBeCalledWith({
      tableName: "teamMember_team",
      id: "teamMember_team-1",
      fields: {
        teamMember: "teamMember-1",
        team: "team-1",
      },
    });
  });
});
