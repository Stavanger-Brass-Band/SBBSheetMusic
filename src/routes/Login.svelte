<script>
  import auth from "../authentication.js";
  import { push } from "svelte-spa-router";

  let loginErrorMessage = "";
  let isLoggingIn = false;

  async function doLogin(event) {
    isLoggingIn = true;
    loginErrorMessage = "";
    var response = await auth.login(event);

    isLoggingIn = false;

    if (response.message) {
      loginErrorMessage = response.message;
    }
  }

  if ($auth) {
    push("/");
  }
</script>

<style>
  .login-container {
    margin-top: -80px;
  }

  @media screen and (min-width: 768px) {
    .login-container {
      margin-top: 0;
    }
  }

  .login-card {
    max-width: 465px;
    margin-left: auto;
    margin-right: auto;
    padding: 40px 32px 80px;
  }

  @media screen and (min-width: 465px) {
    .login-card {
      padding: 40px 80px 80px;
    }
  }

  img {
    height: 120px;
    margin-left: auto;
    margin-right: auto;
  }

  h1 {
    text-align: center;
    font-size: 32px;
    margin: 32px;
  }

  #submit-btn {
    margin-top: 30px;
    padding: 10px 30px;
  }
</style>

<div class="login-container">
  <div class="card login-card">
    <img src="img/logo.jpg" alt="SBB-logo" />
    <h1>Logg på</h1>
    <form on:submit|preventDefault={doLogin}>
      <div class="form-group">
        <label for="email">Epost</label>
        <input
          required
          id="email"
          type="email"
          class="form-control"
          name="email"
          placeholder="Skriv inn epost" />
      </div>
      <div class="form-group">
        <label for="password">Passord</label>
        <input
          required
          id="password"
          type="password"
          class="form-control"
          name="password"
          placeholder="Skriv inn passord" />
      </div>

      {#if loginErrorMessage.length > 0}
        <div class="alert alert-dismissible alert-danger">
          {loginErrorMessage}
        </div>
      {/if}
      <button
        id="submit-btn"
        type="submit"
        class="btn btn-primary btn-block"
        disabled={isLoggingIn}>
        Logg på
      </button>
    </form>
  </div>
</div>
