<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { Modal } from "flowbite-svelte";
  import { Plus, SearchX, Check } from "@lucide/svelte";
  import { users as usersApi } from "$lib/api/users";
  import {
    isPasswordAcceptable,
    readPasswordRejection,
    type PasswordRuleKey,
  } from "$lib/password";
  import { passwordPolicy } from "$lib/stores/passwordPolicy.svelte";
  import type { User, UserForm } from "$lib/types";
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

  // Create-only modal. Editing (profile, status, roles, delete) lives on the
  // dedicated /user/edit/[id] page, reached by clicking a row.
  let isOpen = $state(false);
  let isSaving = $state(false);
  let form = $state<UserForm>(emptyForm());
  let errorMessage = $state("");
  let rejectedPasswordRules = $state<PasswordRuleKey[]>([]);

  // The password has to clear the API's policy before Lagre unlocks — the
  // checklist under the field says which rule is still outstanding, so the
  // disabled button is never a mystery.
  let canSave = $derived(
    !!form.name.trim() &&
      !!form.email.trim() &&
      isPasswordAcceptable(form.password, passwordPolicy.requirements),
  );

  function emptyForm(): UserForm {
    return { name: "", email: "", password: "", active: true, roles: [] };
  }

  onMount(async () => {
    users = (await usersApi.list()) ?? [];
    loading = false;
  });

  function openCreate() {
    form = emptyForm();
    errorMessage = "";
    rejectedPasswordRules = [];
    isOpen = true;
  }

  async function save() {
    if (!canSave) return;
    isSaving = true;
    errorMessage = "";
    rejectedPasswordRules = [];
    const response = await usersApi.create({
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
    });
    isSaving = false;
    if (response.ok) {
      isOpen = false;
      loading = true;
      users = (await usersApi.list()) ?? [];
      loading = false;
      return;
    }

    // A password the API refuses despite passing our checklist means its policy
    // is ahead of the one we loaded — take the copy it sends back, so the rows
    // it named turn red and the checklist starts judging by the real rules.
    const rejection = await readPasswordRejection(response);
    passwordPolicy.applyFromRejection(rejection?.requirements ?? null);
    rejectedPasswordRules = rejection?.failedRules ?? [];
    errorMessage = rejectedPasswordRules.length
      ? "Passordet oppfyller ikke kravene."
      : "Kunne ikke lagre brukeren. Prøv igjen.";
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
          <th class="c-roles">Roller</th>
          <th class="c-status">Status</th>
        </tr>
      </thead>
      <tbody>
        {#each filteredUsers as user (user.id)}
          <tr class="clickable" onclick={() => goto(`/user/edit/${user.id}`)}>
            <td class="c-name">{user.name}</td>
            <td class="c-muted">{user.email}</td>
            <td class="c-roles">{@render roleChips(user.roles)}</td>
            <td class="c-status">{@render statusBadge(user)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <!-- Mobile: the table reflows into a card list. -->
  <div class="sbb-card-list">
    {#each filteredUsers as user (user.id)}
      <div
        class="sbb-card clickable"
        onclick={() => goto(`/user/edit/${user.id}`)}
      >
        <div class="body">
          <div class="t">{user.name}</div>
          <div class="meta">{user.email}</div>
          {#if user.roles && user.roles.length}
            <div class="card-chips">{@render roleChips(user.roles)}</div>
          {/if}
        </div>
        <div class="acts">{@render statusBadge(user)}</div>
      </div>
    {/each}
  </div>
{/if}

<Modal title="Legg til bruker" bind:open={isOpen} size="md">
  <UserModalBody {form} isEditing={false} {rejectedPasswordRules} />
  {#if errorMessage}
    <p class="error-message">{errorMessage}</p>
  {/if}
  {#snippet footer()}
    <Button variant="ghost" onclick={() => (isOpen = false)}>Lukk</Button>
    <Button loading={isSaving} disabled={!canSave} onclick={save}>
      <Check size={16} /> Lagre
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
</style>
