<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { Modal, Checkbox } from "flowbite-svelte";
  import { Plus, X, Trash2, Check, UserX, UserCheck } from "@lucide/svelte";
  import { users as usersApi } from "$lib/api/users";
  import type { UpdateUserRequest, User, UserForm } from "$lib/types";
  import { Badge, Breadcrumb, Button } from "$lib/components/ui";
  import UserModalBody from "$lib/components/UserModalBody.svelte";
  import LoadingSpinner from "$lib/components/LoadingSpinner.svelte";

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

  // Status + roles are immediate actions against their own endpoints.
  let savingStatus = $state(false);
  let statusError = $state("");
  let roleInput = $state("");
  let savingRole = $state(false);
  let roleError = $state("");

  // Delete confirmation.
  let confirmOpen = $state(false);
  let hardDelete = $state(false);
  let isDeleting = $state(false);
  let deleteError = $state("");

  let canSaveProfile = $derived(
    !!profileForm.name.trim() && !!profileForm.email.trim(),
  );

  onMount(load);
  onDestroy(() => clearTimeout(profileSavedTimer));

  async function load() {
    loading = true;
    // GET /users/{id} leaves its body undefined in the spec; the list returns
    // full User objects we already rely on, so resolve the user from there.
    const all = (await usersApi.list()) ?? [];
    const found = all.find((candidate) => candidate.id === id) ?? null;
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
    const body: UpdateUserRequest = {
      name: profileForm.name.trim(),
      email: profileForm.email.trim(),
    };
    if (profileForm.password.trim()) body.password = profileForm.password;
    const response = await usersApi.update(user.id, body);
    savingProfile = false;
    if (response.ok) {
      user = { ...user, name: body.name ?? null, email: body.email ?? null };
      profileForm.password = "";
      profileSaved = true;
      clearTimeout(profileSavedTimer);
      profileSavedTimer = setTimeout(() => (profileSaved = false), 2000);
    } else {
      profileError = "Kunne ikke lagre endringene. Prøv igjen.";
    }
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

  async function addRole() {
    const value = roleInput.trim();
    if (!value || !user) return;
    if (
      (user.roles ?? []).some((r) => r.toLowerCase() === value.toLowerCase())
    ) {
      roleInput = "";
      return;
    }
    savingRole = true;
    roleError = "";
    const response = await usersApi.assignRole(user.id, value);
    savingRole = false;
    if (response.ok) {
      user = { ...user, roles: [...(user.roles ?? []), value] };
      roleInput = "";
    } else {
      roleError = "Kunne ikke legge til rollen. Prøv igjen.";
    }
  }

  async function removeRole(role: string) {
    if (!user) return;
    savingRole = true;
    roleError = "";
    const response = await usersApi.removeRole(user.id, role);
    savingRole = false;
    if (response.ok)
      user = { ...user, roles: (user.roles ?? []).filter((r) => r !== role) };
    else roleError = "Kunne ikke fjerne rollen. Prøv igjen.";
  }

  function onRoleKeydown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault();
      addRole();
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
    <UserModalBody form={profileForm} isEditing />
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
      Styrer brukerens tilganger — f.eks. «Admin» for administratorrettigheter.
    </p>
    <div class="role-input">
      <input
        class="role-field"
        placeholder="Skriv en rolle og trykk Enter"
        bind:value={roleInput}
        onkeydown={onRoleKeydown}
        disabled={savingRole}
      />
      <button
        type="button"
        class="role-add"
        onclick={addRole}
        disabled={savingRole || !roleInput.trim()}
      >
        <Plus size={15} /> Legg til
      </button>
    </div>
    {#if roleError}<p class="err">{roleError}</p>{/if}
    {#if (user.roles ?? []).length === 0}
      <p class="hint empty">Ingen roller tildelt.</p>
    {:else}
      <div class="role-chips">
        {#each user.roles ?? [] as role (role)}
          <span class="ed-chip">
            {role}
            <button
              type="button"
              onclick={() => removeRole(role)}
              disabled={savingRole}
              aria-label={`Fjern ${role}`}
            >
              <X size={13} />
            </button>
          </span>
        {/each}
      </div>
    {/if}
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
  .hint.empty {
    margin: 14px 0 0;
    font-style: italic;
  }
  .err {
    margin: 14px 0 0;
    font-size: 13px;
    color: var(--danger);
  }

  /* Roles editor. */
  .role-input {
    display: flex;
    gap: 9px;
  }
  .role-field {
    flex: 1;
    height: 42px;
    padding: 0 14px;
    font-family: var(--font-text);
    font-size: 14px;
    color: var(--text-primary);
    background: var(--surface-sunken);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-sm);
    outline: none;
    transition:
      border-color var(--dur-fast),
      box-shadow var(--dur-fast);
  }
  .role-field:focus {
    border-color: var(--accent);
    box-shadow: var(--ring-focus);
  }
  .role-add {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    height: 42px;
    padding: 0 15px;
    font-family: var(--font-text);
    font-weight: 600;
    font-size: 13px;
    color: var(--accent);
    background: transparent;
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition:
      background var(--dur-fast),
      border-color var(--dur-fast);
  }
  .role-add:hover:not(:disabled) {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .role-add:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .role-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 14px;
  }
  .ed-chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 30px;
    padding: 0 6px 0 12px;
    font-family: var(--font-mono);
    font-size: 12.5px;
    color: var(--text-secondary);
    background: var(--surface-sunken);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-full);
  }
  .ed-chip button {
    width: 20px;
    height: 20px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    background: transparent;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    transition: all var(--dur-fast);
  }
  .ed-chip button:hover:not(:disabled) {
    color: var(--danger);
    background: var(--danger-soft);
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
