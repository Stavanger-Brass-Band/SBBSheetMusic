<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { Mail, Lock, ArrowRight } from "@lucide/svelte";
  import { auth } from "$lib/stores/auth.svelte";
  import { Input, Button } from "$lib/components/ui";

  let email = $state(auth.lastUserName ?? "");
  let password = $state("");
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

    if (response.message) {
      loginErrorMessage = response.message;
    } else {
      goto("/");
    }
  }
</script>

<div class="login">
  <!-- Brand panel (tuxedo) -->
  <div class="brand">
    <img class="texture" src="/img/music-notes.png" alt="" />
    <img
      class="logo"
      src="/img/logo.jpg"
      alt="Stavanger Brass Band"
      width="92"
      height="92"
    />
    <div class="hero">
      <div class="poster">
        Musikk på<br /><span class="accent">øverste hylle</span>
      </div>
      <p class="lede">
        Medlemssiden for Stavanger Brass Band. Her finner du alle noter
        tilhørende korpsets aktive prosjekter.
      </p>
    </div>
  </div>

  <!-- Form panel -->
  <div class="form-panel">
    <form onsubmit={doLogin} class="form">
      <img
        class="mobile-logo"
        src="/img/logo.jpg"
        alt="SBB"
        width="64"
        height="64"
      />
      <div>
        <div class="sbb-overline">Medlemsinnlogging</div>
        <h1 class="sbb-h2 title">Logg på</h1>
      </div>

      <Input
        label="Epost"
        type="email"
        value={email}
        oninput={(e) => (email = (e.currentTarget as HTMLInputElement).value)}
        placeholder="Skriv inn epost"
      >
        {#snippet icon()}<Mail size={16} />{/snippet}
      </Input>

      <Input
        label="Passord"
        type="password"
        value={password}
        oninput={(e) =>
          (password = (e.currentTarget as HTMLInputElement).value)}
        placeholder="Skriv inn passord"
      >
        {#snippet icon()}<Lock size={16} />{/snippet}
      </Input>

      {#if loginErrorMessage.length > 0}
        <div class="error">{loginErrorMessage}</div>
      {/if}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        block
        loading={isLoggingIn}
      >
        Logg på
        {#if !isLoggingIn}<ArrowRight size={17} />{/if}
      </Button>
    </form>
  </div>
</div>

<style>
  .login {
    display: grid;
    grid-template-columns: 1fr 1fr;
    min-height: 100vh;
  }
  .brand {
    position: relative;
    background: var(--black);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 56px 56px 48px;
    overflow: hidden;
  }
  .texture {
    position: absolute;
    bottom: -20px;
    left: -40px;
    width: 120%;
    opacity: 0.08;
    filter: invert(1);
    pointer-events: none;
  }
  .logo {
    border-radius: 12px;
    position: relative;
  }
  .hero {
    position: relative;
  }
  .poster {
    font-family: var(--font-display);
    text-transform: uppercase;
    color: var(--white);
    font-weight: 700;
    font-size: 52px;
    line-height: 0.95;
    letter-spacing: 0.01em;
  }
  .poster .accent {
    color: var(--brass-500);
  }
  .lede {
    font-family: var(--font-text);
    color: var(--gray-400);
    font-size: 15px;
    max-width: 380px;
    margin-top: 20px;
    line-height: 1.6;
  }
  .form-panel {
    background: var(--surface-card);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
  }
  .form {
    width: 100%;
    max-width: 360px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .mobile-logo {
    display: none;
    border-radius: 12px;
  }
  .sbb-overline {
    margin-bottom: 8px;
    color: var(--text-muted);
  }
  .title {
    margin: 0;
  }
  .error {
    font-family: var(--font-text);
    font-size: 14px;
    color: var(--danger);
    background: var(--danger-soft);
    border-radius: var(--radius-sm);
    padding: 10px 14px;
  }

  @media (max-width: 900px) {
    .login {
      grid-template-columns: 1fr;
    }
    .brand {
      display: none;
    }
    .mobile-logo {
      display: block;
      margin: 0 auto 8px;
    }
  }
</style>
