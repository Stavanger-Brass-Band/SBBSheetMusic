<script lang="ts">
  import { onMount } from "svelte";
  import {
    Table,
    TableHead,
    TableHeadCell,
    TableBody,
    TableBodyRow,
    TableBodyCell,
  } from "flowbite-svelte";
  import { Plus } from "@lucide/svelte";
  import { users as usersApi } from "$lib/api/users";
  import type { User } from "$lib/types";
  import { Badge, Button } from "$lib/components/ui";
  import LoadingSpinner from "$lib/components/LoadingSpinner.svelte";

  let users = $state<User[]>([]);
  let loading = $state(true);

  onMount(async () => {
    users = await usersApi.list();
    loading = false;
  });

  // Adding users was never implemented in the original app; left as a stub
  // for a later phase.
  function openModal() {
    alert("Legg til bruker er ikke implementert ennå.");
  }
</script>

<div class="sbb-list-head">
  <h1 class="sbb-h1">Brukere</h1>
  <Button class="create-btn" onclick={openModal}>
    <Plus size={17} /> Legg til bruker
  </Button>
</div>

<Table class="sbb-table" divClass="sbb-table-wrap table-view">
  <TableHead>
    <TableHeadCell>Navn</TableHeadCell>
    <TableHeadCell>E-post</TableHeadCell>
    <TableHeadCell>Inaktiv</TableHeadCell>
  </TableHead>
  <TableBody>
    {#each users as user (user.id)}
      <TableBodyRow>
        <TableBodyCell>{user.name}</TableBodyCell>
        <TableBodyCell>{user.email}</TableBodyCell>
        <TableBodyCell>{user.inactive}</TableBodyCell>
      </TableBodyRow>
    {/each}
  </TableBody>
</Table>

<!-- Mobile: the table reflows into a card list. -->
<div class="sbb-card-list">
  {#each users as user (user.id)}
    <div class="sbb-card">
      <div class="body">
        <div class="t">{user.name}</div>
        <div class="meta">{user.email}</div>
      </div>
      {#if user.inactive}
        <div class="acts"><Badge variant="neutral">Inaktiv</Badge></div>
      {/if}
    </div>
  {/each}
</div>

{#if loading}
  <LoadingSpinner />
{/if}
