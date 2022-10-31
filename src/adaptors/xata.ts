import {
  catchError,
  EMPTY,
  expand,
  mergeMap,
  of,
  switchMap,
  throwError,
  from,
} from "rxjs";
import { fromFetch } from "rxjs/fetch";
import { fetch } from "undici";
import { z } from "zod";

const pageSize = 100;

// @ts-ignore - provide a fetch implementation to rxjs
global.fetch = fetch;

const responseSchema = z.object({
  meta: z.object({
    page: z.object({
      cursor: z.string(),
      more: z.boolean(),
    }),
  }),
  records: z.array(
    z.intersection(
      z.record(z.string(), z.unknown()),
      z.object({ id: z.string() })
    )
  ),
});

const getPaginatedRecords$ = ({
  workspaceId,
  databaseName,
  branch,
  apiKey,
  tableName,
  page,
}: {
  workspaceId: string;
  databaseName: string;
  branch: string;
  apiKey: string;
  tableName: string;
  page: {
    /*
     * Query the next page that follow the cursor.
     */
    after?: string;
    /*
     * Set page size. If the size is missing it is read from the cursor. If no cursor is given xata will choose the default page size.
     *
     * @default 20
     */
    size: number;
  };
}) =>
  fromFetch(
    `https://${workspaceId}.xata.sh/db/${databaseName}:${branch}/tables/${tableName}/query`,
    {
      method: "POST",
      headers: {
        ["Content-Type"]: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ page }),
    }
  ).pipe(
    switchMap(async (response) => {
      if (response.ok) {
        const raw = await response.json();
        return responseSchema.parse(raw);
      } else {
        return { error: true, message: response.status };
      }
    }),
    catchError((err) => {
      // Network error
      return of({ error: true, message: err.message });
    })
  );

export const getAllXataRecords$ = (options: {
  workspaceId: string;
  databaseName: string;
  branch: string;
  apiKey: string;
  tableName: string;
}) =>
  getPaginatedRecords$({
    ...options,
    page: {
      size: pageSize,
    },
  }).pipe(
    expand((response) => {
      if ("error" in response) {
        return EMPTY;
      }
      return response.meta.page.more
        ? getPaginatedRecords$({
            ...options,
            page: {
              size: pageSize,
              after: response.meta.page.cursor,
            },
          })
        : EMPTY;
    }),
    mergeMap((response) => {
      if ("error" in response) {
        return throwError(() => new Error(response.message));
      }
      return from(response.records);
    })
  );
