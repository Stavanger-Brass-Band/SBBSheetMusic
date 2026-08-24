<script lang="ts">
  import { ChevronDown, Menu, X } from "@lucide/svelte";
  import { browser } from "$app/environment";
  import { page } from "$app/state";
  import { Dropdown, DropdownItem } from "flowbite-svelte";
  import { auth } from "$lib/stores/auth.svelte";
  import { navigationFor, sectionFor } from "$lib/navigation";
  import AccountMenu from "$lib/components/AccountMenu.svelte";
  import AccountIdentity from "$lib/components/AccountIdentity.svelte";
  import AccountActions from "$lib/components/AccountActions.svelte";
  import QuickJump from "$lib/components/QuickJump.svelte";
  import QuickJumpTrigger from "$lib/components/QuickJumpTrigger.svelte";

  /**
   * When the header gives up on a horizontal nav and falls back to the hamburger.
   *
   * Narrower than `PHONE_WIDTH` there is never room, whatever roles the user
   * holds. From there up to `TABLET_WIDTH` it depends on how many links those
   * roles produce: past `MAX_TABLET_NAV_LINKS` of them the row collapses rather
   * than breaking, while a shorter nav — a Musikant's three — keeps its links
   * down to `PHONE_WIDTH`. Without that the links, which don't shrink, push the
   * account menu off the right edge; the account is what leaves.
   *
   * `TABLET_WIDTH` came down from 1110 to 960 when the administrative pages moved
   * behind "Mer" (see `navigationFor`). The old figure was measured on an admin's
   * seven links: about 1050px of row beside the brand and the account menu, whose
   * floor the inner row's own 24px of padding either side put near 1100px of
   * viewport. Of those seven, Stemmekatalog, Kategorier and Brukere left —
   * roughly 300px of link plus their gaps — while the "Mer" trigger (about 70px)
   * and Quick jump's button (about 90px with its margin) arrived. So the widest
   * row there is now wants some 860px, putting its floor near 910px; 960 keeps a
   * margin over an estimate that was arrived at by arithmetic rather than by
   * measuring. Worth measuring properly the next time a link is added.
   *
   * Counting links rather than hardcoding roles keeps this honest as nav items
   * come and go, and the primary row is now capped at four by construction —
   * `navigation.test.ts` asserts it — so what has to be watched is the width of
   * those four labels rather than how many there are.
   *
   * That 860px also assumes the account menu's two text lines stay capped
   * (`.acct__name` and `.acct__group` in `AccountMenu`); they render the signed-in
   * user's own name and section, so without a bound the width the row needs would
   * grow with whoever is logged in.
   */
  const PHONE_WIDTH = 768;
  const TABLET_WIDTH = 960;
  const MAX_TABLET_NAV_LINKS = 3;

  let menuOpen = $state(false);
  let moreOpen = $state(false);
  let quickJumpOpen = $state(false);
  // Seeded from the real width rather than left to the binding to fill in on
  // mount: this decides the layout, so a first paint at width 0 would flash the
  // wrong one. There is no SSR here (`ssr = false`), so the window is available.
  let viewportWidth = $state(browser ? window.innerWidth : 0);

  // The links themselves live in `$lib/navigation`, which Quick jump reads too —
  // it offers the same destinations before anything has been typed.
  let navigation = $derived(navigationFor(auth));

  /**
   * What the width rule counts. The "Mer" trigger stands in for the whole
   * overflow: it takes room like a link, and the links behind it take none.
   */
  let navLinkCount = $derived(
    navigation.primary.length + (navigation.admin.length ? 1 : 0),
  );

  let activeSection = $derived(sectionFor(page.url.pathname));

  /**
   * Whether the current page is one of the ones behind "Mer" — the trigger reads
   * as active in its place, so a reader on Stemmekatalog can still see which
   * section they are in.
   */
  let adminSectionActive = $derived(
    navigation.admin.some((item) => item.id === activeSection),
  );

  let navCollapsed = $derived(
    viewportWidth <= PHONE_WIDTH ||
      (viewportWidth <= TABLET_WIDTH && navLinkCount > MAX_TABLET_NAV_LINKS),
  );

  // A menu left open while the window grows would otherwise still be open the
  // next time the header collapses, with nothing on screen having asked for it.
  $effect(() => {
    if (!navCollapsed) menuOpen = false;
  });

  function closeMenu() {
    menuOpen = false;
  }
</script>

<svelte:window bind:innerWidth={viewportWidth} />

