<script>
  import auth from "../authentication.js";

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
        Notearkiv - Administrator
      </a>
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
            <a class="nav-link" href="#/">Arkivliste</a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="#/projects">Prosjekter</a>
          </li>
          <!-- <li class="nav-item dropdown">
            <a class="nav-link dropdown-toggle" data-toggle="dropdown" href="#" id="baseData" aria-expanded="false">Grunndata</a>
            <div class="dropdown-menu" aria-labelledby="baseData">
                <a class="dropdown-item" href="/projects">Prosjekter</a>
                <a class="dropdown-item" href="/projects">Stemmer</a>
                <a class="dropdown-item" href="/projects">Prosjekter</a>
              </div>
          </li> -->
          <li class="nav-item">
            <a class="nav-link" href="#/users">Brukere</a>
          </li>
        </ul>
        <button class="btn btn-secondary navbar-right" on:click={logout}>
          Logg ut
        </button>
      </div>
    </div>
  </nav>
</header>
