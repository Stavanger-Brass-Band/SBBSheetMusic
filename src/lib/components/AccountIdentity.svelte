<script lang="ts">
  import { auth } from "$lib/stores/auth.svelte";
  import { UserAvatar } from "$lib/components/ui";
  import { primaryRoleLabel } from "$lib/roles";

  /**
   * Who is signed in: their picture, name, email and widest-access role.
   *
   * Shared by the desktop account dropdown and the mobile menu sheet so the same
   * person reads the same in both. It is identity, not a control — the host owns
   * the padding and the rule that separates it from whatever sits next to it.
   */
  let { size = 38 }: { size?: number } = $props();

  let displayName = $derived(auth.name ?? "Bruker");
  // The widest-access role held, e.g. "Noteansvarlig" or "Administrator" — it
  // explains why the admin-gated controls elsewhere on the page are there or
  // aren't. `auth` already exposes each capability `primaryRoleLabel` reads.
  let roleLabel = $derived(primaryRoleLabel(auth));
  let hasElevatedRole = $derived(roleLabel !== "Medlem");
</script>

<div class="identity">
  <UserAvatar
    name={auth.name}
    userId={auth.userId}
    pictureVersion={auth.profilePictureVersion}
    {size}
  />
  <span class="identity__txt">
    <b>{displayName}</b>
    <span>{auth.email ?? ""}</span>
    <span class="identity__role" class:elevated={hasElevatedRole}>
      {roleLabel}
    </span>
  </span>
</div>

<style>
  .identity {
    display: flex;
    gap: 11px;
    align-items: center;
  }
  .identity__txt {
    min-width: 0;
  }
  .identity__txt b {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }
  .identity__txt span {
    display: block;
    font-size: 12px;
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .identity__role {
    margin-top: 3px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
  }
  .identity__role.elevated {
    color: var(--brass-500);
  }
</style>
