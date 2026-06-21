<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { Mail, Lock, Check, ArrowRight } from "@lucide/svelte";
  import { auth } from "$lib/stores/auth.svelte";

  const CONTACT_URL = "https://www.stavanger-brassband.com/styret";

  let email = $state(auth.lastUserName ?? "");
  let password = $state("");
  let rememberMe = $state(true);
  let loginErrorMessage = $state("");
  let isLoggingIn = $state(false);

  onMount(() => {
    if (auth.isAuthenticated) goto("/");
  });

  async function doLogin(event: SubmitEvent) {
    event.preventDefault();
    isLoggingIn = true;
    loginErrorMessage = "";

    const response = await auth.login(email, password);

    isLoggingIn = false;
    // "Husk meg" controls whether the email is remembered for next time.
    if (!rememberMe) localStorage.removeItem("lastUserName");

    if (response.message) {
      loginErrorMessage = response.message;
    } else {
      goto("/");
    }
  }
</script>

<div class="screen">
  <!-- Brand panel (the tuxedo) -->
  <section class="brand">
    <img class="notes" src="/img/music-notes.png" alt="" />
    <span class="glow"></span>

    <div class="brand__top">
      <img
        class="brand__logo"
        src="/img/logo.jpg"
        alt="Stavanger Brass Band"
        width="64"
        height="64"
      />
      <span class="brand__org">Notearkiv<b>Stavanger Brass Band</b></span>
    </div>

    <div class="brand__center">
      <h1 class="brand__title">Musikk på<br /><em>øverste hylle</em></h1>
      <p class="brand__lead">
        Logg på for å finne alle noter tilhørende korpsets aktive prosjekter —
        klar til øving, konsert og konkurranse.
      </p>
    </div>

    <div class="brand__foot"><span>© Stavanger Brass Band</span></div>
  </section>

  <!-- Form panel -->
  <section class="form-wrap">
    <form class="login" onsubmit={doLogin}>
      <div class="login__head">
        <h1>Logg på</h1>
      </div>

      <div class="field">
        <label for="email">Epost</label>
        <div class="control">
          <span class="ico"><Mail size={17} /></span>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="Skriv inn epost"
            bind:value={email}
          />
        </div>
      </div>

      <div class="field">
        <label for="password">Passord</label>
        <div class="control">
          <span class="ico"><Lock size={17} /></span>
          <input
            id="password"
            name="password"
            type="password"
            required
            placeholder="Skriv inn passord"
            bind:value={password}
          />
        </div>
      </div>

      <div class="row-between">
        <label class="check">
          <input type="checkbox" bind:checked={rememberMe} />
          <span class="box"><Check size={13} /></span>
          Husk meg
        </label>
        <a class="link" href={CONTACT_URL} target="_blank" rel="noreferrer">
          Glemt passord?
        </a>
      </div>

      {#if loginErrorMessage.length > 0}
        <div class="error">{loginErrorMessage}</div>
      {/if}

      <button class="btn" type="submit" disabled={isLoggingIn}>
        {#if isLoggingIn}
          <span class="spin"></span>
          <span>Logger på…</span>
        {:else}
          <span>Logg på</span>
          <ArrowRight size={18} />
        {/if}
      </button>

      <p class="help">
        Ikke medlem enda?
        <a href={CONTACT_URL} target="_blank" rel="noreferrer">
          Ta kontakt med styret
        </a>
      </p>
    </form>
  </section>
</div>

<style>
  .screen {
    display: grid;
    grid-template-columns: 1.08fr 1fr;
    min-height: 100vh;
  }

  /* ---------- Brand panel ---------- */
  .brand {
    position: relative;
    background: var(--black);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: clamp(40px, 5vw, 64px);
    border-right: 1px solid var(--border-inverse);
  }
  .notes {
    position: absolute;
    left: 0;
    bottom: 0;
    width: 90%;
    max-width: 640px;
    opacity: 0.09;
    filter: invert(1) blur(0.5px);
    pointer-events: none;
  }
  .glow {
    position: absolute;
    top: -120px;
    right: -120px;
    width: 360px;
    height: 360px;
    background: radial-gradient(
      circle,
      rgba(234, 91, 12, 0.22),
      transparent 70%
    );
    pointer-events: none;
  }
  .brand__top {
    position: relative;
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .brand__logo {
    border-radius: var(--radius-md);
    display: block;
    box-shadow: var(--shadow-md);
  }
  .brand__org {
    font-family: var(--font-display);
    text-transform: uppercase;
    letter-spacing: var(--tracking-widest);
    font-size: 11px;
    font-weight: 600;
    color: var(--gray-400);
    line-height: 1.5;
  }
  .brand__org b {
    display: block;
    color: var(--white);
    letter-spacing: 0.1em;
    white-space: nowrap;
  }
  .brand__center {
    position: relative;
  }
  .brand__title {
    font-family: var(--font-display);
    text-transform: uppercase;
    font-weight: 700;
    font-size: clamp(48px, 6vw, 76px);
    line-height: 0.92;
    letter-spacing: 0.01em;
    color: var(--white);
    margin: 0;
  }
  .brand__title em {
    font-style: normal;
    color: var(--brass-500);
  }
  .brand__lead {
    margin: 24px 0 0;
    max-width: 400px;
    font-size: 16px;
    line-height: 1.65;
    color: var(--gray-300);
  }
  .brand__foot {
    position: relative;
    display: flex;
    gap: 28px;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--gray-500);
  }

  /* ---------- Form panel ---------- */
  .form-wrap {
    background: var(--surface-card);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
  }
  .login {
    width: 100%;
    max-width: 364px;
    display: flex;
    flex-direction: column;
    gap: 22px;
  }
  .login__head h1 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 40px;
    font-weight: 600;
    letter-spacing: var(--tracking-tight);
    color: var(--text-primary);
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
    height: 50px;
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

  .row-between {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .check {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    font-size: 13px;
    color: var(--text-secondary);
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
  }
  .check input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }
  .check .box {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    border-radius: var(--radius-xs);
    border: 1px solid var(--border-strong);
    background: var(--surface-sunken);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: transparent;
    transition: all var(--dur-fast) var(--ease-out);
  }
  .check input:checked + .box {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }
  .link {
    font-size: 13px;
    color: var(--text-secondary);
    text-decoration: none;
  }
  .link:hover {
    color: var(--accent);
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
    height: 52px;
    width: 100%;
    font-family: var(--font-text);
    font-weight: 600;
    font-size: 16px;
    color: var(--accent-on);
    background: var(--accent);
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
    transition:
      background var(--dur-fast) var(--ease-out),
      transform var(--dur-fast) var(--ease-out);
  }
  .btn:hover {
    background: var(--accent-hover);
  }
  .btn:active {
    background: var(--accent-press);
    transform: translateY(1px);
  }
  .btn[disabled] {
    opacity: 0.6;
    cursor: progress;
  }
  .btn .spin {
    width: 17px;
    height: 17px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.4);
    border-top-color: #fff;
    animation: sbb-spin 0.7s linear infinite;
  }

  .help {
    text-align: center;
    font-size: 13px;
    color: var(--text-muted);
    margin: 0;
  }
  .help a {
    color: var(--text-secondary);
    text-decoration: none;
  }
  .help a:hover {
    color: var(--accent);
  }

  /* ---------- Responsive: single continuous backdrop, form pinned bottom ---------- */
  @media (max-width: 860px) {
    .screen {
      display: flex;
      flex-direction: column;
    }
    .brand {
      border-right: none;
      justify-content: flex-start;
      gap: 32px;
      padding: 40px 32px 0;
    }
    .notes,
    .brand__lead,
    .brand__foot {
      display: none;
    }
    .brand__title {
      font-size: clamp(40px, 11vw, 58px);
    }
    .glow {
      top: -80px;
      right: -90px;
      width: 260px;
      height: 260px;
      background: radial-gradient(
        circle,
        rgba(234, 91, 12, 0.3),
        transparent 70%
      );
    }
    /* form sits on the same black backdrop — no card */
    .form-wrap {
      margin-top: auto;
      background: transparent;
      align-items: stretch;
      justify-content: flex-start;
      padding: 44px 32px 44px;
    }
    .login {
      max-width: none;
      gap: 28px;
    }
    .control input {
      height: 56px;
      padding-left: 46px;
      font-size: 16px;
      background: var(--ink-800);
      border-radius: var(--radius-md);
    }
    .btn {
      height: 56px;
      border-radius: var(--radius-md);
    }
  }

  @media (max-width: 520px) {
    .brand__logo {
      width: 52px;
      height: 52px;
    }
    .login__head h1 {
      font-size: 32px;
    }
  }
</style>
