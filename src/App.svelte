<script>
  import { onMount } from "svelte";
  import Router from "svelte-spa-router";
  import { push } from "svelte-spa-router";
  import active from "svelte-spa-router/active";
  import routes from "./routes";
  import auth from "./authentication";
  import Header from "./components/Header.svelte";
  import moment from "moment";
  import { isAuthenticated } from "./store";
  import { get } from "svelte/store";
  import { baseUrl } from "./store.js";

  baseUrl = process.env.SVELTE_APP_API_URL;

  moment.locale("no", {
    months: [
      "Januar",
      "Februar",
      "Mars",
      "April",
      "Mai",
      "Juni",
      "Juli",
      "August",
      "September",
      "Oktober",
      "November",
      "Desember"
    ],
    monthsShort: [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "Mai",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Okt",
      "Nov",
      "Des"
    ]
  });

  onMount(async () => {
    if (get(isAuthenticated)) {
      auth.checkAdmin();
    } else {
      push("/login");
    }
  });
</script>

<style>
  .main-content {
    padding-top: 90px;
    max-width: 1140px;
    margin: auto;
    padding-bottom: 100px;
  }

  @media screen and (max-width: 575px) {
    .main-content {
      padding-left: 20px;
      padding-right: 20px;
    }
  }
</style>

<div class="container">
  {#if $isAuthenticated}
    <Header />
  {/if}
  <div class="main-content">
    <Router {routes} />
  </div>
</div>
