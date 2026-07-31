<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { Lock, Check, ArrowRight, AlertTriangle } from "@lucide/svelte";
  import { users as usersApi } from "$lib/api/users";
  import {
    isPasswordAcceptable,
    readPasswordRejection,
    type PasswordRuleKey,
  } from "$lib/password";
  import { passwordPolicy } from "$lib/stores/passwordPolicy.svelte";
  import PasswordChecklist from "$lib/components/PasswordChecklist.svelte";

  // The reset link is expected to carry `email` + `token` as query params.
  // (Exact param names/encoding are an assumption pending backend confirmation.)
  const email = $derived(page.url.searchParams.get("email") ?? "");
  const token = $derived(page.url.searchParams.get("token") ?? "");
  const hasValidLink = $derived(!!email && !!token);

  let newPassword = $state("");
  let confirmPassword = $state("");
  let sending = $state(false);
  let done = $state(false);
  let errorMessage = $state("");
  let rejectedPasswordRules = $state<PasswordRuleKey[]>([]);

  const canSubmit = $derived(
    isPasswordAcceptable(newPassword, passwordPolicy.requirements) &&
      newPassword === confirmPassword,
  );

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    sending = true;
    errorMessage = "";
    rejectedPasswordRules = [];
    const response = await usersApi.resetPassword({
      email,
      token,
      newPassword,
    });
    sending = false;
    if (response.ok) {
      done = true;
      return;
    }

    // Two very different failures share this path, and telling someone their
    // link expired when the password was the problem sends them round in a
    // circle for a new link that will fail the same way.
    const rejection = await readPasswordRejection(response);
    if (rejection) {
      passwordPolicy.applyFromRejection(rejection.requirements);
      rejectedPasswordRules = rejection.failedRules;
      errorMessage = "Passordet oppfyller ikke kravene.";
    } else {
      errorMessage =
        "Kunne ikke tilbakestille passordet. Lenken kan være utløpt — be om en ny.";
    }
  }
</script>

<div class="screen">
  <div class="card">
    <img class="logo" src="/img/logo.jpg" alt="Stavanger Brass Band" />

    {#if done}
      <span class="ok-ico"><Check size={26} /></span>
      <h1>Passordet er oppdatert</h1>
      <p class="lede">Du kan nå logge på med det nye passordet.</p>
      <button class="btn" type="button" onclick={() => goto("/login")}>
        <span>Til innlogging</span><ArrowRight size={18} />
      </button>
    {:else if !hasValidLink}
      <span class="warn-ico"><AlertTriangle size={26} /></span>
      <h1>Ugyldig lenke</h1>
      <p class="lede">
        Lenken mangler nødvendig informasjon. Be om en ny lenke fra
        innloggingssiden.
      </p>
      <button class="btn" type="button" onclick={() => goto("/login")}>
        <span>Til innlogging</span><ArrowRight size={18} />
      </button>
    {:else}
      <h1>Sett nytt passord</h1>
      <p class="lede">Velg et nytt passord for <b>{email}</b>.</p>

      <form onsubmit={submit}>
        <div class="field">
          <label for="newPassword">Nytt passord</label>
          <div class="control">
            <span class="ico"><Lock size={17} /></span>
            <input
              id="newPassword"
              type="password"
              required
              placeholder="Skriv inn nytt passord"
              bind:value={newPassword}
            />
          </div>
          <PasswordChecklist
            password={newPassword}
            rejectedRules={rejectedPasswordRules}
          />
        </div>
        <div class="field">
          <label for="confirmPassword">Bekreft passord</label>
          <div class="control">
            <span class="ico"><Lock size={17} /></span>
            <input
              id="confirmPassword"
              type="password"
              required
              placeholder="Gjenta nytt passord"
              bind:value={confirmPassword}
            />
          </div>
        </div>

        {#if confirmPassword && newPassword !== confirmPassword}
          <p class="mismatch">Passordene er ikke like.</p>
        {/if}
        {#if errorMessage}
          <div class="error">{errorMessage}</div>
        {/if}

        <button class="btn" type="submit" disabled={sending || !canSubmit}>
          {#if sending}
            <span class="spin"></span><span>Lagrer…</span>
          {:else}
            <span>Lagre nytt passord</span><Check size={18} />
          {/if}
        </button>
      </form>
    {/if}
  </div>
</div>

<style>
  .screen {
    /* See the login page: `vh` on iOS is the toolbars-retracted height, which
       shifts a centred card down out of view. */
    min-height: 100vh;
    min-height: 100svh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px;
    background: var(--surface-page);
  }
  .card {
    width: 100%;
    max-width: 420px;
    padding: 40px;
    background: var(--surface-card);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    text-align: center;
  }
  .logo {
    width: 56px;
    height: 56px;
    border-radius: var(--radius-md);
    margin-bottom: 20px;
  }
  h1 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 28px;
    font-weight: 600;
    color: var(--text-primary);
  }
  .lede {
    margin: 10px 0 24px;
    font-size: 14px;
    line-height: 1.55;
    color: var(--text-secondary);
  }
  .ok-ico,
  .warn-ico {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 52px;
    height: 52px;
    border-radius: 999px;
    margin-bottom: 16px;
  }
  .ok-ico {
    color: var(--success);
    background: var(--success-soft);
  }
  .warn-ico {
    color: var(--danger);
    background: var(--danger-soft);
  }

  form {
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }
  .field label {
    font-weight: 600;
    font-size: 13px;
    color: var(--text-primary);
  }
  .control {
    position: relative;
    display: flex;
    align-items: center;
  }
  .control .ico {
    position: absolute;
    left: 14px;
    display: flex;
    color: var(--text-muted);
    pointer-events: none;
  }
  .control input {
    width: 100%;
    height: 48px;
    padding: 0 16px 0 42px;
    font-family: var(--font-text);
    font-size: 15px;
    color: var(--text-primary);
    background: var(--surface-sunken);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-sm);
    outline: none;
    transition:
      border-color var(--dur-fast) var(--ease-out),
      box-shadow var(--dur-fast) var(--ease-out);
  }
  .control input:focus {
    border-color: var(--accent);
    box-shadow: var(--ring-focus);
  }
  .mismatch {
    margin: -6px 0 0;
    font-size: 12.5px;
    color: var(--danger);
  }
  .error {
    font-size: 14px;
    color: var(--danger);
    background: var(--danger-soft);
    border-radius: var(--radius-sm);
    padding: 10px 14px;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    height: 50px;
    width: 100%;
    font-family: var(--font-text);
    font-weight: 600;
    font-size: 15px;
    color: var(--accent-on);
    background: var(--accent);
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: background var(--dur-fast) var(--ease-out);
  }
  .btn:hover {
    background: var(--accent-hover);
  }
  .btn[disabled] {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .btn .spin {
    width: 17px;
    height: 17px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.4);
    border-top-color: #fff;
    animation: sbb-spin 0.7s linear infinite;
  }
</style>
