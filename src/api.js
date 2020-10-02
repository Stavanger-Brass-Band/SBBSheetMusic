import auth from "./authentication.js";

const baseUrl = "https://sheetmusic-api.azurewebsites.net";

const getAuthorizationHeader = () => {
  return "Bearer " + localStorage.getItem("access_token");
};

const get = async (url) => {
  var result = await fetch(baseUrl + url, {
    method: "GET",
    headers: { Authorization: getAuthorizationHeader() },
  });

  if (result.status === 401) {
    auth.logout();
    return;
  }

  var data = await result.json();
  return data;
};

const getMultiple = async (urls) => {
  var result = await Promise.all(
    urls.map((url) =>
      fetch(baseUrl + url, {
        method: "GET",
        headers: { Authorization: getAuthorizationHeader() },
      }).then((res) => res.json())
    )
  );

  return result;
};

const getPaginated = async () => {};

const post = async (url, data) => {
  var result = await fetch(baseUrl + url, {
    method: "POST",
    body: JSON.stringify(data),
    headers: {
      Authorization: getAuthorizationHeader(),
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  if (result.status === 401) {
    auth.logout();
    return;
  }
  var data = await result.json();
  return data;
};

const postFile = async (url, file) => {
  let formData = new FormData();

  formData.append("file", file);
  var result = await fetch(baseUrl + url, {
    method: "POST",
    body: formData,
    headers: {
      Authorization: getAuthorizationHeader(),
    },
  });

  if (result.status === 401) {
    auth.logout();
    return;
  }
  if (result.status === 200) return { success: true };

  if (result.status === 409) {
    const string = await result.text();
    return string === "" ? {} : JSON.parse(string);
  }
};

const put = async (url, data) => {
  var result = await fetch(baseUrl + url, {
    method: "PUT",
    body: JSON.stringify(data),
    headers: {
      Authorization: getAuthorizationHeader(),
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  if (result.status === 401) {
    auth.logout();
    return;
  }
  var data = await result.json();
  return data;
};

const deleteSingle = async (url, data) => {
  var headers = {
    Authorization: getAuthorizationHeader(),
  };

  var options = {
    method: "DELETE",
    headers: headers,
  };

  if (data) {
    headers["Accept"] = "application/json";
    headers["Content-Type"] = "application/json";
    options["body"] = JSON.stringify(data);
  }

  var result = await fetch(baseUrl + url, options);

  if (result.status === 401) {
    auth.logout();
    return;
  }
  return result;
};

export {
  baseUrl,
  get,
  getMultiple,
  getPaginated,
  post,
  postFile,
  put,
  deleteSingle,
};
