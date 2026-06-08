import { browser } from "$app/environment";
import { goto } from "$app/navigation";
import { fetchIsAdmin, requestToken, type TokenResponse } from "$lib/api/auth";

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
      const token = localStorage.getItem("access_token");
      this.#isAuthenticated = !!token && token !== "undefined";
      this.#isAdmin = localStorage.getItem("isAdmin") === "true";
    }
  }

  get isAuthenticated(): boolean {
    return this.#isAuthenticated;
  }

  get isAdmin(): boolean {
    return this.#isAdmin;
  }

  get lastUserName(): string | null {
    return browser ? localStorage.getItem("lastUserName") : null;
  }

  async login(email: string, password: string): Promise<TokenResponse> {
    localStorage.setItem("lastUserName", email);

    const data = await requestToken(email, password);

    if (data.access_token) {
      localStorage.setItem("access_token", data.access_token);
      this.#isAuthenticated = true;
      await this.checkAdmin();
    } else {
      this.#isAuthenticated = false;
    }

    return data;
  }

  async checkAdmin(): Promise<void> {
    const token = localStorage.getItem("access_token");
    if (!token || token === "undefined") {
      this.#isAdmin = false;
      return;
    }

    const admin = await fetchIsAdmin(token);
    this.#isAdmin = admin;
    localStorage.setItem("isAdmin", String(admin));
  }

  logout(): void {
    if (browser) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("isAdmin");
    }
    this.#isAuthenticated = false;
    this.#isAdmin = false;
    goto("/login");
  }
}

export const auth = new AuthState();
