import { createClient } from "./client";
import type {
  MusicSet,
  NewProjectRequest,
  Project,
  UpdateProjectRequest,
} from "$lib/types";

const client = createClient("1.0");

export const projects = {
  list: () => client.get<Project[]>("/projects"),

  get: (id: string) => client.get<Project>(`/projects/${id}`),

  getSets: (id: string) => client.get<MusicSet[]>(`/projects/${id}/sets`),

  create: (body: NewProjectRequest) =>
    client.post<NewProjectRequest, Project>("/projects", body),

  update: (id: string, body: UpdateProjectRequest) =>
    client.put<UpdateProjectRequest, Project>(`/projects/${id}`, body),

  remove: (id: string) => client.del(`/projects/${id}`),

  addSets: (id: string, setIdentifiers: string[]) =>
    client.post<{ setIdentifiers: string[] }, MusicSet[]>(
      `/projects/${id}/sets`,
      {
        setIdentifiers,
      },
    ),

  removeSets: (id: string, setIdentifiers: string[]) =>
    client.del(`/projects/${id}/sets`, { setIdentifiers }),
};