<header class="topbar" class:collapsed={navCollapsed}>
  <div class="inner">
    <a class="brand" href="/" onclick={closeMenu}>
      <img src="/img/logo.jpg" alt="SBB" width="38" height="38" />
      <span class="wordmark">Notearkiv</span>
    </a>

    <!-- Collapsed, the search sits in the top row beside the hamburger rather
         than inside the menu. It is one tap either way, and being quicker than
         the menu is the whole point of it. -->
    {#if navCollapsed}
      <QuickJumpTrigger compact onclick={() => (quickJumpOpen = true)} />
    {/if}

    <button
      class="hamburger"
      aria-label={menuOpen ? "Lukk meny" : "Meny"}
      aria-expanded={menuOpen}
      onclick={() => (menuOpen = !menuOpen)}
    >
      {#if menuOpen}
        <X size={20} />
      {:else}
        <Menu size={20} />
      {/if}
    </button>

    <nav class="nav" class:open={menuOpen}>
      {#each navigation.primary as item (item.id)}
        <a
          href={item.href}
          class="nav-link"
          class:active={activeSection === item.id}
          onclick={closeMenu}
        >
          {item.label}
        </a>
      {/each}
      {#if navigation.admin.length}
        {#if navCollapsed}
          <!-- Stacked, the overflow has nothing to hide behind and nothing to
               gain from hiding: a dropdown inside an open menu is worse than a
               labelled group of links. -->
          <p class="nav-group">Administrasjon</p>
          {#each navigation.admin as item (item.id)}
            <a
              href={item.href}
              class="nav-link"
              class:active={activeSection === item.id}
              onclick={closeMenu}
            >
              {item.label}
            </a>
          {/each}
        {:else}
          <button
            id="nav-more-trigger"
            type="button"
            class="nav-link nav-more"
            class:active={adminSectionActive}
            aria-haspopup="menu"
            aria-expanded={moreOpen}
          >
            Mer
            <span class="nav-more__chevron" class:up={moreOpen}>
              <ChevronDown size={15} />
            </span>
          </button>
          <Dropdown
            simple
            bind:isOpen={moreOpen}
            triggeredBy="#nav-more-trigger"
            placement="bottom-start"
            role="menu"
            class="min-w-[190px] rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--shadow-lg)] dark:bg-[var(--surface-card)]"
          >
            {#each navigation.admin as item (item.id)}
              <DropdownItem
                href={item.href}
                role="menuitem"
                class="px-4 py-2.5 text-[13.5px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] dark:hover:bg-[var(--surface-hover)]"
                onclick={() => (moreOpen = false)}
              >
                {item.label}
              </DropdownItem>
            {/each}
          </Dropdown>
        {/if}
      {/if}

      <!--
        The account is a dropdown while the nav is a row and a flat block once it
        stacks. Stacking the dropdown itself is what buried "Min profil" and
        "Logg ut" behind a second, unlabelled tap, on a panel that escaped the
        fixed header and floated over the page — so below the breakpoint the
        trigger goes away and its contents become rows of the menu.

        Quick jump's button belongs to the expanded row only, next to the
        trigger it sits beside there. Collapsed it has already been rendered up
        in the top row, beside the hamburger, where it is reachable without
        opening anything.
      -->
      {#if navCollapsed}
        <div class="account-stack">
          <div class="account-stack__identity">
            <AccountIdentity size={40} />
          </div>
          <AccountActions surface="stacked" onSelect={closeMenu} />
        </div>
      {:else}
        <div class="nav-end">
          <QuickJumpTrigger onclick={() => (quickJumpOpen = true)} />
          <AccountMenu />
        </div>
      {/if}
    </nav>
  </div>
</header>

<QuickJump bind:open={quickJumpOpen} {navigation} />

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

  /* The "Mer" trigger wears `.nav-link` so it sits in the row as one of them —
     which means undoing what a button brings with it. */
  .nav-more {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: transparent;
    border: 0;
    cursor: pointer;
  }
  .nav-more__chevron {
    display: inline-flex;
    color: var(--gray-500);
    transition: transform var(--dur-fast);
  }
  .nav-more:hover .nav-more__chevron,
  .nav-more.active .nav-more__chevron {
    color: inherit;
  }
  .nav-more__chevron.up {
    transform: rotate(180deg);
  }

  /* Only ever seen in the collapsed menu, where the overflow is a labelled group
     of links rather than a dropdown. */
  .nav-group {
    margin: 14px 0 2px;
    padding: 0 14px;
    font-family: var(--font-display);
    font-size: 10px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: var(--gray-500);
  }

  .nav-end {
    display: flex;
    align-items: center;
    gap: 12px;
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
  /* The gap is the search button's: it sits to the hamburger's left in this row,
     and `.inner`'s own gap is zero once collapsed. */
  .topbar.collapsed .hamburger {
    display: inline-flex;
    margin-left: 8px;
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
  /* Rows rather than the row's inline links: sized for a thumb, and matching the
     account rows below them so the whole stack reads as one list. */
  .topbar.collapsed .nav-link {
    display: flex;
    align-items: center;
    min-height: 44px;
    padding: 0 12px;
    font-size: 15px;
    color: var(--gray-300);
    border-radius: var(--radius-sm);
  }
  .topbar.collapsed .nav-link:hover {
    background: var(--surface-hover);
  }
  /* The underline can't mark a row in a stack, so the active link takes a bar
     down its leading edge instead. An element of its own rather than an inset
     shadow, which would follow the row's rounding and round the bar's ends with
     it — the accent is a rule, not a pill. */
  .topbar.collapsed .nav-link.active::after {
    display: none;
  }
  .topbar.collapsed .nav-link.active::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: var(--brass-500);
  }
  .account-stack {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid var(--border-inverse);
  }
  .account-stack__identity {
    padding: 2px 12px 10px;
  }
</style>
