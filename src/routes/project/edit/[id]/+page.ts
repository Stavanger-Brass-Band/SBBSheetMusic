import { requireAdmin } from "$lib/guards";

export const load = () => requireAdmin();
