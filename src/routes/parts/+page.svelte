<script lang="ts">
  import { onMount } from "svelte";
  import { Modal } from "flowbite-svelte";
  import {
    Plus,
    SearchX,
    ListMusic,
    Pencil,
    Trash2,
    AlertTriangle,
    Check,
  } from "@lucide/svelte";
  import { parts as partsApi } from "$lib/api/parts";
  import type { Part, PartForm, PartRequest } from "$lib/types";
  import { Badge, Button, EmptyState, SearchInput } from "$lib/components/ui";
  import PartModalBody from "$lib/components/PartModalBody.svelte";
  import LoadingSpinner from "$lib/components/LoadingSpinner.svelte";

  const MAX_CHIPS = 3;

  let allParts = $state<Part[]>([]);
  let loading = $state(true);

  // Client-side search over the loaded catalog (the endpoint returns every
  // part in one call), matching on name or any alias, sorted by sortOrder.
  let searchTerm = $state("");
  let filtered = $derived.by(() => {
    const sorted = [...allParts].sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
    );
    const query = searchTerm.trim().toLowerCase();
    if (!query) return sorted;
    return sorted.filter(
      (part) =>
        (part.name ?? "").toLowerCase().includes(query) ||
        (part.aliases ?? []).some((alias) =>
          alias.toLowerCase().includes(query),
        ),
    );
  });
  let indexableCount = $derived(
    allParts.filter((part) => part.indexable).length,
  );

  // Create/edit modal. `editing` holds the part being edited, or null when
  // creating. `form` is the working copy the modal mutates in place.
  let isOpen = $state(false);
  let isSaving = $state(false);
  let editing = $state<Part | null>(null);
  let form = $state<PartForm>({
    name: "",
    sortOrder: 0,
    indexable: true,
    aliases: [],
  });
  let errorMessage = $state("");

  // Delete confirmation.
  let confirmOpen = $state(false);
  let isDeleting = $state(false);
  let deleteError = $state("");

  let canSave = $derived(!!form.name.trim());

  onMount(async () => {
    allParts = (await partsApi.list()) ?? [];
    loading = false;
  });

  async function reload() {
    allParts = (await partsApi.list()) ?? [];
  }

  // New parts get the next free slot, leaving gaps to reorder between.
  function nextOrder(): number {
    return allParts.length
      ? Math.max(...allParts.map((part) => part.sortOrder ?? 0)) + 10
      : 10;
  }

  function openCreate() {
    editing = null;
    form = { name: "", sortOrder: nextOrder(), indexable: true, aliases: [] };
    errorMessage = "";
    isOpen = true;
  }

  function openEdit(part: Part) {
    editing = part;
    form = {
      name: part.name ?? "",
      sortOrder: part.sortOrder ?? 0,
      indexable: part.indexable ?? false,
      aliases: [...(part.aliases ?? [])],
    };
    errorMessage = "";
    isOpen = true;
  }

  // Aliases live behind their own endpoints, so diff the draft against the
  // original and add/remove only what changed.
  async function syncAliases(id: string, original: string[], next: string[]) {
    const nextLower = next.map((alias) => alias.toLowerCase());
    const originalLower = original.map((alias) => alias.toLowerCase());
    for (const alias of original) {
      if (!nextLower.includes(alias.toLowerCase()))
        await partsApi.removeAlias(id, alias);
    }
    for (const alias of next) {
      if (!originalLower.includes(alias.toLowerCase()))
        await partsApi.addAlias(id, alias);
    }
  }

  async function save() {
    if (!canSave) return;
    isSaving = true;
    errorMessage = "";
    const body: PartRequest = {
      name: form.name.trim(),
      sortOrder: form.sortOrder,
      indexable: form.indexable,
    };
    try {
      if (editing) {
        const updated = await partsApi.update(editing.id!, body);
        if (!updated) throw new Error("update failed");
        await syncAliases(editing.id!, editing.aliases ?? [], form.aliases);
      } else {
        const created = await partsApi.create(body);
        if (!created?.id) throw new Error("create failed");
        await syncAliases(created.id, [], form.aliases);
      }
      await reload();
      isOpen = false;
    } catch {
      errorMessage = "Kunne ikke lagre stemmen. Prøv igjen.";
      // Reflect whatever did persist (e.g. the part saved but an alias failed).
      await reload();
    } finally {
      isSaving = false;
    }
  }

  function askDelete() {
    // Mirror the design: the edit dialog steps aside for the confirmation.
    deleteError = "";
    isOpen = false;
    confirmOpen = true;
  }

  async function confirmDelete() {
    if (!editing) return;
    isDeleting = true;
    deleteError = "";
    const response = await partsApi.remove(editing.id!);
    isDeleting = false;
    if (response.ok) {
      confirmOpen = false;
      editing = null;
      await reload();
    } else {
      deleteError = "Kunne ikke slette stemmen. Prøv igjen.";
    }
  }
</script>

