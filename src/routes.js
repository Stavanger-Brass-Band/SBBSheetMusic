import { wrap } from "svelte-spa-router";

import Login from "./routes/Login.svelte";
import SheetMusicList from "./routes/SheetMusicList.svelte";
import SheetMusicSet from "./routes/SheetMusicSet.svelte";
import ProjectList from "./routes/ProjectList.svelte";
import UserList from "./routes/UserList.svelte";
import Project from "./routes/Project.svelte";
import NotFound from "./routes/NotFound.svelte";

export default {
  "/": SheetMusicList,
  "/login": Login,
  "/set/:id": SheetMusicSet,
  "/projects": ProjectList,
  "/project/:id": Project,
  "/users": UserList,
  "*": NotFound,
};
