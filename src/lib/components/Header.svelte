<script lang="ts">
  import { Menu } from "@lucide/svelte";
  import { browser } from "$app/environment";
  import { page } from "$app/state";
  import { auth } from "$lib/stores/auth.svelte";
  import AccountMenu from "$lib/components/AccountMenu.svelte";

  /**
   * When the header gives up on a horizontal nav and falls back to the hamburger.
   *
   * Narrower than `PHONE_WIDTH` there is never room, whatever roles the user
   * holds. From there up to `TABLET_WIDTH` it depends on how many links those
   * roles produce: an admin's full six, beside the brand and the account menu,
   * measure about 975px of content, so on an iPad in portrait they overflowed and
   * pushed the account menu off screen — the links don't shrink, so the account is
   * what leaves. Past `MAX_TABLET_NAV_LINKS` links the row collapses rather than
   * breaking, while a shorter nav — a Musikant's two, a Prosjektleder's three —
   * keeps its links down to `PHONE_WIDTH`.
   *
   * That 975px assumes the account menu's two text lines are capped
   * (`.acct__name` and `.acct__group` in `AccountMenu`); they render the signed-in
   * user's own name and section, so without a bound the width the row needs would
   * grow with whoever is logged in. Counting links rather than hardcoding roles
   * keeps this honest as nav items come and go.
   */
  const PHONE_WIDTH = 768;
  const TABLET_WIDTH = 980;
  const MAX_TABLET_NAV_LINKS = 3;

  let menuOpen = $state(false);
  // Seeded from the real width rather than left to the binding to fill in on
  // mount: this decides the layout, so a first paint at width 0 would flash the
  // wrong one. There is no SSR here (`ssr = false`), so the window is available.
  let viewportWidth = $state(browser ? window.innerWidth : 0);

  let items = $derived([
    { id: "home", label: "Hjem", href: "/" },
    // Reading the catalogue — Musikant (active projects only), Arkivleser,
    // Noteansvarlig or Admin. Without one of them the list has nothing in it.
    ...(auth.canAccessCatalog
      ? [{ id: "archive", label: "Arkivliste", href: "/archive" }]
      : []),
    // Project admin — Admin, Noteansvarlig or Prosjektleder.
    ...(auth.canManageProjects
      ? [{ id: "projects", label: "Prosjekter", href: "/projects" }]
      : []),
    // Music-catalogue admin — Admin or Noteansvarlig.
    ...(auth.canManageMusic
      ? [
          { id: "parts", label: "Stemmekatalog", href: "/parts" },
          { id: "categories", label: "Kategorier", href: "/categories" },
        ]
      : []),
    // User administration — Admin only.
    ...(auth.isAdmin
      ? [{ id: "users", label: "Brukere", href: "/users" }]
      : []),
  ]);

  // Which top-level section the current path belongs to. The project view and
  // set view live *under* Hjem, so Hjem stays active there. Editing screens
  // belong to their admin section (Prosjekter / Arkivliste).
  function sectionFor(pathname: string): string {
    if (pathname.startsWith("/archive") || pathname.startsWith("/set/"))
      return "archive";
    if (
      pathname.startsWith("/projects") ||
      pathname.startsWith("/project/edit")
    )
      return "projects";
    if (pathname.startsWith("/users") || pathname.startsWith("/user/edit"))
      return "users";
    if (pathname.startsWith("/parts") || pathname.startsWith("/part/edit"))
      return "parts";
    if (pathname.startsWith("/categories")) return "categories";
    return "home"; // "/", "/project/[id]", "/project/[projectId]/set/[id]"
  }

  let activeSection = $derived(sectionFor(page.url.pathname));

  let navCollapsed = $derived(
    viewportWidth <= PHONE_WIDTH ||
      (viewportWidth <= TABLET_WIDTH && items.length > MAX_TABLET_NAV_LINKS),
  );

  // A menu left open while the window grows would otherwise still be open the
  // next time the header collapses, with nothing on screen having asked for it.
  $effect(() => {
    if (!navCollapsed) menuOpen = false;
  });
</script>

<svelte:window bind:innerWidth={viewportWidth} />

<header class="topbar" class:collapsed={navCollapsed}>
  <div class="inner">
    <a class="brand" href="/" onclick={() => (menuOpen = false)}>
      <img src="/img/logo.jpg" alt="SBB" width="38" height="38" />
      <span class="wordmark">Notearkiv</span>
    </a>

    <button
      class="hamburger"
      aria-label="Meny"
      onclick={() => (menuOpen = !menuOpen)}
    >
      <Menu size={20} />
    </button>

    <nav class="nav" class:open={menuOpen}>
      {#each items as item}
        <a
          href={item.href}
          class="nav-link"
          class:active={activeSection === item.id}
          onclick={() => (menuOpen = false)}
        >
          {item.label}
        </a>
      {/each}
      <div class="account">
        <AccountMenu />
      </div>
    </nav>
  </div>
</header>

<style>
  .topbar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 50;
    min-height: var(--header-height);
    background: var(--black);
    border-bottom: 1px solid var(--border-inverse);
    display: flex;
    align-items: center;
  }
  .inner {
    width: 100%;
    max-width: var(--container-max);
    margin: 0 auto;
    padding: 0 24px;
    display: flex;
    align-items: center;
    gap: 28px;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
    text-decoration: none;
    flex-shrink: 0;
  }
  .brand img {
    border-radius: 6px;
    display: block;
  }
  .wordmark {
    font-family: var(--font-display);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-size: 15px;
    color: var(--white);
  }
  .hamburger {
    display: none;
    margin-left: auto;
    color: var(--white);
    background: transparent;
    border: 1px solid var(--border-inverse);
    border-radius: var(--radius-sm);
    width: 40px;
    height: 40px;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }
  .nav {
    display: flex;
    align-items: center;
    gap: 4px;
    flex: 1;
  }
  .nav-link {
    position: relative;
    padding: 8px 14px;
    font-family: var(--font-text);
    font-size: 14px;
    font-weight: 500;
    color: var(--gray-400);
    text-decoration: none;
    transition: color var(--dur-fast);
  }
  .nav-link:hover {
    color: var(--white);
  }
  .nav-link.active {
    color: var(--white);
    font-weight: 600;
  }
  .nav-link.active::after {
    content: "";
    position: absolute;
    left: 14px;
    right: 14px;
    bottom: -1px;
    height: 2px;
    background: var(--brass-500);
  }
  .account {
    margin-left: auto;
  }

  /*
   * The collapsed header: brand and hamburger on one row, the nav dropping below
   * it as a stack when opened. Keyed on a class rather than a media query because
   * the width alone doesn't decide it — see `navCollapsed`, which also weighs how
   * many links the user's roles produce.
   */
  .topbar.collapsed {
    align-items: stretch;
  }
  .topbar.collapsed .inner {
    flex-wrap: wrap;
    align-items: center;
    padding-top: 16px;
    padding-bottom: 16px;
    gap: 0;
  }
  .topbar.collapsed .brand {
    flex: 1;
  }
  .topbar.collapsed .hamburger {
    display: inline-flex;
  }
  .topbar.collapsed .nav {
    display: none;
    flex-basis: 100%;
    flex-direction: column;
    align-items: stretch;
    gap: 2px;
    margin-top: 16px;
  }
  .topbar.collapsed .nav.open {
    display: flex;
  }
  .topbar.collapsed .nav-link.active::after {
    display: none;
  }
  .topbar.collapsed .account {
    margin-left: 0;
    margin-top: 8px;
  }
</style>
