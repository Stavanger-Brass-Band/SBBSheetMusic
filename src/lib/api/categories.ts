import { createClient } from "./client";
import type { Category, CategoryRequest } from "$lib/types";

const client = createClient("1.0");

/**
 * The category catalog. Assigning a category to a music set lives on the v2
 * set endpoints instead — see `sheetMusic.assignCategory`.
 */
export const categories = {
  list: () => client.get<Category[]>("/categories"),

  create: (body: CategoryRequest) =>
    client.post<CategoryRequest, Category>("/categories", body),

  update: (id: string, body: CategoryRequest) =>
    client.put<CategoryRequest, Category>(`/categories/${id}`, body),

  remove: (id: string) => client.del(`/categories/${id}`),
};
