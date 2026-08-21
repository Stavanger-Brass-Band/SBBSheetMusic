<script lang="ts">
  import { Label, Input, Select, Toggle } from "flowbite-svelte";
  import { INSTRUMENT_GROUPS, type PartForm } from "$lib/types";

  // `form` is mutated in place; the parent owns the reactive object. Aliases are
  // managed on the part edit page (their own endpoints), not here.
  let { form }: { form: PartForm } = $props();

  const instrumentGroupItems = [
    { value: "", name: "Ingen gruppe" },
    ...INSTRUMENT_GROUPS.map((group) => ({ value: group, name: group })),
  ];
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

  <div>
    <Label for="partInstrumentGroup" class="mb-2">Instrumentgruppe</Label>
    <Select
      id="partInstrumentGroup"
      items={instrumentGroupItems}
      bind:value={form.instrumentGroup}
    />
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

  <!--
    Not the same visibility as the toggle above: that one decides whether the
    stemme takes part in filename matching, this one whether a musikant gets to
    see it at all. A musikant is served only the stemmer they are set up with,
    so this is what makes a stemme reach every one of them.
  -->
  <div class="toggle-field">
    <div class="tx">
      <Label for="partAlwaysDisplay">Alltid synlig for musikanter</Label>
      <p class="hint">
        Når på, vises stemmen til alle musikanter i notesettene — også de som
        ikke er satt opp med den. Ellers ser en musikant bare sine egne stemmer.
      </p>
    </div>
    <Toggle id="partAlwaysDisplay" bind:checked={form.alwaysDisplay} />
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
</style>
