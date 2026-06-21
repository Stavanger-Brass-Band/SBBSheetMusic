<script lang="ts">
  import "../app.css";
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { ThemeProvider } from "flowbite-svelte";
  import { auth } from "$lib/stores/auth.svelte";
  import Header from "$lib/components/Header.svelte";
  import { pageFade } from "$lib/utils/motion";

  let { children } = $props();

  // App-wide Flowbite overrides: all dialog (Modal) footers right-align their
  // actions.
  const flowbiteTheme = { modal: { footer: "justify-end" } };

  // Client-side auth gate (replaces the old App.svelte onMount redirect).
  onMount(async () => {
    if (auth.isAuthenticated) {
      await auth.checkAdmin();
    } else if (page.url.pathname !== "/login") {
      goto("/login");
    }
  });
</script>

<ThemeProvider theme={flowbiteTheme}>
  {#if auth.isAuthenticated}
    <Header />
    {#key page.url.pathname}
      <main class="page" in:fade={pageFade()}>
        {@render children()}
      </main>
    {/key}
  {:else}
    {@render children()}
  {/if}
</ThemeProvider>

<style>
  .page {
    max-width: var(--container-max);
    margin: 0 auto;
    padding: calc(var(--header-height) + 24px) 24px 96px;
  }

  @media (max-width: 768px) {
    .page {
      padding-top: 96px;
    }
  }
</style>
