import { writable } from "svelte/store";

export let baseUrl = process.env.SVELTE_APP_API_URL; //"https://sheetmusic-api.azurewebsites.net"

export const isAuthenticated = writable(
  localStorage.getItem("access_token") &&
    localStorage.getItem("access_token") !== "undefined"
    ? true
    : false
);

export const isAdmin = writable(localStorage.getItem("isAdmin") ? true : false);

export const musicSets = writable([]);
export const activeProjects = writable([]);

export const timeout = writable(false);
