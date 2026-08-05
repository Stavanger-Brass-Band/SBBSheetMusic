<script lang="ts">
  import { onMount } from "svelte";
  import { Modal, Label, Input, Toggle } from "flowbite-svelte";
  import { Plus, SearchX, Tags, Pencil, Trash2, Check } from "@lucide/svelte";
  import { categories as categoriesApi } from "$lib/api/categories";
  import type { Category, CategoryForm, CategoryRequest } from "$lib/types";
  import { Badge, Button, EmptyState, SearchInput } from "$lib/components/ui";
  import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
  import LoadingSpinner from "$lib/components/LoadingSpinner.svelte";

  let allCategories = $state<Category[]>([]);
  let loading = $state(true);
  let listError = $state("");

  // Client-side search over the loaded catalog — the endpoint returns every
  // category in one call.
  let searchTerm = $state("");
  let filtered = $derived.by(() => {
    const sorted = [...allCategories].sort((a, b) =>
      (a.name ?? "").localeCompare(b.name ?? "", "nb-NO"),
    );
    const query = searchTerm.trim().toLowerCase();
    if (!query) return sorted;
    return sorted.filter((category) =>
      (category.name ?? "").toLowerCase().includes(query),
    );
  });
  let activeCount = $derived(
    allCategories.filter((category) => !category.inactive).length,
  );

  // Create/edit modal. `editing` holds the category being edited, or null when
  // creating. `form` is the working copy the modal mutates.
  let isOpen = $state(false);
  let isSaving = $state(false);
  let editing = $state<Category | null>(null);
  let form = $state<CategoryForm>({ name: "", active: true });
  let errorMessage = $state("");

  let confirmOpen = $state(false);

  let canSave = $derived(!!form.name.trim());

  onMount(reload);

  async function reload() {
    try {
      allCategories = (await categoriesApi.list()) ?? [];
      listError = "";
    } catch {
      listError = "Kunne ikke laste kategoriene. Prøv igjen senere.";
    }
    loading = false;
  }

  function openCreate() {
    editing = null;
    form = { name: "", active: true };
    errorMessage = "";
    isOpen = true;
  }

  function openEdit(category: Category) {
    editing = category;
    form = { name: category.name ?? "", active: !category.inactive };
    errorMessage = "";
    isOpen = true;
  }

  async function save() {
    if (!canSave) return;
    isSaving = true;
    errorMessage = "";
    const body: CategoryRequest = {
      name: form.name.trim(),
      inactive: !form.active,
    };
    try {
      const saved = editing
        ? await categoriesApi.update(editing.id!, body)
        : await categoriesApi.create(body);
      if (!saved?.id) throw new Error("save failed");
      await reload();
      isOpen = false;
    } catch {
      errorMessage = "Kunne ikke lagre kategorien. Prøv igjen.";
    } finally {
      isSaving = false;
    }
  }

  function askDelete() {
    // Mirror the part catalog: the edit dialog steps aside for the confirmation.
    isOpen = false;
    confirmOpen = true;
  }

  async function confirmDelete() {
    if (!editing) return;
    const response = await categoriesApi.remove(editing.id!);
    if (response.ok) {
      editing = null;
      await reload();
    } else {
      listError = "Kunne ikke slette kategorien. Prøv igjen.";
    }
  }
</script>

<div class="sbb-list-head">
  <div class="title-cell">
    <h1 class="sbb-h1">Kategorier</h1>
    <p class="lede">
      Merkelapper som grupperer notesettene — for eksempel «Julemusikk» eller
      «Marsj». Medlemmene filtrerer arkivlisten på dem.
    </p>
  </div>
  <Button class="create-btn" onclick={openCreate}>
    <Plus size={17} /> Legg til kategori
  </Button>
</div>

<SearchInput placeholder="Søk i kategorier…" bind:value={searchTerm} />

