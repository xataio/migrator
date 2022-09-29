import {
  concatMap,
  debounceTime,
  delay,
  filter,
  from,
  mergeMap,
  Observable,
  of,
} from "rxjs";
import { Schema } from "../xata/xataSchemas";

export function resolveLinks({
  xataSchema,
  updateRecord,
  getTableTargetRecords$,
}: ResolveLinksOptions) {
  return from(xataSchema.tables).pipe(
    // Pick table with links only
    filter((table) =>
      table.columns.reduce((mem, c) => {
        return mem || c.type === "link";
      }, false)
    ),

    // Get records
    mergeMap((table) =>
      getTableTargetRecords$(table.name).pipe(
        // Skip records without link to be resolved
        filter((record) =>
          Object.keys(record.fields).some((key) => key.endsWith("_unresolved"))
        ),
        concatMap((i) => of(i).pipe(delay(500))), // Avoid xata rate limit
        mergeMap(async (record) =>
          updateRecord({
            tableName: table.name,
            id: record.id,
            fields: Object.entries(record.fields).reduce(
              (mem, [key, value]) => {
                if (key === "xata") return mem;
                if (table.columns.find((c) => c.name === key)?.type === "link")
                  return mem;
                if (key.endsWith("_unresolved")) {
                  const linkKey = key.slice(0, "_unresolved".length * -1);
                  return {
                    [linkKey]: value,
                    ...mem,
                  };
                }
                return { [key]: value, ...mem };
              },
              {}
            ),
          })
        )
      )
    )
  );
}

export type ResolveLinksOptions = {
  /**
   * Xata branch schema
   */
  xataSchema: Schema;

  /**
   * Update a record
   */
  updateRecord: (payload: {
    tableName: string;
    id: string;
    fields: Record<string, unknown>;
  }) => Promise<unknown>;

  /**
   * Target records getter
   */
  getTableTargetRecords$: (tableName: string) => Observable<{
    id: string;
    fields: Record<string, unknown>;
  }>;
};
