import { PUBLIC_API_BASE_URL } from "$env/static/public";
import type { AccessTokens, User } from "$lib/types";
import type { ApiVersion } from "./client";

/**
 * Raw auth endpoints. These intentionally use bare `fetch` rather than the
 * shared client so there is no import cycle with the auth store (the client
 * calls `auth.endExpiredSession()` on 401, and the store calls these helpers).
 *
 * Auth runs on **v2**. v1's `/token` authenticates against the legacy HMAC
 * password hash, while every endpoint the app manages accounts through —
 * register, password update, forgot/reset password — is Identity-backed and
 * v2-only. Logging in on v1 validates a different credential than the one those
 * endpoints write, so an account created or reset in the app could not sign in
 * through it.
 */

const VERSION: ApiVersion = "2.0";

// On a failed grant `/token` answers 400 with a problem-details body (e.g.
// `type: "InvalidCredentialsError"`, `detail: "Username or password is
// incorrect"`) and no `access_token` — that absence is what marks failure.
export type TokenResponse = AccessTokens & {
  message?: string | null;
  type?: string | null;
  title?: string | null;
  detail?: string | null;
};

/**
 * Sign in with credentials. `/token` names this the `basic` grant (the docs
 * describe two grants: `basic` for username/password, `refresh_token` for
 * renewal); it issues the access + refresh token pair.
 */
export async function requestToken(
  email: string,
  password: string,
): Promise<TokenResponse> {
  const res = await fetch(
    `${PUBLIC_API_BASE_URL}/token?api-version=${VERSION}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:
        "grant_type=basic" +
        `&username=${encodeURIComponent(email)}` +
        `&password=${encodeURIComponent(password)}`,
    },
  );

  // An error body is still JSON; an empty/non-JSON body counts as a failure
  // with no token rather than throwing out of the login flow.
  return (await res.json().catch(() => ({}))) as TokenResponse;
}

/**
 * Exchange a still-valid refresh token for a freshly rotated access + refresh
 * pair (the `refresh_token` grant on the same `/token` endpoint). Bare fetch,
 * like `requestToken`, so it never recurses through the shared client's own
 * 401 handling.
 */
export async function refreshTokens(
  refreshToken: string,
): Promise<TokenResponse> {
  const res = await fetch(
    `${PUBLIC_API_BASE_URL}/token?api-version=${VERSION}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:
        "grant_type=refresh_token" +
        `&refresh_token=${encodeURIComponent(refreshToken)}`,
    },
  );

  return res.json();
}

/**
 * The signed-in user's roles, from which the store derives what UI to show
 * (admin vs music management). `/users/me` answers for any authenticated user —
 * it is reading *other* users that needs admin — so the roles on the body, not
 * the status code, are what matter. A response we can't read roles from yields
 * `[]` (claim nothing); the API enforces every endpoint itself, so failing
 * closed only costs some editing UI rather than handing out controls that would
 * just 403.
 */
export async function fetchRoles(token: string): Promise<string[]> {
  const res = await fetch(
    `${PUBLIC_API_BASE_URL}/users/me?api-version=${VERSION}`,
    {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    },
  );
  if (!res.ok) return [];

  try {
    const user = (await res.json()) as User;
    return user.roles ?? [];
  } catch {
    // The response body is undefined in the OpenAPI document, so an empty or
    // non-JSON body is possible — it tells us nothing, so claim nothing.
    return [];
  }
}
