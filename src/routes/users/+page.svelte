<script lang="ts">
  import { onMount } from "svelte";
  import {
    Button,
    Table,
    TableHead,
    TableHeadCell,
    TableBody,
    TableBodyRow,
    TableBodyCell,
  } from "flowbite-svelte";
  import { users as usersApi } from "$lib/api/users";
  import type { User } from "$lib/types";
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

<div class="mb-6 flex items-center justify-between">
  <h1 class="text-3xl font-semibold">Brukere</h1>
  <Button size="sm" onclick={openModal}>+ Legg til bruker</Button>
</div>

<Table>
  <TableHead>
    <TableHeadCell>Navn</TableHeadCell>
    <TableHeadCell>E-post</TableHeadCell>
    <TableHeadCell>Inaktiv</TableHeadCell>
  </TableHead>
  <TableBody>
    {#each users as user (user.id)}
      <TableBodyRow>
        <TableBodyCell class="font-normal">{user.name}</TableBodyCell>
        <TableBodyCell class="font-normal">{user.email}</TableBodyCell>
        <TableBodyCell class="font-normal">{user.inactive}</TableBodyCell>
      </TableBodyRow>
    {/each}
  </TableBody>
</Table>

{#if loading}
  <LoadingSpinner />
{/if}
