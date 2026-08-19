<script lang="ts">
  import { User, LogOut } from "@lucide/svelte";
  import { auth } from "$lib/stores/auth.svelte";

  /**
   * What you can do with your own account: open your profile, or sign out.
   *
   * The two rows render side by side with `AccountIdentity` on both surfaces that
   * carry the account — the header's account dropdown and the stacked nav the
   * header drops open once it collapses — so the labels, the icons and signing out
   * itself are written once. `surface` is what separates them: in the dropdown the
   * rows are the items of an ARIA menu and sized for a pointer, in the stack they
   * are plain rows sized for a thumb.
   *
   * No wrapper element, so the host's own container is the rows' parent — which is
   * what `focusAdjacentItem` walks, and what the host styles.
   */
  let {
    surface = "dropdown",
    onSelect,
  }: {
    surface?: "dropdown" | "stacked";
    onSelect?: () => void;
  } = $props();

  let isDropdown = $derived(surface === "dropdown");

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
    onSelect?.();
    auth.logout();
  }
</script>

<a
  href="/profile"
  class="account-action"
  class:stacked={!isDropdown}
  role={isDropdown ? "menuitem" : undefined}
  onclick={onSelect}
  onkeydown={isDropdown ? onItemKeydown : undefined}
>
  <span class="account-action__icon"><User size={16} /></span>
  Min profil
</a>
<button
  class="account-action"
  class:stacked={!isDropdown}
  role={isDropdown ? "menuitem" : undefined}
  onclick={logOut}
  onkeydown={isDropdown ? onItemKeydown : undefined}
>
  <span class="account-action__icon"><LogOut size={16} /></span>
  Logg ut
</button>

<style>
  .account-action {
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
    text-decoration: none;
    cursor: pointer;
  }
  .account-action:hover {
    background: var(--surface-hover);
  }
  /* Thumb-sized rows, matching the stacked nav's links rather than the dropdown's
     pointer-sized items. */
  .account-action.stacked {
    gap: 12px;
    min-height: 44px;
    padding: 0 12px;
    font-size: 15px;
  }
  .account-action__icon {
    display: inline-flex;
    flex-shrink: 0;
    color: var(--text-muted);
  }
</style>
