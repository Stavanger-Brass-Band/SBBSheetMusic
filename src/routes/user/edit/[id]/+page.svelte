<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { Modal, Checkbox, Toggle } from "flowbite-svelte";
  import { Trash2, Check, UserX, UserCheck } from "@lucide/svelte";
  import { users as usersApi } from "$lib/api/users";
  import {
    isPasswordAcceptable,
    readPasswordRejection,
    type PasswordRuleKey,
  } from "$lib/password";
  import { passwordPolicy } from "$lib/stores/passwordPolicy.svelte";
  import { ROLES, type Role } from "$lib/roles";
  import type {
    SaveState,
    UpdateUserRequest,
    User,
    UserForm,
  } from "$lib/types";
  import {
    Badge,
    Breadcrumb,
    Button,
    SaveIndicator,
    SAVED_VISIBLE_MS,
  } from "$lib/components/ui";
  import UserModalBody from "$lib/components/UserModalBody.svelte";
  import LoadingSpinner from "$lib/components/LoadingSpinner.svelte";

  // Typed on `Role`, so adding a role to the backend list won't compile until it
  // is described here too.
  const ROLE_DESCRIPTIONS: Record<Role, string> = {
    Reader: "Kan se og laste ned noter.",
    Admin: "Full tilgang — kan også redigere arkiv, prosjekter og brukere.",
  };

  let id = $derived(page.params.id!);

  let user = $state<User | null>(null);
  let loading = $state(true);
  let notFound = $state(false);

  // Profil section (name/email/password, saved together via PUT).
  let profileForm = $state<UserForm>({
    name: "",
    email: "",
    password: "",
    active: true,
    roles: [],
  });
  let savingProfile = $state(false);
  let profileError = $state("");
  let profileSaved = $state(false);
  let profileSavedTimer: ReturnType<typeof setTimeout> | undefined;
  let rejectedPasswordRules = $state<PasswordRuleKey[]>([]);

  // Status + roles are immediate actions against their own endpoints.
  let savingStatus = $state(false);
  let statusError = $state("");
  // The role currently being written, and the one that just landed — together
  // they drive each row's save indicator.
  let savingRole = $state<Role | null>(null);
  let savedRole = $state<Role | null>(null);
  let savedRoleTimer: ReturnType<typeof setTimeout> | undefined;
  let roleError = $state("");

  // Delete confirmation.
  let confirmOpen = $state(false);
  let hardDelete = $state(false);
  let isDeleting = $state(false);
  let deleteError = $state("");

  // A blank password field keeps the current one, so the policy only has a say
  // once something has been typed into it.
  let canSaveProfile = $derived(
    !!profileForm.name.trim() &&
      !!profileForm.email.trim() &&
      (!profileForm.password ||
        isPasswordAcceptable(
          profileForm.password,
          passwordPolicy.requirements,
        )),
  );

  onMount(load);
  onDestroy(() => {
    clearTimeout(profileSavedTimer);
    clearTimeout(savedRoleTimer);
  });

  async function load() {
    loading = true;
    // The single-user endpoint is the only one that answers with the user's
    // roles — the list leaves them out — so the roles panel depends on it.
    const response = await usersApi.get(id).catch(() => null);
    // The API reports errors as a problem-details body, which the client parses
    // as happily as a real user, so trust the response only if it looks like one.
    const found = response?.id ? response : null;
    user = found;
    notFound = !found;
    if (found) {
      profileForm = {
        name: found.name ?? "",
        email: found.email ?? "",
        password: "",
        active: !found.inactive,
        roles: [...(found.roles ?? [])],
      };
    }
    loading = false;
  }

  async function saveProfile() {
    if (!canSaveProfile || !user) return;
    savingProfile = true;
    profileError = "";
    rejectedPasswordRules = [];
    const body: UpdateUserRequest = {
      name: profileForm.name.trim(),
      email: profileForm.email.trim(),
    };
    // Same emptiness test as `canSaveProfile`, so the field never looks accepted
    // while being quietly dropped from the request.
    if (profileForm.password) body.password = profileForm.password;
    const response = await usersApi.update(user.id, body);
    savingProfile = false;
    if (response.ok) {
      user = { ...user, name: body.name ?? null, email: body.email ?? null };
      profileForm.password = "";
      profileSaved = true;
      clearTimeout(profileSavedTimer);
      profileSavedTimer = setTimeout(
        () => (profileSaved = false),
        SAVED_VISIBLE_MS,
      );
      return;
    }

    // Only a password can be refused on policy grounds; anything else here is a
    // plain failure. Adopting the policy the rejection carries keeps the
    // checklist honest if the server's rules moved since the page loaded.
    const rejection = await readPasswordRejection(response);
    passwordPolicy.applyFromRejection(rejection?.requirements ?? null);
    rejectedPasswordRules = rejection?.failedRules ?? [];
    profileError = rejectedPasswordRules.length
      ? "Passordet oppfyller ikke kravene."
      : "Kunne ikke lagre endringene. Prøv igjen.";
  }

  async function toggleStatus() {
    if (!user) return;
    savingStatus = true;
    statusError = "";
    const activate = user.inactive;
    const response = activate
      ? await usersApi.activate(user.id)
      : await usersApi.deactivate(user.id);
    savingStatus = false;
    if (response.ok) user = { ...user, inactive: !activate };
    else statusError = "Kunne ikke endre status. Prøv igjen.";
  }

  function hasRole(role: Role): boolean {
    return (user?.roles ?? []).some(
      (assigned) => assigned.toLowerCase() === role.toLowerCase(),
    );
  }

  /** Progress for one role's row — the switch writes with no Lagre button. */
  function roleSaveState(role: Role): SaveState {
    if (savingRole === role) return "saving";
    if (savedRole === role) return "saved";
    return "idle";
  }

  /**
   * Assign or remove one role. The list updates before the request answers so
   * the switch responds immediately, and rolls back if the API refuses —
   * without that, a rejected change would leave the switch on over a role the
   * user never got.
   */
  async function toggleRole(role: Role, assign: boolean) {
    if (!user) return;
    const previousRoles = user.roles ?? [];

    clearTimeout(savedRoleTimer);
    savedRole = null;
    savingRole = role;
    roleError = "";
    user = {
      ...user,
      roles: assign
        ? [...previousRoles, role]
        : previousRoles.filter((assigned) => assigned !== role),
    };

    const response = assign
      ? await usersApi.assignRole(user.id, role)
      : await usersApi.removeRole(user.id, role);
    savingRole = null;

    if (response.ok) {
      savedRole = role;
      savedRoleTimer = setTimeout(() => (savedRole = null), SAVED_VISIBLE_MS);
    } else {
      user = { ...user, roles: previousRoles };
      roleError = assign
        ? `Kunne ikke gi rollen «${role}». Prøv igjen.`
        : `Kunne ikke fjerne rollen «${role}». Prøv igjen.`;
    }
  }

  function askDelete() {
    deleteError = "";
    hardDelete = false;
    confirmOpen = true;
  }

  async function confirmDelete() {
    if (!user) return;
    isDeleting = true;
    deleteError = "";
    const response = await usersApi.remove(user.id, hardDelete);
    isDeleting = false;
    if (response.ok) goto("/users");
    else deleteError = "Kunne ikke slette brukeren. Prøv igjen.";
  }
