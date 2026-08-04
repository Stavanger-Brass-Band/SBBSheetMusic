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
 * The outcome of reading the current user's roles.
 *
 * Failing has to be tellable from holding no roles: an empty `roles` array is a
 * real answer that should overwrite the cached access flags, while a read that
 * never landed has to leave them alone. `unauthorized` — a rejected token, the
 * one failure a refresh can undo — is kept apart from `failed` (offline, 5xx,
 * unreadable body), which no amount of refreshing helps and which must not end
 * the session.
 */
export type RolesResult =
  | { status: "ok"; roles: string[] }
  | { status: "unauthorized" }
  | { status: "failed" };

/**
 * The signed-in user's roles, from which the store derives what UI to show
 * (admin vs music/project management). `/users/me` answers for any
 * authenticated user — it is reading *other* users that needs admin — so the
 * roles on the body, not the status code, are what matter.
 *
 * Bare fetch like the grants above, so the retry the shared client would have
 * given a 401 has to live with the caller: `auth.loadRoles()` does it, and owns
 * the refresh anyway.
 */
export async function fetchRoles(token: string): Promise<RolesResult> {
  const res = await fetch(
    `${PUBLIC_API_BASE_URL}/users/me?api-version=${VERSION}`,
    {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    },
  ).catch(() => null);

  if (!res) return { status: "failed" };
  if (res.status === 401) return { status: "unauthorized" };
  if (!res.ok) return { status: "failed" };

  try {
    const user = (await res.json()) as User;
    return { status: "ok", roles: user.roles ?? [] };
  } catch {
    // The response body is undefined in the OpenAPI document, so an empty or
    // non-JSON body is possible — it tells us nothing about the roles held.
    return { status: "failed" };
  }
}