{#snippet aliasChips(aliases: string[])}
  {#if aliases.length === 0}
    <span class="chip none">Ingen aliaser</span>
  {:else}
    <div class="chips">
      {#each aliases.slice(0, MAX_CHIPS) as alias}
        <span class="chip">{alias}</span>
      {/each}
      {#if aliases.length > MAX_CHIPS}
        <span class="chip more">+{aliases.length - MAX_CHIPS}</span>
      {/if}
    </div>
  {/if}
{/snippet}

{#snippet indexBadge(part: Part)}
  {#if part.indexable}
    <Badge variant="success" dot>Indekseres</Badge>
  {:else}
    <Badge variant="neutral" dot>Skjult</Badge>
  {/if}
{/snippet}

<div class="sbb-list-head">
  <div class="title-cell">
    <h1 class="sbb-h1">Stemmekatalog</h1>
    <p class="lede">
      Definerer alle stemmer i korpset. Aliaser brukes til å automatisk
      gjenkjenne opplastede filnavn ved masseopplasting.
    </p>
  </div>
  <Button class="create-btn" onclick={openCreate}>
    <Plus size={17} /> Legg til stemme
  </Button>
</div>

<SearchInput placeholder="Søk i stemmer og aliaser…" bind:value={searchTerm} />

{#if loading}
  <LoadingSpinner label="Laster stemmekatalog…" />
{:else if filtered.length === 0}
  {#if searchTerm.trim()}
    <EmptyState
      title="Ingen treff"
      description={`Fant ingen stemmer som passer «${searchTerm.trim()}». Prøv et annet søk, eller sjekk om navnet finnes som et alias.`}
    >
      {#snippet icon()}<SearchX size={28} strokeWidth={1.6} />{/snippet}
    </EmptyState>
  {:else}
    <EmptyState
      title="Ingen stemmer ennå"
      description="Stemmekatalogen er tom. Legg til den første stemmen for å begynne å bygge oppsettet som driver automatisk gjenkjenning."
    >
      {#snippet icon()}<ListMusic size={28} strokeWidth={1.6} />{/snippet}
    </EmptyState>
  {/if}
{:else}
  <div class="sbb-table-wrap table-view">
    <table class="sbb-table">
      <thead>
        <tr>
          <th class="c-order">Rekkefølge</th>
          <th>Navn</th>
          <th>Aliaser</th>
          <th class="c-index">Indeksering</th>
          <th class="c-edit"></th>
        </tr>
      </thead>
      <tbody>
        {#each filtered as part (part.id)}
          <tr class="clickable" onclick={() => openEdit(part)}>
            <td class="c-order">{part.sortOrder}</td>
            <td class="c-name">{part.name}</td>
            <td class="c-aliases">{@render aliasChips(part.aliases ?? [])}</td>
            <td class="c-index">{@render indexBadge(part)}</td>
            <td class="c-edit">
              <span class="editlink" title="Rediger"><Pencil size={15} /></span>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <!-- Mobile: the table reflows into a card list. -->
  <div class="sbb-card-list">
    {#each filtered as part (part.id)}
      <div class="sbb-card clickable" onclick={() => openEdit(part)}>
        <span class="nr">{part.sortOrder}</span>
        <div class="body">
          <div class="t">{part.name}</div>
          <div class="card-chips">{@render aliasChips(part.aliases ?? [])}</div>
          <div class="card-badge">{@render indexBadge(part)}</div>
        </div>
      </div>
    {/each}
  </div>

  <p class="foot-note">
    Viser <b>{filtered.length}</b> stemmer · <b>{indexableCount}</b> brukes i automatisk
    gjenkjenning.
  </p>
{/if}

<Modal
  title={editing ? "Rediger stemme" : "Ny stemme"}
  bind:open={isOpen}
  size="md"
>
  <PartModalBody {form} />
  {#if errorMessage}
    <p class="error-message">{errorMessage}</p>
  {/if}
  {#snippet footer()}
    {#if editing}
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
    <h3>Slette stemme?</h3>
    <p>«{editing?.name}» fjernes fra katalogen.</p>
    <div class="warn">
      <span class="wi"><AlertTriangle size={17} /></span>
      <span>
        Å fjerne en stemme kan påvirke eksisterende automatisk gjenkjenning.
        Filer som tidligere matchet på dette navnet eller aliasene blir ikke
        lenger gjenkjent automatisk.
      </span>
    </div>
    {#if deleteError}
      <p class="error-message">{deleteError}</p>
    {/if}
  </div>
  {#snippet footer()}
    <Button variant="ghost" onclick={() => (confirmOpen = false)}>Avbryt</Button
    >
    <Button variant="danger" loading={isDeleting} onclick={confirmDelete}>
      <Trash2 size={16} /> Slett stemme
    </Button>
  {/snippet}
</Modal>

<style>
  .title-cell {
    max-width: 560px;
  }
  .lede {
    margin: 10px 0 0;
    font-size: 14px;
    line-height: 1.5;
    color: var(--text-secondary);
  }

  .c-order {
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--text-secondary);
    width: 110px;
  }
  .c-name {
    font-weight: 600;
    font-size: 15px;
    white-space: nowrap;
  }
  .c-aliases {
    width: 46%;
  }
  .c-index {
    width: 150px;
  }
  .c-edit {
    width: 56px;
    text-align: right;
  }
  .editlink {
    width: 32px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    transition:
      color var(--dur-fast),
      border-color var(--dur-fast);
  }
  tr:hover .editlink {
    color: var(--text-primary);
    border-color: var(--border-subtle);
  }

  /* Alias chips (shared between table cells and mobile cards). */
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
  .chip.more {
    font-family: var(--font-text);
    font-weight: 600;
    color: var(--text-muted);
  }
  .chip.none {
    padding-left: 0;
    font-style: italic;
    color: var(--text-muted);
    background: transparent;
    border-color: transparent;
  }

  .card-chips {
    margin-top: 10px;
  }
  .card-badge {
    margin-top: 11px;
  }

  .foot-note {
    margin-top: 14px;
    font-size: 12.5px;
    color: var(--text-muted);
  }
  .foot-note b {
    color: var(--text-secondary);
    font-weight: 600;
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
  .confirm-body .warn {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    text-align: left;
    margin-top: 18px;
    padding: 13px 15px;
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
