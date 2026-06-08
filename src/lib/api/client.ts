import { PUBLIC_API_BASE_URL } from "$env/static/public";
import { auth } from "$lib/stores/auth.svelte";

/** The backend selects its version via a required `api-version` query param. */
export type ApiVersion = "1.0" | "2.0";

export const baseUrl = PUBLIC_API_BASE_URL;

const jsonHeaders = {
  Accept: "application/json",
  "Content-Type": "application/json",
};

function authHeader(): Record<string, string> {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Build an absolute URL, injecting `api-version` unless the caller set one. */
export function buildUrl(path: string, version: ApiVersion): string {
  const url = new URL(baseUrl + path);
  if (!url.searchParams.has("api-version")) {
    url.searchParams.set("api-version", version);
  }
  return url.toString();
}

async function request<T>(
  path: string,
  version: ApiVersion,
  init: RequestInit,
  parse: (res: Response) => Promise<T>,
): Promise<T> {
  const res = await fetch(buildUrl(path, version), {
    ...init,
    headers: { ...authHeader(), ...(init.headers as Record<string, string>) },
  });

  if (res.status === 401) {
    auth.logout();
    return undefined as T;
  }

  return parse(res);
}

async function postFile(
  path: string,
  version: ApiVersion,
  file: File,
): Promise<{ success: true } | Record<string, unknown> | undefined> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(buildUrl(path, version), {
    method: "POST",
    headers: authHeader(),
    body: formData,
  });

  if (res.status === 401) {
    auth.logout();
    return undefined;
  }
  if (res.status === 200) return { success: true };
  if (res.status === 409) {
    const body = await res.text();
    return body === "" ? {} : (JSON.parse(body) as Record<string, unknown>);
  }
  return undefined;
}

async function del(
  path: string,
  version: ApiVersion,
  body?: unknown,
): Promise<Response> {
  const headers: Record<string, string> = { ...authHeader() };
  const init: RequestInit = { method: "DELETE", headers };

  if (body !== undefined) {
    headers["Accept"] = "application/json";
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  const res = await fetch(buildUrl(path, version), init);
  if (res.status === 401) auth.logout();
  return res;
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

    postFile: (path: string, file: File) => postFile(path, version, file),

    del: (path: string, body?: unknown) => del(path, version, body),
  };
}
