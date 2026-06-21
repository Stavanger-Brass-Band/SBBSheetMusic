<script lang="ts">
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { ArrowLeft, Music } from "@lucide/svelte";
  import { Button } from "$lib/components/ui";

  let status = $derived(page.status);
  let isNotFound = $derived(status === 404);

  let heading = $derived(
    isNotFound ? "Denne noten står ikke i arkivet" : "Noe gikk galt",
  );
  let description = $derived(
    isNotFound
      ? "Vi fant ikke siden du lette etter. Den kan ha blitt flyttet, eller så finnes den rett og slett ikke."
      : (page.error?.message ?? "En uventet feil oppstod. Prøv igjen om litt."),
  );
</script>

<div class="error-page">
  <span class="icon"><Music size={40} strokeWidth={1.6} /></span>
  <span class="status sbb-overline">Feil {status}</span>
  <h1 class="sbb-h1 heading">{heading}</h1>
  <p class="desc">{description}</p>
  <Button onclick={() => goto("/")}>
    <ArrowLeft size={17} /> Tilbake til Hjem
  </Button>
</div>

<style>
  .error-page {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 14px;
    min-height: 70vh;
    max-width: 520px;
    margin: 0 auto;
    padding: 0 24px;
  }
  .icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 84px;
    height: 84px;
    border-radius: var(--radius-full);
    color: var(--accent);
    background: var(--accent-soft);
    margin-bottom: 6px;
  }
  .status {
    color: var(--text-muted);
  }
  .heading {
    margin: 0;
    font-size: 38px;
  }
  .desc {
    margin: 0 0 10px;
    font-size: 16px;
    line-height: 1.6;
    color: var(--text-secondary);
  }
</style>
