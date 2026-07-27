<script lang="ts">
  import { LogOut, Menu } from "@lucide/svelte";
  import { page } from "$app/state";
  import { auth } from "$lib/stores/auth.svelte";
  import { Button } from "$lib/components/ui";

  let menuOpen = $state(false);

  let items = $derived([
    { id: "home", label: "Hjem", href: "/" },
    { id: "archive", label: "Arkivliste", href: "/archive" },
    ...(auth.isAdmin
      ? [
          { id: "projects", label: "Prosjekter", href: "/projects" },
          { id: "users", label: "Brukere", href: "/users" },
          { id: "parts", label: "Stemmekatalog", href: "/parts" },
          { id: "categories", label: "Kategorier", href: "/categories" },
        ]
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
    if (pathname.startsWith("/parts")) return "parts";
    if (pathname.startsWith("/categories")) return "categories";
    return "home"; // "/", "/project/[id]", "/project/[projectId]/set/[id]"
  }

  let activeSection = $derived(sectionFor(page.url.pathname));
</script>

<header class="topbar">
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
      <div class="logout">
        <Button variant="inverse" size="sm" onclick={() => auth.logout()}>
          <LogOut size={15} /> Logg ut
        </Button>
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
  .logout {
    margin-left: auto;
  }

  @media (max-width: 768px) {
    .topbar {
      align-items: stretch;
    }
    .inner {
      flex-wrap: wrap;
      align-items: center;
      padding-top: 16px;
      padding-bottom: 16px;
      gap: 0;
    }
    .brand {
      flex: 1;
    }
    .hamburger {
      display: inline-flex;
    }
    .nav {
      display: none;
      flex-basis: 100%;
      flex-direction: column;
      align-items: stretch;
      gap: 2px;
      margin-top: 16px;
    }
    .nav.open {
      display: flex;
    }
    .nav-link.active::after {
      display: none;
    }
    .logout {
      margin-left: 0;
      margin-top: 8px;
    }
  }
</style>
