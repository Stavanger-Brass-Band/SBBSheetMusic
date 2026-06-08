<script lang="ts">
  import { ArrowRightOutline } from "flowbite-svelte-icons";
  import { formatDayMonth } from "$lib/utils/date";

  let { fromDate, toDate }: { fromDate: string; toDate: string } = $props();

  let from = $derived(formatDayMonth(fromDate));
  let to = $derived(formatDayMonth(toDate));
</script>

<div class="dateview-container">
  <div class="dateview">
    <div class="dateview-month">{from.monthShort}</div>
    <div class="dateview-date">{from.day}</div>
  </div>

  <div class="arrow-icon"><ArrowRightOutline size="md" /></div>

  <div class="dateview">
    <div class="dateview-month">{to.monthShort}</div>
    <div class="dateview-date">{to.day}</div>
  </div>
</div>

<style>
  .dateview-container {
    display: flex;
    align-items: center;
  }

  .dateview {
    border: 2px solid #4e5d6c;
    width: 56px;
    text-align: center;
  }

  .dateview-month {
    background-color: #4e5d6c;
    font-size: 14px;
    text-transform: uppercase;
  }

  .dateview-date {
    font-size: 24px;
    padding: 1px;
  }

  .arrow-icon {
    display: inline;
    font-size: 20px;
    margin-right: 10px;
    margin-left: 10px;
  }
</style>
