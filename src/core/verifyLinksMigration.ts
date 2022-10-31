import { filter, from, lastValueFrom, mergeMap, reduce } from "rxjs";
import { BranchMigration } from "../xataWorkspace/xataWorkspaceSchemas";
import { XataTables } from "./getXataNewTables";

type VerifyLinksMigrationOptions = {
  tables: XataTables;
  hasUnresolvedLinks: (
    tableName: string,
    linkColumns: string[]
  ) => Promise<boolean>;
};

export async function verifyLinksMigration({
  tables,
  hasUnresolvedLinks,
}: VerifyLinksMigrationOptions) {
  return lastValueFrom(
    from(Object.values(tables)).pipe(
      // Pick table with links only
      filter((table) =>
        table.columns.reduce((mem, c) => {
          return mem || c.type === "link";
        }, false)
      ),
      mergeMap(async (table) => {
        return {
          table,
          hasUnresolvedLinks: await hasUnresolvedLinks(
            table.name,
            table.columns.filter((c) => c.type === "link").map((c) => c.name)
          ),
        };
      }),
      reduce(
        (mem, { hasUnresolvedLinks, table }) => {
          if (!hasUnresolvedLinks) {
            return {
              ...mem,
              migration: {
                ...mem.migration,
                [table.name]: {
                  removedColumns: table.columns
                    .filter(
                      (c) =>
                        c.type === "string" && c.name.endsWith("_unresolved")
                    )
                    .map((c) => c.name),
                  newColumnOrder: table.columns
                    .filter((c) => !c.name.endsWith("_unresolved"))
                    .map((c) => c.name),
                },
              },
            };
          }

          return {
            ...mem,
            errorTables: [...mem.errorTables, table.name],
          };
        },
        { migration: {}, errorTables: [] } as {
          migration: BranchMigration["tableMigrations"];
          errorTables: string[];
        }
      )
    )
  );
}
