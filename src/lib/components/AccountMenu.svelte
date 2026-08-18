<script lang="ts">
  import { tick } from "svelte";
  import { ChevronDown, User, LogOut } from "@lucide/svelte";
  import { auth } from "$lib/stores/auth.svelte";
  import { InitialsAvatar } from "$lib/components/ui";
  import { primaryRoleLabel } from "$lib/roles";

  let open = $state(false);
  let triggerEl = $state<HTMLButtonElement>();
  let menuEl = $state<HTMLDivElement>();

  let displayName = $derived(auth.name ?? "Bruker");
  // The widest-access role held, e.g. "Noteansvarlig" or "Administrator" — it
  // explains why the admin-gated controls elsewhere on the page are there or
  // aren't. `auth` already exposes each capability `primaryRoleLabel` reads.
  // It sits inside the open menu rather than on the trigger: the section below is
  // the more useful thing to carry at a glance, and a role is reference material
  // you look up rather than something to keep in view.
  let roleLabel = $derived(primaryRoleLabel(auth));
  /**
   * The user's section, from the instrument groups of the parts they play. This is
   * what will decide which notes a Musikant is shown, so naming it does for the
   * member side what the role does for the admin side — explains the catalogue
   * they get. Blank until someone has been assigned parts, in which case the
   * trigger is just the name.
   */
  let groupLabel = $derived(auth.instrumentGroups.join(" · "));
  let hasElevatedRole = $derived(roleLabel !== "Medlem");
  // Musikant is currently one shared login used by many real people, so
  // letting any of them change its name, email or password would affect
  // everyone else signed in as it. Hide the entry point until everyone has
  // their own account — see `requireIndividualAccount` in `$lib/guards`, which
  // closes the route itself the same way.
  let showProfileLink = $derived(roleLabel !== "Musikant");

  async function openMenu() {
    open = true;
    await tick();
    menuEl?.querySelector<HTMLElement>("[role='menuitem']")?.focus();
  }

  function closeMenu() {
    open = false;
  }

  // The trigger's native click (mouse or Enter/Space) already toggles `open`;
  // stopping propagation here keeps the window listener below from closing
  // what this same click just opened.
  function toggleFromTrigger(event: MouseEvent) {
    event.stopPropagation();
    if (open) closeMenu();
    else openMenu();
  }

  function closeAndRefocusTrigger() {
    closeMenu();
    triggerEl?.focus();
  }

  function focusAdjacentItem(current: HTMLElement, direction: 1 | -1) {
    const items = Array.from(
      current.parentElement?.querySelectorAll<HTMLElement>(
        "[role='menuitem']",
      ) ?? [],
    );
    const index = items.indexOf(current);
    items[(index + direction + items.length) % items.length]?.focus();
  }

  function onItemKeydown(event: KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusAdjacentItem(event.currentTarget as HTMLElement, 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusAdjacentItem(event.currentTarget as HTMLElement, -1);
    }
  }

  function logOut() {
    closeMenu();
    auth.logout();
  }
</script>

<svelte:window
  onclick={closeMenu}
  onkeydown={(event) => {
    if (open && event.key === "Escape") closeAndRefocusTrigger();
  }}
/>

<div class="acct">
  <button
    bind:this={triggerEl}
    class="acct__btn"
    aria-haspopup="menu"
    aria-expanded={open}
    onclick={toggleFromTrigger}
  >
    <InitialsAvatar name={auth.name} />
    <span class="acct__id">
      <span class="acct__name">{displayName}</span>
      {#if groupLabel}
        <span class="acct__group">{groupLabel}</span>
      {/if}
    </span>
    <span class="chevron"><ChevronDown size={15} /></span>
  </button>

  {#if open}
    <div
      bind:this={menuEl}
      class="acctmenu"
      role="menu"
      tabindex="-1"
      onclick={(event) => event.stopPropagation()}
    >
      <div class="acctmenu__head">
        <InitialsAvatar name={auth.name} size={38} />
        <span class="acctmenu__txt">
          <b>{displayName}</b>
          <span>{auth.email ?? ""}</span>
          <span class="acctmenu__role" class:elevated={hasElevatedRole}>
            {roleLabel}
          </span>
        </span>
      </div>
      {#if showProfileLink}
        <a
          href="/profile"
          class="acctmenu__item"
          role="menuitem"
          onclick={closeMenu}
          onkeydown={onItemKeydown}
        >
          <span class="item-icon"><User size={16} /></span> Min profil
        </a>
      {/if}
      <button
        class="acctmenu__item"
        role="menuitem"
        onclick={logOut}
        onkeydown={onItemKeydown}
      >
        <span class="item-icon"><LogOut size={16} /></span> Logg ut
      </button>
    </div>
  {/if}
</div>

<style>
  .acct {
    position: relative;
    flex-shrink: 0;
  }
  .acct__btn {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 44px;
    padding: 0 6px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-family: var(--font-text);
    transition:
      background var(--dur-fast),
      border-color var(--dur-fast);
  }
  .acct__btn:hover,
  .acct__btn[aria-expanded="true"] {
    background: rgba(255, 255, 255, 0.08);
    border-color: var(--border-inverse);
  }
  .acct__id {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    line-height: 1.1;
  }
  /*
   * Capped so the trigger's width doesn't grow with whoever is signed in — the
   * header's collapse breakpoint is measured against it (see `TABLET_WIDTH` in
   * `Header`), and an unbounded name would push the whole menu off screen at
   * widths that fit everyone else. 160px clears the longest name in use; anything
   * past it ellipsizes here and still reads in full in the open menu below.
   */
  .acct__name {
    max-width: 160px;
    overflow: hidden;
    font-size: 13.5px;
    font-weight: 600;
    color: var(--white);
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  /* Capped like the name above, and for the same reason: group names run long
     ("Horn og flygelhorn"), and the header's collapse breakpoint is measured
     against a trigger of bounded width. */
  .acct__group {
    max-width: 160px;
    overflow: hidden;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
    color: var(--gray-400);
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .chevron {
    display: inline-flex;
    color: var(--gray-400);
  }

  .acctmenu {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    width: 250px;
    padding: 6px;
    background: var(--surface-card);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    z-index: 60;
  }
  .acctmenu__head {
    display: flex;
    gap: 11px;
    align-items: center;
    padding: 10px 10px 12px;
    border-bottom: 1px solid var(--border-subtle);
    margin-bottom: 6px;
  }
  .acctmenu__txt {
    min-width: 0;
  }
  .acctmenu__txt b {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }
  .acctmenu__txt span {
    display: block;
    font-size: 12px;
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .acctmenu__role {
    margin-top: 3px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
  }
  .acctmenu__role.elevated {
    color: var(--brass-500);
  }
  .acctmenu__item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 9px 10px;
    font-family: var(--font-text);
    font-size: 13.5px;
    font-weight: 500;
    color: var(--text-primary);
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    text-align: left;
    cursor: pointer;
  }
  .acctmenu__item:hover {
    background: var(--surface-subtle);
  }
  .item-icon {
    display: inline-flex;
    flex-shrink: 0;
    color: var(--text-muted);
  }
</style>
