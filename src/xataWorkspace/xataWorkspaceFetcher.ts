import undici from "undici";

export type XataWorkspaceFetcherExtraProps = {
  apiKey: string;
  workspaceId: string;
  regionId: string;
};

export type ErrorWrapper<TError> =
  | TError
  | { status: "unknown"; payload: string };

export type XataWorkspaceFetcherOptions<
  TBody,
  THeaders,
  TQueryParams,
  TPathParams
> = {
  url: string;
  method: string;
  body?: TBody;
  headers?: THeaders;
  queryParams?: TQueryParams;
  pathParams?: TPathParams;
} & XataWorkspaceFetcherExtraProps;

export async function xataWorkspaceFetch<
  TData,
  TError,
  TBody extends {} | undefined | null,
  THeaders extends {},
  TQueryParams extends {},
  TPathParams extends {}
>({
  url,
  method,
  body,
  headers,
  pathParams,
  queryParams,
  apiKey,
  workspaceId,
  regionId,
}: XataWorkspaceFetcherOptions<
  TBody,
  THeaders,
  TQueryParams,
  TPathParams
>): Promise<TData> {
  try {
    const response = await undici.fetch(
      `https://${workspaceId}.${regionId}.xata.sh${resolveUrl(
        url,
        queryParams,
        pathParams
      )}`,
      {
        method: method.toUpperCase(),
        body: body ? JSON.stringify(body) : undefined,
        headers: {
          "Content-Type": "application/json",
          "X-Xata-Agent": "service=migrator",
          Authorization: `Bearer ${apiKey}`,
          ...headers,
        },
      }
    );
    if (!response.ok) {
      let error: ErrorWrapper<TError>;
      try {
        error = {
          status: response.status,
          payload: await response.json(),
        } as any;
      } catch (e) {
        error = {
          status: "unknown" as const,
          payload:
            e instanceof Error
              ? `Unexpected error (${e.message})`
              : "Unexpected error",
        };
      }

      throw error;
    }

    if (response.headers.get("content-type")?.includes("json")) {
      return (await response.json()) as any;
    } else {
      // if it is not a json response, asume it is a blob and cast it to TData
      return (await response.blob()) as unknown as TData;
    }
  } catch (e) {
    if (typeof e === "object" && e && "status" in e) {
      throw e;
    }
    throw {
      status: "unknown" as const,
      payload:
        e instanceof Error ? `Network error (${e.message})` : "Network error",
    };
  }
}

const resolveUrl = (
  url: string,
  queryParams: Record<string, string> = {},
  pathParams: Record<string, string> = {}
) => {
  let query = new URLSearchParams(queryParams).toString();
  if (query) query = `?${query}`;
  return url.replace(/\{\w*\}/g, (key) => pathParams[key.slice(1, -1)]) + query;
};
