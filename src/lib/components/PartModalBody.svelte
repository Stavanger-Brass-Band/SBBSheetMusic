<script lang="ts">
  import { Label, Input, Toggle } from "flowbite-svelte";
  import { Plus, X } from "@lucide/svelte";
  import type { PartForm } from "$lib/types";

  // `form` is mutated in place; the parent owns the reactive object.
  let { form }: { form: PartForm } = $props();

  let aliasInput = $state("");

  function addAlias() {
    const value = aliasInput.trim();
    if (!value) return;
    // Ignore case-insensitive duplicates.
    if (
      !form.aliases.some((alias) => alias.toLowerCase() === value.toLowerCase())
    ) {
      form.aliases = [...form.aliases, value];
    }
    aliasInput = "";
  }

  function removeAlias(index: number) {
    form.aliases = form.aliases.filter((_, i) => i !== index);
  }

  function onAliasKeydown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault();
      addAlias();
    }
  }
</script>

<form class="space-y-4">
  <div class="name-order">
    <div>
      <Label for="partName" class="mb-2">Navn</Label>
      <Input
        id="partName"
        value={form.name}
        oninput={(e) =>
          (form.name = (e.currentTarget as HTMLInputElement).value)}
        placeholder="f.eks. Kornett 1"
      />
    </div>
    <div>
      <Label for="partOrder" class="mb-2">Rekkefølge</Label>
      <Input
        id="partOrder"
        type="number"
        min="0"
        step="1"
        value={form.sortOrder}
        oninput={(e) => {
          const value = (e.currentTarget as HTMLInputElement).value;
          form.sortOrder = value === "" ? 0 : Number(value);
        }}
      />
    </div>
  </div>

  <div class="toggle-field">
    <div class="tx">
      <Label for="partIndexable">Brukes i register / auto-matching</Label>
      <p class="hint">
        Når på, deltar stemmen i indeksering og gjenkjennes automatisk ved
        masseopplasting av filer.
      </p>
    </div>
    <Toggle id="partIndexable" bind:checked={form.indexable} />
  </div>

  <div class="alias-editor">
    <Label for="partAlias" class="mb-1">Aliaser</Label>
    <p class="hint">
      Alternative navn som matches mot opplastede filnavn — f.eks. «Cornet 1»,
      «1st Cornet», «Kornett I».
    </p>
    <div class="alias-input">
      <div class="alias-input-field">
        <Input
          id="partAlias"
          bind:value={aliasInput}
          onkeydown={onAliasKeydown}
          placeholder="Skriv et alias og trykk Enter"
        />
      </div>
      <button
        type="button"
        class="alias-add"
        onclick={addAlias}
        aria-label="Legg til alias"
      >
        <Plus size={15} /> Legg til
      </button>
    </div>

    {#if form.aliases.length === 0}
      <p class="alias-empty">Ingen aliaser lagt til ennå.</p>
    {:else}
      <div class="alias-chips">
        {#each form.aliases as alias, index (alias)}
          <span class="ed-chip">
            {alias}
            <button
              type="button"
              onclick={() => removeAlias(index)}
              aria-label={`Fjern ${alias}`}
            >
              <X size={13} />
            </button>
          </span>
        {/each}
      </div>
    {/if}
  </div>
</form>

<style>
  .name-order {
    display: grid;
    grid-template-columns: 1fr 128px;
    gap: 16px;
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

  .alias-editor .hint {
    margin-bottom: 10px;
  }
  .alias-input {
    display: flex;
    gap: 9px;
  }
  .alias-input-field {
    flex: 1;
  }
  .alias-add {
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
  .alias-add:hover {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .alias-empty {
    margin: 14px 0 0;
    font-size: 12.5px;
    font-style: italic;
    color: var(--text-muted);
  }
  .alias-chips {
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
  .ed-chip button:hover {
    color: var(--danger);
    background: var(--danger-soft);
  }
</style>
