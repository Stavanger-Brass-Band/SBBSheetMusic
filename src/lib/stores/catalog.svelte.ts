import type { MusicSet, Project } from "$lib/types";

/** 5 minutes — how long the cached music-set list is considered fresh. */
const STALE_MS = 5 * 60 * 1000;

function byArchiveNumberDesc(a: MusicSet, b: MusicSet): number {
  return (b.archiveNumber ?? 0) - (a.archiveNumber ?? 0);
}

/**
 * Cached catalog state (music sets + active projects), modeled as a Svelte 5
 * rune class. Replaces the old `musicSets` / `activeProjects` / `lastSetTime`
 * writables. All mutation goes through action methods so list invariants
 * (sorting) live in one place instead of being mutated in components.
 */
class CatalogState {
  musicSets = $state<MusicSet[]>([]);
  activeProjects = $state<Project[]>([]);
  lastFetched = $state(0);

  /** Whether the cached set list should be refetched. */
  get isStale(): boolean {
    return (
      this.musicSets.length < 1 || Date.now() - this.lastFetched >= STALE_MS
    );
  }

  setMusicSets(sets: MusicSet[]): void {
    this.musicSets = [...sets].sort(byArchiveNumberDesc);
    this.lastFetched = Date.now();
  }

  addMusicSet(set: MusicSet): void {
    this.musicSets = [...this.musicSets, set].sort(byArchiveNumberDesc);
  }

  updateMusicSet(set: MusicSet): void {
    this.musicSets = this.musicSets.map((s) => (s.id === set.id ? set : s));
  }

  removeMusicSetById(id: string): void {
    this.musicSets = this.musicSets.filter((s) => s.id !== id);
  }

  setActiveProjects(projects: Project[]): void {
    this.activeProjects = projects;
  }
}

export const catalog = new CatalogState();
