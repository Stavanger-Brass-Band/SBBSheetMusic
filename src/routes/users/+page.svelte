<script lang="ts">
  import { onMount } from "svelte";
  import {
    Modal,
    Table,
    TableHead,
    TableHeadCell,
    TableBody,
    TableBodyRow,
    TableBodyCell,
  } from "flowbite-svelte";
  import { Plus, SearchX } from "@lucide/svelte";
  import { users as usersApi } from "$lib/api/users";
  import type { UpdateUserRequest, User } from "$lib/types";
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

  // Modal state, shared by create and edit. `editing` holds the user being
  // edited, or null when creating a new one. `form` is the working copy the
  // modal mutates in place.
  let isOpen = $state(false);
  let isSaving = $state(false);
  let editing = $state<User | null>(null);
  let form = $state<UpdateUserRequest>({});
  let errorMessage = $state("");

  // Name and e-post are always required; a password is only required when
  // creating (on edit, blank means "keep the current password").
  let canSave = $derived(
    !!form.name?.trim() &&
      !!form.email?.trim() &&
      (editing !== null || !!form.password?.trim()),
  );

  onMount(async () => {
    users = (await usersApi.list()) ?? [];
    loading = false;
  });

  function openCreate() {
    editing = null;
    form = {};
    errorMessage = "";
    isOpen = true;
  }

  function openEdit(user: User) {
    editing = user;
    form = { name: user.name, email: user.email };
    errorMessage = "";
    isOpen = true;
  }

  async function save() {
    if (!canSave) return;
    isSaving = true;
    errorMessage = "";

    let response: Response;
    if (editing) {
      const body: UpdateUserRequest = {
        name: form.name ?? null,
        email: form.email ?? null,
      };
      // Only send a password when one was entered, so an empty field leaves
      // the current password untouched.
      if (form.password?.trim()) body.password = form.password;
      response = await usersApi.update(editing.id, body);
    } else {
      response = await usersApi.create({
        name: form.name ?? null,
        email: form.email ?? null,
        password: form.password ?? null,
      });
    }

    isSaving = false;
    if (response.ok) {
      isOpen = false;
      // The write endpoints return no body, so reload to reflect the change.
      loading = true;
      users = (await usersApi.list()) ?? [];
      loading = false;
    } else {
      errorMessage = "Kunne ikke lagre brukeren. Prøv igjen.";
    }
  }
</script>

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
  <Table class="sbb-table" divClass="sbb-table-wrap table-view">
    <TableHead>
      <TableHeadCell>Navn</TableHeadCell>
      <TableHeadCell>E-post</TableHeadCell>
      <TableHeadCell>Status</TableHeadCell>
    </TableHead>
    <TableBody>
      {#each filteredUsers as user (user.id)}
        <TableBodyRow class="clickable" onclick={() => openEdit(user)}>
          <TableBodyCell>{user.name}</TableBodyCell>
          <TableBodyCell>{user.email}</TableBodyCell>
          <TableBodyCell>
            {#if user.inactive}
              <Badge variant="neutral" dot>Inaktiv</Badge>
            {:else}
              <Badge variant="success" dot>Aktiv</Badge>
            {/if}
          </TableBodyCell>
        </TableBodyRow>
      {/each}
    </TableBody>
  </Table>

  <!-- Mobile: the table reflows into a card list. -->
  <div class="sbb-card-list">
    {#each filteredUsers as user (user.id)}
      <div class="sbb-card clickable" onclick={() => openEdit(user)}>
        <div class="body">
          <div class="t">{user.name}</div>
          <div class="meta">{user.email}</div>
        </div>
        <div class="acts">
          {#if user.inactive}
            <Badge variant="neutral" dot>Inaktiv</Badge>
          {:else}
            <Badge variant="success" dot>Aktiv</Badge>
          {/if}
        </div>
      </div>
    {/each}
  </div>
{/if}

<Modal
  title={editing ? "Rediger bruker" : "Legg til bruker"}
  bind:open={isOpen}
  size="md"
>
  <UserModalBody user={form} isEditing={editing !== null} />
  {#if errorMessage}
    <p class="error-message">{errorMessage}</p>
  {/if}
  {#snippet footer()}
    <Button loading={isSaving} disabled={!canSave} onclick={save}>Lagre</Button>
    <Button variant="ghost" onclick={() => (isOpen = false)}>Lukk</Button>
  {/snippet}
</Modal>

<style>
  .error-message {
    margin-top: 16px;
    font-family: var(--font-text);
    font-size: 13px;
    color: var(--danger);
  }
</style>
