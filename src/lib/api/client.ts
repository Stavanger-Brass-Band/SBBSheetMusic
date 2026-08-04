import { PUBLIC_API_BASE_URL } from "$env/static/public";
import { auth } from "$lib/stores/auth.svelte";

/** The backend selects its version via a required `api-version` query param. */
export type ApiVersion = "1.0" | "2.0";

export const baseUrl = PUBLIC_API_BASE_URL;

const jsonHeaders = {
  Accept: "application/json",
  "Content-Type": "application/json",
};

function authHeader(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Build an absolute URL, injecting `api-version` unless the caller set one.
 *
 * The param is appended as text rather than through `searchParams.set`, which
 * re-serializes the whole query string as form-urlencoded and so rewrites every
 * `%20` a caller encoded into a `+`. Reading `searchParams` doesn't trigger
 * that, only mutating it does. Both forms mean a space to the API, but only the
 * caller's own encoding survives this way. Any fragment is dropped — an API
 * request has no use for one.
 */
export function buildUrl(path: string, version: ApiVersion): string {
  const url = new URL(baseUrl + path);
  if (url.searchParams.has("api-version")) return url.toString();

  const separator = url.search ? "&" : "?";
  return `${url.origin}${url.pathname}${url.search}${separator}api-version=${version}`;
}

/**
 * Fetch with the bearer header injected. On a 401 it makes one attempt to renew
 * the session (the refresh grant) and replays the request with the new token;
 * if that still 401s — or there was nothing to refresh with — it ends the
 * session. Every request in this module goes through here, so refresh is
 * handled in one place.
 *
 * The token is read per send, so the replay picks up the rotated one, and the
 * token that was rejected is handed to `refreshSession` — a request that 401s
 * just after a sibling request already refreshed then simply replays rather than
 * rotating the pair a second time.
 */
async function authedFetch(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const send = (token: string | null) =>
    fetch(url, {
      ...init,
      headers: {
        ...authHeader(token),
        ...(init.headers as Record<string, string>),
      },
    });

  const sentToken = auth.accessToken;
  let res = await send(sentToken);

  if (res.status === 401) {
    if (await auth.refreshSession(sentToken))
      res = await send(auth.accessToken);
    if (res.status === 401) auth.endExpiredSession();
  }

  return res;
}

/**
 * Send a request and parse a successful response, or answer `undefined`.
 *
 * Only a 2xx is parsed. The API answers a rejected write with a problem-details
 * document — `{ type, title, status, errors, … }` — which is perfectly good
 * JSON, so parsing every response regardless of status handed callers that
 * document typed as the payload they asked for. Being an object it passed every
 * `if (result)` check, and a failed create went on to navigate to the `id` it
 * doesn't have. Failure has to be tellable from success by value alone, because
 * the value is all a caller gets.
 */
async function request<T>(
  path: string,
  version: ApiVersion,
  init: RequestInit,
  parse: (res: Response) => Promise<T>,
): Promise<T | undefined> {
  const res = await authedFetch(buildUrl(path, version), init);
  if (!res.ok) return undefined;
  return parse(res);
}

/**
 * GET an endpoint where "nothing found" is an ordinary answer rather than a
 * failure, and comes back as a 404 — the part index is one: it 404s when no part
 * matches the search term, and documents only a 200. Plain `get` would call
 * `res.json()` on that and either throw on the empty body or hand back a parsed
 * error payload masquerading as the expected type. Anything that isn't a 2xx
 * carrying JSON becomes `undefined`, so a miss can't throw at the call site.
 */
async function getOptional<T>(
  path: string,
  version: ApiVersion,
): Promise<T | undefined> {
  const res = await authedFetch(buildUrl(path, version), { method: "GET" });
  if (!res.ok) return undefined;

  const body = await res.text();
  if (!body) return undefined;
  try {
    return JSON.parse(body) as T;
  } catch {
    return undefined;
  }
}

async function postFile(
  path: string,
  version: ApiVersion,
  file: File,
): Promise<{ success: true } | Record<string, unknown> | undefined> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await authedFetch(buildUrl(path, version), {
    method: "POST",
    body: formData,
  });

  if (res.status === 401) return undefined;
  if (res.status === 200) return { success: true };
  if (res.status === 409) {
    const body = await res.text();
    return body === "" ? {} : (JSON.parse(body) as Record<string, unknown>);
  }
  return undefined;
}

/**
 * POST/PUT to an endpoint that returns 200/204 with no body (e.g. user
 * register/update). Mirrors `del`: returns the raw Response so callers can
 * check `res.ok` — it never parses JSON, so an empty body can't throw.
 */
async function writeJson(
  path: string,
  version: ApiVersion,
  method: "POST" | "PUT",
  body: unknown,
): Promise<Response> {
  return authedFetch(buildUrl(path, version), {
    method,
    headers: jsonHeaders,
    body: JSON.stringify(body),
  });
}

async function del(
  path: string,
  version: ApiVersion,
  body?: unknown,
): Promise<Response> {
  const init: RequestInit = { method: "DELETE" };

  if (body !== undefined) {
    init.headers = jsonHeaders;
    init.body = JSON.stringify(body);
  }

  return authedFetch(buildUrl(path, version), init);
}

/**
 * A typed fetch client bound to a single API version. Domain modules create
 * one each: `createClient("2.0")` for sheetmusic, `createClient("1.0")` for
 * the rest.
 */
export function createClient(version: ApiVersion) {
  return {
    get: <T>(path: string) =>
      request<T>(
        path,
        version,
        { method: "GET" },
        (r) => r.json() as Promise<T>,
      ),

    getOptional: <T>(path: string) => getOptional<T>(path, version),

    getText: (path: string) =>
      request<string>(path, version, { method: "GET" }, (r) => r.text()),

    getBlob: (path: string) =>
      request<Blob>(path, version, { method: "GET" }, (r) => r.blob()),

    getMultiple: <T>(paths: string[]) =>
      Promise.all(
        paths.map((p) =>
          request<T>(
            p,
            version,
            { method: "GET" },
            (r) => r.json() as Promise<T>,
          ),
        ),
      ),

    post: <TReq, TRes>(path: string, body: TReq) =>
      request<TRes>(
        path,
        version,
        { method: "POST", headers: jsonHeaders, body: JSON.stringify(body) },
        (r) => r.json() as Promise<TRes>,
      ),

    put: <TReq, TRes>(path: string, body: TReq) =>
      request<TRes>(
        path,
        version,
        { method: "PUT", headers: jsonHeaders, body: JSON.stringify(body) },
        (r) => r.json() as Promise<TRes>,
      ),

    postNoContent: <TReq>(path: string, body: TReq) =>
      writeJson(path, version, "POST", body),

    putNoContent: <TReq>(path: string, body: TReq) =>
      writeJson(path, version, "PUT", body),

    postFile: (path: string, file: File) => postFile(path, version, file),

    del: (path: string, body?: unknown) => del(path, version, body),
  };
}
