import { PUBLIC_API_BASE_URL } from "$env/static/public";
import { ADMIN_ROLE } from "$lib/roles";
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

export type TokenResponse = AccessTokens & { message?: string };

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
        "grant_type=password" +
        `&username=${encodeURIComponent(email)}` +
        `&password=${encodeURIComponent(password)}`,
    },
  );

  return res.json();
}

/**
 * Whether the signed-in user holds the admin role.
 *
 * The roles on the body are what decide this, not the status code: `/users/me`
 * answers for any authenticated user — it is reading *other* users that requires
 * admin — so a 200 here says nothing about privileges. A response we can't read
 * roles from counts as not admin. The API enforces admin on its own endpoints
 * either way, so failing closed costs an admin their editing UI, where failing
 * open would hand every member controls that can only come back 403.
 *
 * Matched case-insensitively. Note the endpoint summaries say "Requires
 * Administrator privileges", but that describes the privilege — the role itself
 * is named `Admin`, and `Administrator` answers `RoleNotFoundError`.
 */
export async function fetchIsAdmin(token: string): Promise<boolean> {
  const res = await fetch(
    `${PUBLIC_API_BASE_URL}/users/me?api-version=${VERSION}`,
    {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    },
  );
  if (!res.ok) return false;

  try {
    const user = (await res.json()) as User;
    const adminRole = ADMIN_ROLE.toLowerCase();
    return (user.roles ?? []).some((role) => role.toLowerCase() === adminRole);
  } catch {
    // The response body is undefined in the OpenAPI document, so an empty or
    // non-JSON body is possible — it tells us nothing, so claim nothing.
    return false;
  }
}
