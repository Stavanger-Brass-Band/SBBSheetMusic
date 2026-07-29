import { users } from "$lib/api/users";
import { asPasswordRequirements } from "$lib/password";
import type { PasswordRequirements } from "$lib/types";

/**
 * The password policy the API enforces, fetched once and shared by every screen
 * that sets a password (user create, user editor, password reset).
 *
 * It is read from the API rather than hardcoded because the endpoint exists for
 * exactly that reason: the policy is derived from the server's configuration, so
 * a checklist built from it cannot drift from what is actually enforced. When
 * the fetch fails `requirements` stays null and the forms defer to the API's
 * verdict instead of guessing.
 */
class PasswordPolicyState {
  requirements = $state<PasswordRequirements | null>(null);

  /** Shared between concurrent callers, so two forms mounting fetch once. */
  #pendingLoad: Promise<void> | null = null;

  /**
   * Loads the policy unless it is already in hand. Safe to call from every
   * form: the first call fetches and the rest await the same request. A failure
   * is not cached, so the next form to mount retries.
   */
  load(): Promise<void> {
    if (this.requirements) return Promise.resolve();

    this.#pendingLoad ??= users
      .passwordRequirements()
      .then((response) => {
        this.requirements = asPasswordRequirements(response);
      })
      .catch(() => {
        // Deliberately left null — the forms then let the API be the judge.
      })
      .finally(() => {
        this.#pendingLoad = null;
      });

    return this.#pendingLoad;
  }

  /**
   * Adopts the policy echoed back by a rejection. Without this, a policy
   * tightened since the page loaded would leave the user with an all-green
   * checklist beside an error they have no way to act on.
   */
  applyFromRejection(requirements: PasswordRequirements | null): void {
    if (requirements) this.requirements = requirements;
  }
}

export const passwordPolicy = new PasswordPolicyState();
