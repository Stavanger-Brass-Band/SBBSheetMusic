import { writable, get } from "svelte/store";
import { push } from "svelte-spa-router";

const auth = writable(
  localStorage.getItem("access_token") &&
    localStorage.getItem("access_token") !== "undefined"
    ? true
    : false
);

export default {
  subscribe: auth.subscribe,
  login: async (event) => {
    const email = event.target.email.value;
    const password = event.target.password.value;

    var result = await fetch("https://sheetmusic-api.azurewebsites.net/token", {
      method: "POST",
      body: `grant_type=password&username=${email}&password=${password}`,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    var data = await result.json();

    if (data.access_token) {
      localStorage.setItem("access_token", data.access_token);
      auth.set(true);
      push("/");
      return data;
    } else {
      auth.set(false);
      return data;
    }
  },
  logout: () => {
    localStorage.removeItem("access_token");
    auth.set(false);
    push("/login");
  },
  authenticated: () => get(auth),
};
