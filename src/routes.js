import { wrap } from "svelte-spa-router";

import Login from "./routes/Login.svelte";
import Home from "./routes/Home.svelte";
import SheetMusicList from "./routes/SheetMusicList.svelte";
import SheetMusicSet from "./routes/SheetMusicSet.svelte";
import EditSheetMusicSet from "./routes/EditSheetMusicSet.svelte";
import ProjectList from "./routes/ProjectList.svelte";
import UserList from "./routes/UserList.svelte";
import Project from "./routes/Project.svelte";
import NotFound from "./routes/NotFound.svelte";

export default {
  "/": Home,
  "/login": Login,
  "/archive": SheetMusicList,
  "/set/:id": SheetMusicSet,
  "/set/edit/:id": EditSheetMusicSet,
  "/projects": ProjectList,
  "/project/:id": Project,
  "/users": UserList,
  "*": NotFound,
};
