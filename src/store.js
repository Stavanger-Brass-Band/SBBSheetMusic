import { writable } from "svelte/store";

export let baseUrl = "https://sheetmusic-api.azurewebsites.net";
export const isAuthenticated = writable(
  localStorage.getItem("access_token") &&
    localStorage.getItem("access_token") !== "undefined"
    ? true
    : false
);
export const isAdmin = writable(localStorage.getItem("isAdmin") ? true : false);
