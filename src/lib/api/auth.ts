import { PUBLIC_API_BASE_URL } from "$env/static/public";
import type { AccessTokens } from "$lib/types";

/**
 * Raw auth endpoints (v1.0). These intentionally use bare `fetch` rather than
 * the shared client so there is no import cycle with the auth store (the
 * client calls `auth.logout()` on 401, and the store calls these helpers).
 */

const VERSION = "1.0";

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

export async function fetchIsAdmin(token: string): Promise<boolean> {
  const res = await fetch(
    `${PUBLIC_API_BASE_URL}/users/me?api-version=${VERSION}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  return res.status === 200;
}
