<script lang="ts">
  import { Trash2 } from "@lucide/svelte";

  // Signature "stacked sheet-music" card: a white sheet with a folded black
  // corner and a faint notes texture, sitting like a small stack of paper.
  // When `removable`, a remove button is overlaid (revealed on hover) — used
  // in the project editor; the rest of the card stays a link to `href`.
  let {
    title = "",
    composer = "",
    arranger = "",
    art = "/img/music-notes.png",
    href = "#",
    removable = false,
    onremove,
  }: {
    title?: string | null;
    composer?: string | null;
    arranger?: string | null;
    art?: string;
    href?: string;
    removable?: boolean;
    onremove?: () => void;
  } = $props();
</script>

<div class="set-card">
  <a class="set-card__link" {href} aria-label={title ?? ""}></a>
  <span class="corner"></span>
  {#if art}<img class="texture" src={art} alt="" />{/if}

  {#if removable}
    <button
      type="button"
      class="set-card__rm"
      title="Fjern fra prosjektet"
      aria-label={`Fjern ${title ?? ""}`}
      onclick={(e) => {
        e.preventDefault();
        onremove?.();
      }}
    >
      <Trash2 size={16} />
    </button>
  {/if}

  <div class="title">{title}</div>
  {#if composer || arranger}
    <div class="meta">
      {#if composer}<div>{composer}</div>{/if}
      {#if arranger}<div>Arr. {arranger}</div>{/if}
    </div>
  {/if}
</div>

<style>
  .set-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    width: 100%;
    aspect-ratio: 1 / 1.31;
    background: var(--white);
    color: var(--ink-900);
    box-shadow: var(--shadow-paper);
    overflow: hidden;
    transition:
      box-shadow var(--dur-slow) var(--ease-out),
      transform var(--dur-slow) var(--ease-out);
  }
  .set-card:hover {
    box-shadow: var(--shadow-paper-hover);
    transform: translateY(-4px);
  }
  .set-card__link {
    position: absolute;
    inset: 0;
    z-index: 1;
  }
  .corner {
    position: absolute;
    top: 0;
    right: 0;
    z-index: 2;
    border-style: solid;
    border-width: 20px;
    border-color: var(--ink-900) var(--ink-900) rgba(255, 255, 255, 0.35)
      rgba(255, 255, 255, 0.35);
    box-shadow: -3px 3px 5px rgba(0, 0, 0, 0.18);
    transition: border-width var(--dur-slow) var(--ease-out);
    pointer-events: none;
  }
  .set-card:hover .corner {
    border-width: 26px;
  }
  .texture {
    position: absolute;
    top: 18px;
    left: 0;
    width: 100%;
    opacity: 0.5;
    pointer-events: none;
    z-index: 0;
  }
  .title {
    position: relative;
    z-index: 2;
    padding: 0 24px;
    pointer-events: none;
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 21px;
    line-height: 1.06;
    text-underline-offset: 3px;
  }
  .set-card:hover .title {
    text-decoration: underline;
  }
  .meta {
    position: absolute;
    bottom: 22px;
    left: 20px;
    right: 20px;
    z-index: 2;
    pointer-events: none;
    padding-top: 9px;
    border-top: 1px solid var(--gray-200);
    font-family: var(--font-text);
    font-size: 12px;
    line-height: 1.45;
    color: var(--gray-500);
  }
  .set-card__rm {
    position: absolute;
    top: 12px;
    left: 12px;
    z-index: 3;
    width: 32px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--red-500);
    background: rgba(255, 255, 255, 0.92);
    border: 1px solid var(--gray-200);
    border-radius: 999px;
    cursor: pointer;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.14);
    opacity: 0;
    transform: scale(0.86);
    transition:
      opacity var(--dur-fast),
      transform var(--dur-fast),
      background var(--dur-fast);
  }
  .set-card:hover .set-card__rm,
  .set-card__rm:focus-visible {
    opacity: 1;
    transform: scale(1);
  }
  .set-card__rm:hover {
    background: var(--red-100);
  }
</style>
