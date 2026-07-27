<script lang="ts">
  import { onMount } from "svelte";
  import { Modal, Checkbox } from "flowbite-svelte";
  import { Plus, SearchX, Trash2, AlertTriangle, Check } from "@lucide/svelte";
  import { users as usersApi, userManagementV2 } from "$lib/api/users";
  import type { UpdateUserRequest, User, UserForm } from "$lib/types";
  import { Badge, Button, EmptyState, SearchInput } from "$lib/components/ui";
  import UserModalBody from "$lib/components/UserModalBody.svelte";
  import LoadingSpinner from "$lib/components/LoadingSpinner.svelte";

  let users = $state<User[]>([]);
  let loading = $state(true);

  // Client-side search over the already-loaded list (the endpoint returns
  // every user in one call), matching on name or e-mail.
  let searchTerm = $state("");
  let filteredUsers = $derived.by(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return users;
    return users.filter(
      (user) =>
        (user.name ?? "").toLowerCase().includes(query) ||
        (user.email ?? "").toLowerCase().includes(query),
    );
  });

  // Create/edit modal. `editing` holds the user being edited, or null when
  // creating. `form` is the working copy the modal mutates in place.
  let isOpen = $state(false);
  let isSaving = $state(false);
  let editing = $state<User | null>(null);
  let form = $state<UserForm>(emptyForm());
  let errorMessage = $state("");

  // Delete confirmation.
  let confirmOpen = $state(false);
  let isDeleting = $state(false);
  let hardDelete = $state(false);
  let deleteError = $state("");

  // Name and e-post are always required; a password is only required when
  // creating (on edit, blank means "keep the current password").
  let canSave = $derived(
    !!form.name.trim() &&
      !!form.email.trim() &&
      (editing !== null || !!form.password.trim()),
  );

  function emptyForm(): UserForm {
    return { name: "", email: "", password: "", active: true, roles: [] };
  }

  onMount(async () => {
    users = (await usersApi.list()) ?? [];
    loading = false;
  });

  async function reload() {
    users = (await usersApi.list()) ?? [];
  }

  function openCreate() {
    editing = null;
    form = emptyForm();
    errorMessage = "";
    isOpen = true;
  }

  function openEdit(user: User) {
    editing = user;
    form = {
      name: user.name ?? "",
      email: user.email ?? "",
      password: "",
      active: !user.inactive,
      roles: [...(user.roles ?? [])],
    };
    errorMessage = "";
    isOpen = true;
  }

  // Roles live behind their own endpoints, so diff the draft against the
  // original and add/remove only what changed.
  async function syncRoles(id: string, original: string[], next: string[]) {
    for (const role of original) {
      if (!next.includes(role)) {
        const response = await usersApi.removeRole(id, role);
        if (!response.ok) throw new Error("removeRole failed");
      }
    }
    for (const role of next) {
      if (!original.includes(role)) {
        const response = await usersApi.assignRole(id, role);
        if (!response.ok) throw new Error("assignRole failed");
      }
    }
  }

  async function save() {
    if (!canSave) return;
    isSaving = true;
    errorMessage = "";

    try {
      if (editing) {
        const body: UpdateUserRequest = {
          name: form.name.trim(),
          email: form.email.trim(),
        };
        // Only send a password when one was entered.
        if (form.password.trim()) body.password = form.password;
        const response = await usersApi.update(editing.id, body);
        if (!response.ok) throw new Error("update failed");

        if (userManagementV2) {
          // Status and roles are separate endpoints — apply only if changed.
          const wasActive = !editing.inactive;
          if (form.active !== wasActive) {
            const statusResponse = form.active
              ? await usersApi.activate(editing.id)
              : await usersApi.deactivate(editing.id);
            if (!statusResponse.ok) throw new Error("status change failed");
          }
          await syncRoles(editing.id, editing.roles ?? [], form.roles);
        }
      } else {
        // Register only returns 200 with no body (no id), so roles/status must
        // be set afterwards by reopening the user.
        const response = await usersApi.create({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
        });
        if (!response.ok) throw new Error("create failed");
      }
      await reload();
      isOpen = false;
    } catch {
      errorMessage = "Kunne ikke lagre brukeren. Prøv igjen.";
      await reload();
    } finally {
      isSaving = false;
    }
  }

  function askDelete() {
    deleteError = "";
    hardDelete = false;
    isOpen = false;
    confirmOpen = true;
  }

  async function confirmDelete() {
    if (!editing) return;
    isDeleting = true;
    deleteError = "";
    const response = await usersApi.remove(editing.id, hardDelete);
    isDeleting = false;
    if (response.ok) {
      confirmOpen = false;
      editing = null;
      await reload();
    } else {
      deleteError = "Kunne ikke slette brukeren. Prøv igjen.";
    }
  }
</script>

