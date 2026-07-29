import { browser } from "$app/environment";
import { goto } from "$app/navigation";
import { fetchIsAdmin, requestToken, type TokenResponse } from "$lib/api/auth";

const ACCESS_TOKEN_KEY = "access_token";
const IS_ADMIN_KEY = "isAdmin";
const LAST_USER_NAME_KEY = "lastUserName";
const LOGIN_PATH = "/login";

/**
 * Query flag the login screen reads to explain that the session ran out rather
 * than the user signing out. Set by `endExpiredSession`.
 */
export const SESSION_EXPIRED_PARAM = "expired";

/**
 * Authentication state and actions, modeled as a Svelte 5 rune class.
 * Replaces the old `store.js` (isAuthenticated/isAdmin writables) and
 * `authentication.js`. Components read `auth.isAuthenticated` / `auth.isAdmin`
 * directly — no `$` store prefix.
 */
class AuthState {
  #isAuthenticated = $state(false);
  #isAdmin = $state(false);

  constructor() {
    if (browser) {
      this.#isAuthenticated = this.accessToken !== null;
      this.#isAdmin = localStorage.getItem(IS_ADMIN_KEY) === "true";
    }
  }

  get isAuthenticated(): boolean {
    return this.#isAuthenticated;
  }

  get isAdmin(): boolean {
    return this.#isAdmin;
  }

  /**
   * The bearer token for the current session, or `null` when there is none.
   * A literal `"undefined"` can be left behind by an older build that stored a
   * missing token verbatim, so it counts as absent.
   */
  get accessToken(): string | null {
    if (!browser) return null;
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    return token && token !== "undefined" ? token : null;
  }

  get lastUserName(): string | null {
    return browser ? localStorage.getItem(LAST_USER_NAME_KEY) : null;
  }

  async login(email: string, password: string): Promise<TokenResponse> {
    localStorage.setItem(LAST_USER_NAME_KEY, email);

    const data = await requestToken(email, password);

    if (data.access_token) {
      localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
      this.#isAuthenticated = true;
      await this.checkAdmin();
    } else {
      this.#isAuthenticated = false;
    }

    return data;
  }

  async checkAdmin(): Promise<void> {
    const token = this.accessToken;
    if (!token) {
      this.#isAdmin = false;
      return;
    }

    const admin = await fetchIsAdmin(token);
    this.#isAdmin = admin;
    localStorage.setItem(IS_ADMIN_KEY, String(admin));
  }

  /** Signs the user out at their own request. */
  logout(): void {
    this.#clearSession();
    goto(LOGIN_PATH);
  }

  /**
   * Ends a session the API has stopped accepting. There is no refresh grant to
   * renew a token with, so an expired one can only mean signing in again — but
   * the login screen is told why, otherwise the user is dropped out of whatever
   * they were doing with no explanation.
   *
   * Every concurrent 401 lands here, so only the first still has a session to
   * end; the rest would otherwise each queue their own navigation.
   */
  endExpiredSession(): void {
    if (!this.#isAuthenticated) return;
    this.#clearSession();
    goto(`${LOGIN_PATH}?${SESSION_EXPIRED_PARAM}=1`);
  }

  #clearSession(): void {
    if (browser) {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(IS_ADMIN_KEY);
    }
    this.#isAuthenticated = false;
    this.#isAdmin = false;
  }
}

export const auth = new AuthState();