{#if listError}
  <p class="error-message list-error">{listError}</p>
{/if}

{#if loading}
  <LoadingSpinner label="Laster kategorier…" />
{:else if filtered.length === 0}
  {#if searchTerm.trim()}
    <EmptyState
      title="Ingen treff"
      description={`Fant ingen kategorier som passer «${searchTerm.trim()}». Prøv et annet søk.`}
    >
      {#snippet icon()}<SearchX size={28} strokeWidth={1.6} />{/snippet}
    </EmptyState>
  {:else}
    <EmptyState
      title="Ingen kategorier ennå"
      description="Legg til den første kategorien for å begynne å gruppere notesettene."
    >
      {#snippet icon()}<Tags size={28} strokeWidth={1.6} />{/snippet}
    </EmptyState>
  {/if}
{:else}
  <div class="sbb-table-wrap table-view">
    <table class="sbb-table">
      <thead>
        <tr>
          <th>Navn</th>
          <th class="c-status">Status</th>
          <th class="c-edit"></th>
        </tr>
      </thead>
      <tbody>
        {#each filtered as category (category.id)}
          <tr class="clickable" onclick={() => openEdit(category)}>
            <td class="c-name">{category.name}</td>
            <td class="c-status">
              {#if category.inactive}
                <Badge variant="neutral" dot>Inaktiv</Badge>
              {:else}
                <Badge variant="success" dot>Aktiv</Badge>
              {/if}
            </td>
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
    {#each filtered as category (category.id)}
      <div class="sbb-card clickable" onclick={() => openEdit(category)}>
        <div class="body">
          <div class="t">{category.name}</div>
        </div>
        <!-- Status reads as metadata on the card, so it sits in the top-right
             corner rather than below the name. -->
        <div class="acts card-badge">
          {#if category.inactive}
            <Badge variant="neutral" dot>Inaktiv</Badge>
          {:else}
            <Badge variant="success" dot>Aktiv</Badge>
          {/if}
        </div>
      </div>
    {/each}
  </div>

  <p class="foot-note">
    Viser <b>{filtered.length}</b> kategorier · <b>{activeCount}</b> er aktive.
  </p>
{/if}

<Modal
  title={editing ? "Rediger kategori" : "Ny kategori"}
  bind:open={isOpen}
  size="sm"
>
  <form class="space-y-4">
    <div>
      <Label for="categoryName" class="mb-2">Navn</Label>
      <Input
        id="categoryName"
        value={form.name}
        oninput={(e) =>
          (form.name = (e.currentTarget as HTMLInputElement).value)}
        placeholder="f.eks. Julemusikk"
      />
    </div>

    <div class="toggle-field">
      <div class="tx">
        <Label for="categoryActive">Aktiv</Label>
        <p class="hint">
          Aktive kategorier kan velges på notesett og vises som filter i
          arkivlisten. Inaktive beholdes på settene de allerede er brukt på.
        </p>
      </div>
      <Toggle id="categoryActive" bind:checked={form.active} />
    </div>
  </form>
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

<ConfirmDialog
  bind:open={confirmOpen}
  title="Slette kategori?"
  description={`«${editing?.name ?? ""}» fjernes fra katalogen og fra notesettene den er brukt på. Selve notesettene beholdes.`}
  confirmTitle="Slett kategori"
  onconfirm={confirmDelete}
/>

<style>
  .lede {
    margin: 10px 0 0;
    font-size: 14px;
    line-height: 1.5;
    color: var(--text-secondary);
  }

  .c-name {
    font-weight: 600;
    font-size: 15px;
  }
  .c-status {
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

  /* The shared card centres its trailing slot; pull the badge up to the first
     line so a name that wraps doesn't drag the status down with it. */
  .card-badge {
    align-self: flex-start;
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

  .hint {
    font-size: 12.5px;
    color: var(--text-muted);
    line-height: 1.45;
    margin: 4px 0 0;
  }
  .toggle-field {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    padding: 16px;
    background: var(--surface-sunken);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
  }
  .toggle-field .tx {
    min-width: 0;
  }

  .error-message {
    margin-top: 16px;
    font-family: var(--font-text);
    font-size: 13px;
    color: var(--danger);
  }
  .list-error {
    margin-top: 0;
    margin-bottom: 16px;
  }
</style>
