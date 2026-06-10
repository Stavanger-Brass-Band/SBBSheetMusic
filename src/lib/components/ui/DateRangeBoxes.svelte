<script lang="ts">
  import { ArrowRight } from "@lucide/svelte";
  import { formatDayMonth } from "$lib/utils/date";

  // The signature two-box date-range motif: [MMM / DD] → [MMM / DD].
  let { start, end }: { start: string; end: string } = $props();

  let from = $derived(formatDayMonth(start));
  let to = $derived(formatDayMonth(end));
</script>

<div class="daterange">
  <div class="dbox">
    <span class="m">{from.monthShort}</span>
    <span class="d">{from.day}</span>
  </div>
  <span class="arr"><ArrowRight size={18} /></span>
  <div class="dbox">
    <span class="m">{to.monthShort}</span>
    <span class="d">{to.day}</span>
  </div>
</div>

<style>
  .daterange {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .dbox {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 46px;
    border: 1px solid var(--border-subtle);
    border-radius: 5px;
    overflow: hidden;
  }
  .dbox .m {
    width: 100%;
    text-align: center;
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-secondary);
    background: var(--surface-sunken);
    padding: 3px 0;
  }
  .dbox .d {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 20px;
    color: var(--text-primary);
    padding: 3px 0 4px;
    line-height: 1;
  }
  .arr {
    color: var(--text-muted);
    display: inline-flex;
  }
</style>
