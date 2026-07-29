import { createClient } from "./client";
import { endOfTodayIso, startOfTodayIso } from "$lib/utils/date";
import type {
  MusicSet,
  NewProjectRequest,
  Project,
  UpdateProjectRequest,
} from "$lib/types";

const client = createClient("1.0");

/**
 * `$filter` clause matching the projects running today — the server-side twin
 * of `projectStatus()`'s "active". Comparing against the edges of today (not
 * "now") keeps it at day granularity, so a project that starts or ends today
 * still counts; see `startOfTodayIso`.
 */
function activeTodayFilter(): string {
  return `startDate le ${endOfTodayIso()} and endDate ge ${startOfTodayIso()}`;
}

export const projects = {
  list: () => client.get<Project[]>("/projects"),

  /**
   * Just the projects running today, narrowed by the API. `$filter` is the only
   * OData query option this endpoint actually honours — `$search`, `$orderby`,
   * `$top` and `$skip` are advertised in the OpenAPI document but ignored, so
   * everything else (searching, sorting, paging) still has to happen client-side
   * on the full list.
   */
  listActive: () => {
    const params = new URLSearchParams({ $filter: activeTodayFilter() });
    return client.get<Project[]>(`/projects?${params}`);
  },

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

  /**
   * Store the concert order — the same endpoint as `addSets`, which moves any
   * identifier already on the project to the position it holds in the list (and
   * appends the ones that aren't), so posting every set in order reorders them.
   * Returns the raw response: the caller already has the order on screen and
   * only needs to know whether it stuck.
   */
  updateSetOrder: (id: string, setIdentifiers: string[]) =>
    client.postNoContent<{ setIdentifiers: string[] }>(`/projects/${id}/sets`, {
      setIdentifiers,
    }),
};
