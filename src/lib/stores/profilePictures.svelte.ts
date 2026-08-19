import { users } from "$lib/api/users";

/**
 * The profile pictures the app currently holds, one per user, as object URLs.
 *
 * A picture cannot be pointed at with an `<img src>`: the endpoint serving it
 * wants the bearer token like every other one, so the bytes have to be fetched
 * and wrapped in a `blob:` URL before an `<img>` can show them. That leaves two
 * jobs nothing else can do, which is why this exists rather than each avatar
 * fetching for itself. The same person shows up in the header, the Brukere list
 * and their own page, so their picture is fetched once for all of them; and an
 * object URL has to be handed back when it is replaced, which no component can be
 * trusted to do — the URL outlives whichever avatar happened to create it.
 *
 * Entries are keyed by version. A picture is only fetched for a user the API says
 * has one, and only again once that version has moved on, so an upload refreshes
 * every avatar on screen while an idle page asks for nothing.
 *
 * URLs live as long as the tab does, bounded by how many distinct people the
 * reader looked at. Nothing revokes on unmount on purpose: an avatar scrolling
 * out of view and back is the common case, and the fetch behind it is not free.
 */

interface CachedPicture {
  version: string;
  /** `null` once a fetch came back with nothing — see `#fetch`. */
  url: string | null;
}

class ProfilePictureCache {
  #byUserId = $state<Record<string, CachedPicture>>({});
  /**
   * The version most recently asked for per user. Doubles as the in-flight guard
   * — a fetch whose version is no longer the wanted one has been overtaken and
   * drops its answer rather than overwriting a newer picture.
   */
  #wantedVersions = new Map<string, string>();
  /** Feeds `replace` when an upload answered without a version — see there. */
  #fallbackVersions = 0;

  /**
   * The picture held for this user, or `null` when there is none to show — no
   * picture, still loading, or a load that came back empty. Pure: reading it
   * never starts a request, so it is safe anywhere in a render.
   */
  urlFor(userId: string): string | null {
    return this.#byUserId[userId]?.url ?? null;
  }

  /**
   * Makes sure this user's picture at this version is on its way, and does
   * nothing if it already is. Call it from an `$effect` — it is the side effect
   * `urlFor` deliberately isn't.
   *
   * A `null` version is a user with no picture and asks for nothing, so a caller
   * can pass on whatever the API gave it without checking first.
   */
  load(userId: string, version: string | null): void {
    if (!version) return;
    if (this.#byUserId[userId]?.version === version) return;
    if (this.#wantedVersions.get(userId) === version) return;

    this.#wantedVersions.set(userId, version);
    void this.#fetch(userId, version);
  }

  /**
   * Takes on the picture just uploaded for this user, reading back what the API
   * stored — it crops and re-encodes the upload, so the bytes it now serves are
   * never quite the file that was sent.
   *
   * The version comes from the upload's own answer. When it is missing, a stand-in
   * of our own does the job: the version is only ever compared against the one
   * already held, and being unlike it is the whole point.
   */
  replace(userId: string, version: string | null): void {
    this.load(userId, version ?? `replaced-${++this.#fallbackVersions}`);
  }

  /** Drops a user's picture, after it was removed or to stop showing it. */
  forget(userId: string): void {
    this.#wantedVersions.delete(userId);
    this.#release(userId);

    const remaining = { ...this.#byUserId };
    delete remaining[userId];
    this.#byUserId = remaining;
  }

  async #fetch(userId: string, version: string): Promise<void> {
    const blob = await users.picture(userId, version).catch(() => undefined);

    // Overtaken while in flight, by a newer upload or by `forget` — that call
    // owns the entry now, and this answer is already the old picture.
    if (this.#wantedVersions.get(userId) !== version) return;

    this.#release(userId);
    // An empty body counts as no picture rather than as a failure: the endpoint
    // documents only a 200, so "this user has none" may well arrive as one.
    const url = blob?.size ? URL.createObjectURL(blob) : null;
    this.#byUserId = { ...this.#byUserId, [userId]: { version, url } };
  }

  /** Hands back the object URL held for a user, if there is one. */
  #release(userId: string): void {
    const url = this.#byUserId[userId]?.url;
    if (url) URL.revokeObjectURL(url);
  }
}

export const profilePictures = new ProfilePictureCache();
