<script>
  import moment from "moment";
  import Icon from "fa-svelte";
  import { faArrowRight } from "@fortawesome/free-solid-svg-icons";

  export let fromDate;
  export let toDate;
</script>

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

<div class="dateview-container">
  <div class="dateview">
    <div class="dateview-month">{moment(fromDate).format('MMM')}</div>
    <div class="dateview-date">{moment(fromDate).format('DD')}</div>
  </div>

  <div class="arrow-icon">
    <Icon icon={faArrowRight} />
  </div>

  <div class="dateview">
    <div class="dateview-month">{moment(toDate).format('MMM')}</div>
    <div class="dateview-date">{moment(toDate).format('DD')}</div>
  </div>
</div>
