import { browser } from "$app/environment";
import { goto } from "$app/navigation";
import {
  fetchRoles,
  refreshTokens,
  requestToken,
  type TokenResponse,
} from "$lib/api/auth";
import { ADMIN_ROLE, MANAGE_MUSIC_ROLES } from "$lib/roles";

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const IS_ADMIN_KEY = "isAdmin";
const CAN_MANAGE_MUSIC_KEY = "canManageMusic";
const LAST_USER_NAME_KEY = "lastUserName";
const LOGIN_PATH = "/login";

const includesRole = (roles: string[], role: string): boolean =>
  roles.some((held) => held.toLowerCase() === role.toLowerCase());

/** Norwegian copy for a rejected sign-in — the API's body is English. */
function loginFailureMessage(data: TokenResponse): string {
  if (data.type === "InvalidCredentialsError")
    return "Feil e-post eller passord.";
  return data.detail ?? "Kunne ikke logge inn. Prøv igjen.";
}

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
  // Music-catalogue management (sets, parts, projects, categories): Admin or
  // Noteansvarlig. User administration stays gated on `#isAdmin` alone.
  #canManageMusic = $state(false);
  // One in-flight refresh shared by every 401 that races for it — the grant
  // rotates the refresh token, so a second concurrent call would spend an
  // already-consumed token and fail.
  #refreshInFlight: Promise<boolean> | null = null;

  constructor() {
    if (browser) {
      this.#isAuthenticated = this.accessToken !== null;
      this.#isAdmin = localStorage.getItem(IS_ADMIN_KEY) === "true";
      this.#canManageMusic =
        localStorage.getItem(CAN_MANAGE_MUSIC_KEY) === "true";
    }
  }

  get isAuthenticated(): boolean {
    return this.#isAuthenticated;
  }

  get isAdmin(): boolean {
    return this.#isAdmin;
  }

  get canManageMusic(): boolean {
    return this.#canManageMusic;
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

  get refreshToken(): string | null {
    if (!browser) return null;
    const token = localStorage.getItem(REFRESH_TOKEN_KEY);
    return token && token !== "undefined" ? token : null;
  }

  get lastUserName(): string | null {
    return browser ? localStorage.getItem(LAST_USER_NAME_KEY) : null;
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ success: boolean; message: string }> {
    localStorage.setItem(LAST_USER_NAME_KEY, email);

    // Success is the presence of a token, not the absence of an error field:
    // the failure body carries neither `access_token` nor a `message`.
    const data = await requestToken(email, password);
    if (data.access_token) {
      this.#storeTokens(data);
      this.#isAuthenticated = true;
      await this.loadRoles();
      return { success: true, message: "" };
    }

    this.#isAuthenticated = false;
    return { success: false, message: loginFailureMessage(data) };
  }

  /**
   * Renew an expired access token using the stored refresh token, single-flight
   * so racing 401s share one rotation. Returns whether a fresh token is now in
   * place — the shared client uses that to decide between retrying the request
   * and ending the session. Never throws.
   */
  refreshSession(): Promise<boolean> {
    this.#refreshInFlight ??= this.#doRefresh().finally(() => {
      this.#refreshInFlight = null;
    });
    return this.#refreshInFlight;
  }

  async #doRefresh(): Promise<boolean> {
    const token = this.refreshToken;
    if (!this.#isAuthenticated || !token) return false;

    const data = await refreshTokens(token).catch(() => null);
    if (data?.access_token) {
      this.#storeTokens(data);
      return true;
    }
    return false;
  }

  #storeTokens(data: TokenResponse): void {
    if (!browser) return;
    if (data.access_token)
      localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
    // The refresh grant rotates the pair, so persist the new refresh token too.
    if (data.refresh_token)
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
  }

  /** Refresh the cached role flags from `/users/me`. */
  async loadRoles(): Promise<void> {
    const token = this.accessToken;
    const roles = token ? await fetchRoles(token) : [];

    this.#isAdmin = includesRole(roles, ADMIN_ROLE);
    this.#canManageMusic = MANAGE_MUSIC_ROLES.some((role) =>
      includesRole(roles, role),
    );

    if (browser) {
      localStorage.setItem(IS_ADMIN_KEY, String(this.#isAdmin));
      localStorage.setItem(CAN_MANAGE_MUSIC_KEY, String(this.#canManageMusic));
    }
  }

  /**
   * Signs the user out at their own request. Hard-navigates to /login rather
   * than an SPA `goto`: flipping the reactive auth flags in place would remount
   * the current page — re-running its onMount data fetch — in the layout's
   * signed-out branch before we leave, firing a request that can only 401.
   * Clearing storage and reloading lets a fresh AuthState read the signed-out
   * state cleanly (and drops all in-memory session state for free).
   */
  logout(): void {
    this.#clearStoredSession();
    if (browser) window.location.assign(LOGIN_PATH);
  }

  /**
   * Ends a session the API has stopped accepting. Reached only once a refresh
   * has already been tried and failed (or there was no refresh token), so an
   * expired session here can only mean signing in again — but the login screen
   * is told why, otherwise the user is dropped out of whatever they were doing
   * with no explanation.
   *
   * Every concurrent 401 lands here, so only the first still has a session to
   * end; the rest would otherwise each queue their own navigation.
   */
  endExpiredSession(): void {
    if (!this.#isAuthenticated) return;
    this.#clearSession();
    goto(`${LOGIN_PATH}?${SESSION_EXPIRED_PARAM}=1`);
  }

  /** Wipes the persisted session (tokens + admin flag), leaving state alone. */
  #clearStoredSession(): void {
    if (!browser) return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(IS_ADMIN_KEY);
    localStorage.removeItem(CAN_MANAGE_MUSIC_KEY);
  }

  #clearSession(): void {
    this.#clearStoredSession();
    this.#isAuthenticated = false;
    this.#isAdmin = false;
    this.#canManageMusic = false;
  }
}

export const auth = new AuthState();
