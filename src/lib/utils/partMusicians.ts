import type { User } from "$lib/types";

/**
 * Who plays which stemme, turned around from how the API stores it.
 *
 * The assignment only exists in one direction: a user carries their parts, and
 * nothing on a part points back at the people playing it. So the catalogue's
 * answer to "who sits in this seat" has to be built from the user list — which
 * `GET /users` only serves to an Admin, and which is why the surfaces using this
 * hide themselves for anyone else rather than showing an empty seat.
 *
 * Inactive users are kept in. Someone deactivated still holds the assignment, and
 * on a management surface that is the thing worth knowing — the stemme cannot be
 * deleted while they do. Where the distinction matters it is shown per row rather
 * than filtered away here.
 */
export function musiciansByPartId(users: User[]): Map<string, User[]> {
  const byPartId = new Map<string, User[]>();

  for (const user of users) {
    for (const part of user.parts ?? []) {
      if (!part.id) continue;
      const musicians = byPartId.get(part.id);
      if (musicians) musicians.push(user);
      else byPartId.set(part.id, [user]);
    }
  }

  // By name, the order every other list of people in the app opens in.
  for (const musicians of byPartId.values()) {
    musicians.sort((a, b) =>
      (a.name ?? "").localeCompare(b.name ?? "", "nb-NO"),
    );
  }

  return byPartId;
}
