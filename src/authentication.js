// import { writable, get } from "svelte/store";
import { push } from "svelte-spa-router";
import { isAuthenticated, baseUrl, isAdmin } from "./store";

async function login(event) {
  const email = event.target.email.value;
  const password = event.target.password.value;

  localStorage.setItem("lastUserName", email);

  var result = await fetch(baseUrl + "/token", {
    method: "POST",
    body: `grant_type=password&username=${email}&password=${password}`,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  var data = await result.json();

  if (data.access_token) {
    localStorage.setItem("access_token", data.access_token);
    isAuthenticated.set(true);

    await checkAdmin();

    return data;
  } else {
    isAuthenticated.set(false);
    return data;
  }
}

async function checkAdmin() {
  const access_token = localStorage.getItem("access_token");
  if (!access_token || access_token === "undefined") {
    return false;
  }

  var user = await fetch(baseUrl + "/users/me", {
    method: "GET",
    headers: {
      Authorization: "Bearer " + access_token,
    },
  });

  isAdmin.set(user.status === 200);
  localStorage.setItem("isAdmin", user.status === 200);
}

async function logout() {
  localStorage.removeItem("access_token");
  isAuthenticated.set(false);
  push("/login");
}

const auth = {
  login,
  checkAdmin,
  logout,
};

export default auth;

// const auth = writable(
//   localStorage.getItem("access_token") &&
//     localStorage.getItem("access_token") !== "undefined"
//     ? true
//     : false
// );

// export default {
// login: async (event) => {
//   const email = event.target.email.value;
//   const password = event.target.password.value;

//   var result = await Api.login(email, password);

//   if (result.access_token) {
//     localStorage.setItem("access_token", data.access_token);
//     auth.set(true);
//     push("/");
//     return data;
//   } else {
//     auth.set(false);
//     return data;
//   }
// },
// logout: () => {
//   localStorage.removeItem("access_token");
//   auth.set(false);
//   push("/login");
// },
//   authenticated: () => get(auth),
// };
