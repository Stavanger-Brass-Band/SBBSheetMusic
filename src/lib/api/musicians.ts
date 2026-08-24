import { createClient } from "./client";
import type { Musician } from "$lib/types";

const client = createClient("2.0");

/**
 * The band's roster, served to any authenticated member.
 *
 * Kept apart from `users` even though the endpoint lives on the same controller:
 * `/users` is Admin-only and carries e-mail, account state and last sign-in,
 * while this one is the privacy-reduced read every member gets. Mixing them in
 * one module would invite reaching for the wrong one.
 */
export const musicians = {
  /**
   * Every active member with at least one stemme assigned, as a flat list — the
   * API does no grouping, so `$lib/utils/roster` builds the sections from the
   * parts each musician carries. `undefined` means the read failed; there is no
   * refusal to tell apart, since the endpoint asks only for a session.
   */
  list: () => client.get<Musician[]>("/musicians"),
};
