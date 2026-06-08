<script lang="ts">
  // Signature "stacked sheet-music" card: a white sheet with a folded black
  // corner and a faint notes texture, sitting like a small stack of paper.
  let {
    title = "",
    composer = "",
    arranger = "",
    art = "/img/music-notes.png",
    href = "#",
  }: {
    title?: string | null;
    composer?: string | null;
    arranger?: string | null;
    art?: string;
    href?: string;
  } = $props();
</script>

<a class="set-card" {href}>
  <span class="corner"></span>
  {#if art}<img class="texture" src={art} alt="" />{/if}
  <div class="title-wrap">
    <div class="title">{title}</div>
  </div>
  {#if composer || arranger}
    <div class="meta">
      {#if composer}<div>{composer}</div>{/if}
      {#if arranger}<div>Arr. {arranger}</div>{/if}
    </div>
  {/if}
</a>

<style>
  .set-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    width: 100%;
    aspect-ratio: 1 / 1.3;
    background: var(--white);
    color: var(--ink-900);
    text-decoration: none;
    outline: none;
    box-shadow: var(--shadow-paper);
    transition:
      box-shadow var(--dur-slow) var(--ease-out),
      transform var(--dur-slow) var(--ease-out);
    overflow: hidden;
  }
  .set-card:hover {
    box-shadow: var(--shadow-paper-hover);
    transform: translateY(-4px);
  }
  .corner {
    position: absolute;
    top: 0;
    right: 0;
    border-style: solid;
    border-width: 20px;
    border-color: var(--ink-900) var(--ink-900) rgba(255, 255, 255, 0.35)
      rgba(255, 255, 255, 0.35);
    box-shadow: -3px 3px 5px rgba(0, 0, 0, 0.18);
    transition: border-width var(--dur-slow) var(--ease-out);
  }
  .set-card:hover .corner {
    border-width: 26px;
  }
  .texture {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    opacity: 0.16;
    pointer-events: none;
  }
  .title-wrap {
    padding: 0 24px;
    z-index: 1;
  }
  .title {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 22px;
    line-height: 1.08;
    text-underline-offset: 3px;
  }
  .set-card:hover .title {
    text-decoration: underline;
  }
  .meta {
    position: absolute;
    bottom: 18px;
    left: 16px;
    right: 16px;
    padding-top: 8px;
    border-top: 1px solid var(--gray-200);
    font-family: var(--font-text);
    font-size: 12px;
    color: var(--gray-500);
    z-index: 1;
  }
</style>