</script>

<Breadcrumb
  class="mb-4"
  items={[{ label: "Brukere", href: "/users" }, { label: user?.name ?? "-" }]}
/>

{#if loading}
  <LoadingSpinner label="Laster bruker…" />
{:else if notFound || !user}
  <div class="notfound">
    <h1 class="sbb-h1">Fant ikke brukeren</h1>
    <p>Brukeren finnes ikke, eller er allerede slettet.</p>
    <Button onclick={() => goto("/users")}>Til brukere</Button>
  </div>
{:else}
  <div class="head">
    <div class="title-cell">
      <h1 class="sbb-h1 title">{user.name}</h1>
      <p class="email">{user.email}</p>
    </div>
    {#if user.inactive}
      <Badge variant="neutral" dot>Inaktiv</Badge>
    {:else}
      <Badge variant="success" dot>Aktiv</Badge>
    {/if}
  </div>

  <!-- Profil -->
  <section class="panel">
    <h2 class="sbb-h3">Profil</h2>
    <UserModalBody form={profileForm} isEditing {rejectedPasswordRules} />
    {#if profileError}<p class="err">{profileError}</p>{/if}
    <div class="panel-foot">
      {#if profileSaved}
        <span class="saved"><Check size={15} /> Lagret</span>
      {/if}
      <Button
        loading={savingProfile}
        disabled={!canSaveProfile}
        onclick={saveProfile}
      >
        Lagre endringer
      </Button>
    </div>
  </section>

  <!-- Roller -->
  <section class="panel">
    <h2 class="sbb-h3">Roller</h2>
    <p class="hint">
      Styrer hva brukeren får tilgang til. Endringer lagres med én gang.
    </p>
    <div class="roles">
      {#each ROLES as role (role)}
        <div class="role-row">
          <Toggle
            checked={hasRole(role)}
            disabled={savingRole !== null}
            onchange={() => toggleRole(role, !hasRole(role))}
          >
            <span class="role">
              <span class="role__name">{role}</span>
              <span class="role__desc">{ROLE_DESCRIPTIONS[role]}</span>
            </span>
          </Toggle>
          <SaveIndicator state={roleSaveState(role)} />
        </div>
      {/each}
    </div>
    {#if roleError}<p class="err">{roleError}</p>{/if}
  </section>

  <!-- Status -->
  <section class="panel">
    <div class="panel-head">
      <div>
        <h2 class="sbb-h3">Status</h2>
        <p class="hint">
          Inaktive brukere beholdes, men kan ikke logge inn før de aktiveres
          igjen.
        </p>
      </div>
    </div>
    {#if statusError}<p class="err">{statusError}</p>{/if}
    <Button
      variant={user.inactive ? "primary" : "secondary"}
      loading={savingStatus}
      onclick={toggleStatus}
    >
      {#if user.inactive}
        <UserCheck size={16} /> Aktiver bruker
      {:else}
        <UserX size={16} /> Deaktiver bruker
      {/if}
    </Button>
  </section>

  <!-- Faresone -->
  <section class="panel danger">
    <h2 class="sbb-h3">Faresone</h2>
    <p class="hint">
      Slett brukeren fra systemet. Uten permanent sletting deaktiveres brukeren
      og kan gjenopprettes senere.
    </p>
    <Button variant="danger" onclick={askDelete}>
      <Trash2 size={16} /> Slett bruker
    </Button>
  </section>
{/if}

<Modal bind:open={confirmOpen} size="xs">
  <div class="confirm-body">
    <span class="danger-ico"><Trash2 size={22} /></span>
    <h3>Slette bruker?</h3>
    <p>«{user?.name}» fjernes.</p>
    <div class="hard">
      <Checkbox bind:checked={hardDelete}>
        Slett permanent (kan ikke angres). Uten dette deaktiveres brukeren og
        kan gjenopprettes senere.
      </Checkbox>
    </div>
    {#if deleteError}<p class="err">{deleteError}</p>{/if}
  </div>
  {#snippet footer()}
    <Button variant="ghost" onclick={() => (confirmOpen = false)}>Avbryt</Button
    >
    <Button variant="danger" loading={isDeleting} onclick={confirmDelete}>
      <Trash2 size={16} />
      {hardDelete ? "Slett permanent" : "Slett"}
    </Button>
  {/snippet}
</Modal>

<style>
  .head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    flex-wrap: wrap;
    margin-bottom: 28px;
  }
  .title {
    margin: 0;
    font-size: 40px;
  }
  .email {
    margin: 6px 0 0;
    font-size: 14px;
    color: var(--text-secondary);
  }

  .panel {
    padding: 24px;
    background: var(--surface-card);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
    margin-bottom: 20px;
    max-width: 640px;
  }
  .panel h2 {
    margin: 0 0 16px;
    font-size: 20px;
  }
  .panel.danger {
    border-color: color-mix(in srgb, var(--danger) 40%, var(--border-subtle));
  }
  .panel-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
  }
  .panel-head h2 {
    margin: 0 0 4px;
  }
  .panel-foot {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 14px;
    margin-top: 20px;
  }
  .saved {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    color: var(--success);
  }
  .hint {
    font-size: 13px;
    color: var(--text-muted);
    line-height: 1.5;
    margin: 0 0 16px;
  }
  .err {
    margin: 14px 0 0;
    font-size: 13px;
    color: var(--danger);
  }

  /* Roles editor — one row per pre-defined role. */
  .roles {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  /* The save indicator sits opposite the switch, reading as a status column. */
  .role-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .role {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .role__name {
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--text-primary);
  }
  .role__desc {
    font-size: 12.5px;
    line-height: 1.45;
    color: var(--text-muted);
  }

  .notfound {
    text-align: center;
    padding: 60px 24px;
  }
  .notfound p {
    margin: 10px 0 20px;
    color: var(--text-secondary);
  }

  /* Delete confirmation. */
  .confirm-body {
    text-align: center;
  }
  .danger-ico {
    width: 46px;
    height: 46px;
    border-radius: 999px;
    background: var(--danger-soft);
    color: var(--danger);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
  }
  .confirm-body h3 {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 22px;
    margin: 0 0 8px;
  }
  .confirm-body p {
    font-size: 14px;
    color: var(--text-secondary);
    margin: 0;
    line-height: 1.55;
  }
  .confirm-body .hard {
    text-align: left;
    margin-top: 18px;
  }
  .confirm-body .hard :global(label) {
    align-items: flex-start;
    gap: 10px;
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.5;
  }

  @media (max-width: 720px) {
    .title {
      font-size: 30px;
    }
  }
</style>
