<script>
  import auth from "../authentication.js";
  import { isAdmin } from "../store";

  function logout() {
    auth.logout();
  }
</script>

<style>
  img {
    margin-right: 10px;
  }
</style>

<header>
  <nav class="navbar navbar-dark navbar-expand-lg fixed-top bg-dark">
    <div class="container">
      <a class="navbar-brand" href="#/">
        <img src="img/logo.jpg" width="30" height="30" alt="SBB-logo" />
        Notearkiv - SBB
      </a>

      {#if $isAdmin}
        <button
          class="navbar-toggler"
          type="button"
          data-toggle="collapse"
          data-target="#navbar"
          aria-controls="navbar"
          aria-expanded="false"
          aria-label="Toggle navigation">
          <span class="navbar-toggler-icon" />
        </button>
        <div class="collapse navbar-collapse" id="navbar">

          <ul class="navbar-nav mr-auto">

            <li class="nav-item">
              <a class="nav-link" href="#/archive">Arkivliste</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" href="#/projects">Prosjekter</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" href="#/users">Brukere</a>
            </li>
          </ul>
          <button class="btn btn-secondary navbar-right" on:click={logout}>
            Logg ut
          </button>
        </div>
      {:else}
        <button class="btn btn-secondary navbar-right" on:click={logout}>
          Logg ut
        </button>
      {/if}
    </div>
  </nav>
</header>
