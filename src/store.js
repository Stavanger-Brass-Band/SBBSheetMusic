import { writable } from "svelte/store";

export const baseUrl = "https://sheetmusic-api.azurewebsites.net";
export const isAuthenticated = writable(
  localStorage.getItem("access_token") &&
    localStorage.getItem("access_token") !== "undefined"
    ? true
    : false
);
export const isAdmin = writable(false);
