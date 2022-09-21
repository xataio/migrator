import { request } from "undici";
import { from, EMPTY, throwError } from "rxjs";
import { mergeMap, expand } from "rxjs/operators";
import { z } from "zod";

const pageSize = 100;

const responseSchema = z.object({
  records: z.array(
    z.object({
      /**
       * @example "recyaYzrg6qzFe17S"
       */
      id: z.string(),
      /**
       * @example "2022-08-08T14:40:48.000Z"
       */
      createdTime: z.string(),
      fields: z.record(z.string(), z.unknown()),
    })
  ),
  offset: z.string().optional(),
});

const errorSchema = z.object({
  error: z.object({
    type: z.string(),
    message: z.string(),
  }),
});

type AirTableOptions = {
  apiKey: string;
  /**
   * The number of records returned in each request. Must be less than or equal to 100. Default is 100. See the Pagination section below for more.
   * @default 100
   */
  pageSize?: number;
  offset?: string;
  /**
   * An optional boolean value that lets you return field objects where the key is the field id.
   * @default false
   */
  returnFieldsByFieldId?: boolean;
};

export async function listRecords(
  baseId: string,
  tableId: string,
  { apiKey, ...options }: AirTableOptions
) {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  let query = new URLSearchParams(options as any).toString();
  if (query) query = `?${query}`;

  const { body, statusCode } = await request(
    `https://api.airtable.com/v0/${baseId}/${tableId}${query}`,
    {
      headers,
    }
  );

  if (statusCode === 200) {
    return {
      statusCode,
      data: responseSchema.parse(await body.json()),
    } as const;
  } else {
    const { error } = errorSchema.parse(await body.json());
    return {
      statusCode,
      error,
    } as const;
  }
}

function listRecordsStream(
  baseId: string,
  tableId: string,
  options: AirTableOptions
) {
  return from(listRecords(baseId, tableId, options));
}

/**
 * Get a stream of records
 */
export const getAllAirtableRecords$ = ({
  baseId,
  tableId,
  apiKey,
}: {
  baseId: string;
  tableId: string;
  apiKey: string;
}) =>
  listRecordsStream(baseId, tableId, { apiKey, pageSize }).pipe(
    expand((response) =>
      response.data?.offset
        ? listRecordsStream(baseId, tableId, {
            apiKey,
            pageSize,
            offset: response.data.offset,
          })
        : EMPTY
    ),
    mergeMap((response) => {
      if (response.statusCode === 200 && response.data) {
        return from(response.data.records);
      }
      if (response.error) {
        return throwError(() => response.error);
      }
      return EMPTY;
    })
  );
