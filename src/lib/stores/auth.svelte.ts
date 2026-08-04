import { browser } from "$app/environment";
import { goto } from "$app/navigation";
import {
  fetchRoles,
  refreshTokens,
  requestToken,
  type RolesResult,
  type TokenResponse,
} from "$lib/api/auth";
import {
  ADMIN_ROLE,
  MANAGE_MUSIC_ROLES,
  MANAGE_PROJECTS_ROLES,
} from "$lib/roles";

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const IS_ADMIN_KEY = "isAdmin";
const CAN_MANAGE_MUSIC_KEY = "canManageMusic";
const CAN_MANAGE_PROJECTS_KEY = "canManageProjects";
const LAST_USER_NAME_KEY = "lastUserName";
const LOGIN_PATH = "/login";

const includesRole = (roles: string[], role: string): boolean =>
  roles.some((held) => held.toLowerCase() === role.toLowerCase());

/** Whether any of `allowed` is held — roles combine, so one match is enough. */
const holdsAnyRole = (roles: string[], allowed: readonly string[]): boolean =>
  allowed.some((role) => includesRole(roles, role));

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
  // Music-catalogue management (sets, parts, categories): Admin or
  // Noteansvarlig. User administration stays gated on `#isAdmin` alone.
  #canManageMusic = $state(false);
  // Project management is its own, wider grant — Prosjektleder holds it without
  // any of the catalogue rights above.
  #canManageProjects = $state(false);
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
      this.#canManageProjects =
        localStorage.getItem(CAN_MANAGE_PROJECTS_KEY) === "true";
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

  get canManageProjects(): boolean {
    return this.#canManageProjects;
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
   * place — callers use that to decide between replaying the request and ending
   * the session. Never throws.
   *
   * `staleToken` is the access token the rejected request actually sent. If the
   * stored one has moved on since, another 401 has already renewed the session
   * and the caller need only replay; rotating again on top of that would spend a
   * perfectly good token pair for nothing. Requests fired together on page load
   * are the ones that race this way — the later 401s land after the first has
   * already finished refreshing.
   */
  refreshSession(staleToken?: string | null): Promise<boolean> {
    const current = this.accessToken;
    if (staleToken && current && current !== staleToken)
      return Promise.resolve(true);

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

  /**
   * Refresh the cached role flags from `/users/me`.
   *
   * The read is retried once behind a token renewal, because the first request
   * of a returning session routinely meets an expired access token while the
   * refresh token is still good. `/users/me` doesn't go through the shared
   * client, so nothing else would retry it: the roles came back empty and every
   * role-gated control — the admin nav links most visibly — stayed hidden until
   * the next full page load.
   *
   * Flags are rewritten only from an answer we actually got. An empty `roles`
   * array is such an answer and rightly demotes, but a read that failed leaves
   * the values cached from the last successful one — otherwise a single flaky
   * request strips the user's access from the UI, and persists that.
   */
  async loadRoles(): Promise<void> {
    const sentWith = this.accessToken;
    let result = await this.#readRoles(sentWith);

    if (
      result.status === "unauthorized" &&
      (await this.refreshSession(sentWith))
    ) {
      result = await this.#readRoles(this.accessToken);
    }

    if (result.status === "ok") {
      this.#applyRoles(result.roles);
      return;
    }

    // A token the API still rejects once a refresh has been spent is done —
    // the same conclusion the shared client draws for any other request.
    if (result.status === "unauthorized") this.endExpiredSession();
  }

  /** One `/users/me` read with the given token, or `unauthorized` if none. */
  async #readRoles(token: string | null): Promise<RolesResult> {
    return token ? fetchRoles(token) : { status: "unauthorized" };
  }

  #applyRoles(roles: string[]): void {
    this.#isAdmin = includesRole(roles, ADMIN_ROLE);
    this.#canManageMusic = holdsAnyRole(roles, MANAGE_MUSIC_ROLES);
    this.#canManageProjects = holdsAnyRole(roles, MANAGE_PROJECTS_ROLES);

    if (browser) {
      localStorage.setItem(IS_ADMIN_KEY, String(this.#isAdmin));
      localStorage.setItem(CAN_MANAGE_MUSIC_KEY, String(this.#canManageMusic));
      localStorage.setItem(
        CAN_MANAGE_PROJECTS_KEY,
        String(this.#canManageProjects),
      );
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

  /** Wipes the persisted session (tokens + role flags), leaving state alone. */
  #clearStoredSession(): void {
    if (!browser) return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(IS_ADMIN_KEY);
    localStorage.removeItem(CAN_MANAGE_MUSIC_KEY);
    localStorage.removeItem(CAN_MANAGE_PROJECTS_KEY);
  }

  #clearSession(): void {
    this.#clearStoredSession();
    this.#isAuthenticated = false;
    this.#isAdmin = false;
    this.#canManageMusic = false;
    this.#canManageProjects = false;
  }
}

export const auth = new AuthState();