{#snippet statusBadge(user: User)}
  {#if user.inactive}
    <Badge variant="neutral" dot>Inaktiv</Badge>
  {:else}
    <Badge variant="success" dot>Aktiv</Badge>
  {/if}
{/snippet}

{#snippet roleChips(roles: string[] | null | undefined)}
  {#if roles && roles.length}
    <div class="chips">
      {#each roles as role}
        <span class="chip">{role}</span>
      {/each}
    </div>
  {:else}
    <span class="chip none">—</span>
  {/if}
{/snippet}

<div class="sbb-list-head">
  <h1 class="sbb-h1">Brukere</h1>
  <Button class="create-btn" onclick={openCreate}>
    <Plus size={17} /> Legg til bruker
  </Button>
</div>

<SearchInput placeholder="Søk i brukere…" bind:value={searchTerm} />

{#if loading}
  <LoadingSpinner />
{:else if filteredUsers.length === 0 && searchTerm.trim()}
  <EmptyState
    title="Ingen treff"
    description={`Fant ingen brukere som matcher «${searchTerm.trim()}». Prøv et annet søk.`}
  >
    {#snippet icon()}<SearchX size={28} strokeWidth={1.6} />{/snippet}
  </EmptyState>
{:else}
  <div class="sbb-table-wrap table-view">
    <table class="sbb-table">
      <thead>
        <tr>
          <th>Navn</th>
          <th>E-post</th>
          {#if userManagementV2}<th class="c-roles">Roller</th>{/if}
          <th class="c-status">Status</th>
        </tr>
      </thead>
      <tbody>
        {#each filteredUsers as user (user.id)}
          <tr class="clickable" onclick={() => openEdit(user)}>
            <td class="c-name">{user.name}</td>
            <td class="c-muted">{user.email}</td>
            {#if userManagementV2}
              <td class="c-roles">{@render roleChips(user.roles)}</td>
            {/if}
            <td class="c-status">{@render statusBadge(user)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <!-- Mobile: the table reflows into a card list. -->
  <div class="sbb-card-list">
    {#each filteredUsers as user (user.id)}
      <div class="sbb-card clickable" onclick={() => openEdit(user)}>
        <div class="body">
          <div class="t">{user.name}</div>
          <div class="meta">{user.email}</div>
          {#if userManagementV2 && user.roles && user.roles.length}
            <div class="card-chips">{@render roleChips(user.roles)}</div>
          {/if}
        </div>
        <div class="acts">{@render statusBadge(user)}</div>
      </div>
    {/each}
  </div>
{/if}

<Modal
  title={editing ? "Rediger bruker" : "Legg til bruker"}
  bind:open={isOpen}
  size="md"
>
  <UserModalBody
    {form}
    isEditing={editing !== null}
    showStatusAndRoles={editing !== null && userManagementV2}
  />
  {#if errorMessage}
    <p class="error-message">{errorMessage}</p>
  {/if}
  {#snippet footer()}
    {#if editing && userManagementV2}
      <Button
        variant="ghost"
        onclick={askDelete}
        style="margin-right:auto;color:var(--danger)"
      >
        <Trash2 size={16} /> Slett
      </Button>
    {/if}
    <Button variant="ghost" onclick={() => (isOpen = false)}>Lukk</Button>
    <Button loading={isSaving} disabled={!canSave} onclick={save}>
      <Check size={16} /> Lagre
    </Button>
  {/snippet}
</Modal>

<Modal bind:open={confirmOpen} size="xs">
  <div class="confirm-body">
    <span class="danger-ico"><Trash2 size={22} /></span>
    <h3>Slette bruker?</h3>
    <p>«{editing?.name}» fjernes.</p>
    <div class="hard">
      <Checkbox bind:checked={hardDelete}>
        Slett permanent (kan ikke angres). Uten dette deaktiveres brukeren og
        kan gjenopprettes senere.
      </Checkbox>
    </div>
    {#if hardDelete}
      <div class="warn">
        <span class="wi"><AlertTriangle size={17} /></span>
        <span>Permanent sletting kan ikke reverseres.</span>
      </div>
    {/if}
    {#if deleteError}
      <p class="error-message">{deleteError}</p>
    {/if}
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
  .c-name {
    font-weight: 500;
  }
  .c-muted {
    color: var(--text-secondary);
  }
  .c-roles {
    width: 34%;
  }
  .c-status {
    width: 130px;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    height: 26px;
    padding: 0 10px;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-secondary);
    background: var(--surface-sunken);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-full);
    white-space: nowrap;
  }
  .chip.none {
    padding-left: 0;
    color: var(--text-muted);
    background: transparent;
    border-color: transparent;
  }
  .card-chips {
    margin-top: 8px;
  }

  .error-message {
    margin-top: 16px;
    font-family: var(--font-text);
    font-size: 13px;
    color: var(--danger);
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
  .confirm-body .warn {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    text-align: left;
    margin-top: 14px;
    padding: 12px 14px;
    background: var(--danger-soft);
    border-radius: var(--radius-md);
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.5;
  }
  .confirm-body .warn .wi {
    color: var(--danger);
    flex-shrink: 0;
    margin-top: 1px;
  }
</style>
