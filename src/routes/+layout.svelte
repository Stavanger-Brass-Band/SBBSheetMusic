<script lang="ts">
  import "../app.css";
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { auth } from "$lib/stores/auth.svelte";
  import Header from "$lib/components/Header.svelte";

  let { children } = $props();

  // Client-side auth gate (replaces the old App.svelte onMount redirect).
  onMount(async () => {
    if (auth.isAuthenticated) {
      await auth.checkAdmin();
    } else if (page.url.pathname !== "/login") {
      goto("/login");
    }
  });
</script>

{#if auth.isAuthenticated}
  <Header />
  <main class="page">
    {@render children()}
  </main>
{:else}
  {@render children()}
{/if}

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
