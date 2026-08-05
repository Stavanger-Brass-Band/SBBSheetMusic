import { requireCatalogAccess } from "$lib/guards";

export const load = () => requireCatalogAccess();
