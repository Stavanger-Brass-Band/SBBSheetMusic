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
  /**
   * Server-side searched, sorted and paged project list using the v1 OData
   * query options ($search / $orderby / $top / $skip). Returns one page of
   * results — like the sets endpoint it answers with a bare array, so callers
   * infer "has more" from a full page.
   */
  search: (
    opts: {
      search?: string;
      orderBy?: string;
      top?: number;
      skip?: number;
    } = {},
  ) => {
    const params = new URLSearchParams();
    if (opts.search) params.set("$search", opts.search);
    if (opts.orderBy) params.set("$orderby", opts.orderBy);
    params.set("$top", String(opts.top ?? 30));
    params.set("$skip", String(opts.skip ?? 0));
    return client.get<Project[]>(`/projects?${params}`);
  },

  /** Just the projects running today, narrowed and ordered by the API. */
  listActive: () => {
    const params = new URLSearchParams({
      $filter: activeTodayFilter(),
      $orderby: "startDate asc",
    });
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
