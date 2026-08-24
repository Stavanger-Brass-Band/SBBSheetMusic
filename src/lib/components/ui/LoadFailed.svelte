<script lang="ts">
  import { browser } from "$app/environment";
  import { RotateCcw, TriangleAlert, WifiOff } from "@lucide/svelte";
  import Button from "./Button.svelte";
  import EmptyState from "./EmptyState.svelte";

  /**
   * The dead end a reader can do something about: a load that failed, with the
   * button to try it again.
   *
   * Every one of these used to end in "Last siden på nytt for å prøve igjen" —
   * the remedy described but not offered, leaving the reader to work out that the
   * sentence was an instruction, and costing them the whole page and their scroll
   * position when they followed it. Retrying the one request that failed is both
   * cheaper and the thing they were going to do anyway.
   *
   * Deliberately *not* for a refusal. A 403 is not a state a retry can change, so
   * the "ingen tilgang" branches keep their plain `EmptyState` — offering a
   * button there would invite a reader to press it until they gave up.
   */
  let {
    title,
    description = "",
    onretry,
  }: {
    title: string;
    /** Why it failed, for the ordinary case. Replaced when the reader is offline. */
    description?: string;
    /** Runs the failed load again. Awaited, so the button can show progress. */
    onretry: () => void | Promise<void>;
  } = $props();

  /**
   * Whether the browser says there is no connection.
   *
   * `navigator.onLine` only tells the truth in one direction: `false` is reliably
   * offline, while `true` means no more than that some interface exists — a
   * captive portal or a dead router still reads as online. So it is used to *add*
   * a reason when it is certain of one, never to withhold the retry. Kept live
   * rather than read once: a reader who reconnects while looking at this should
   * see the message stop blaming their connection.
   */
  let offline = $state(browser ? !navigator.onLine : false);
  let retrying = $state(false);

  async function retry() {
    retrying = true;
    try {
      await onretry();
    } finally {
      // A successful retry unmounts this along with the failure state it belongs
      // to, which makes the assignment a no-op rather than a problem.
      retrying = false;
    }
  }
</script>

<svelte:window
  ononline={() => (offline = false)}
  onoffline={() => (offline = true)}
/>

<EmptyState
  {title}
  description={offline
    ? "Du er ikke koblet til nettet. Sjekk forbindelsen og prøv igjen."
    : description}
>
  {#snippet icon()}
    {#if offline}
      <WifiOff size={28} strokeWidth={1.6} />
    {:else}
      <TriangleAlert size={28} strokeWidth={1.6} />
    {/if}
  {/snippet}
  {#snippet action()}
    <Button variant="secondary" loading={retrying} onclick={retry}>
      {#if !retrying}<RotateCcw size={16} />{/if}
      Prøv igjen
    </Button>
  {/snippet}
</EmptyState>
