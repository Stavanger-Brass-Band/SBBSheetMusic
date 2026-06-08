<script lang="ts">
  import { Label, Input, Helper } from "flowbite-svelte";
  import type { MusicSet } from "$lib/types";

  // `set` is mutated in place; the parent owns the reactive object. We use
  // value + oninput (rather than bind:value) because the API fields are
  // nullable and Flowbite's Input value type does not accept null.
  let { set }: { set: Partial<MusicSet> } = $props();

  const onInput =
    (key: "title" | "composer" | "arranger" | "borrowedFrom") => (e: Event) => {
      set[key] = (e.currentTarget as HTMLInputElement).value;
    };
</script>

<form class="space-y-4">
  <div>
    <Label for="title" class="mb-2">Tittel</Label>
    <Input
      id="title"
      value={set.title ?? ""}
      oninput={onInput("title")}
      placeholder="Skriv inn tittel"
    />
  </div>
  <div>
    <Label for="composer" class="mb-2">Komponist</Label>
    <Input
      id="composer"
      value={set.composer ?? ""}
      oninput={onInput("composer")}
      placeholder="Skriv inn komponist"
    />
  </div>
  <div>
    <Label for="arranger" class="mb-2">Arrangør</Label>
    <Input
      id="arranger"
      value={set.arranger ?? ""}
      oninput={onInput("arranger")}
      placeholder="Skriv inn arrangør"
    />
  </div>
  <div>
    <Label for="borrowedFrom" class="mb-2">Lånt av</Label>
    <Input
      id="borrowedFrom"
      value={set.borrowedFrom ?? ""}
      oninput={onInput("borrowedFrom")}
      placeholder="Skriv inn hvem settet er lånt av"
    />
    <Helper class="mt-2"
      >Brukes for å holde kontroll på sett vi ikke eier.</Helper
    >
  </div>
  <div>
    <Label for="archiveNumber" class="mb-2">Arkivnummer</Label>
    <Input
      id="archiveNumber"
      type="number"
      value={set.archiveNumber}
      oninput={(e) => {
        const v = (e.currentTarget as HTMLInputElement).value;
        set.archiveNumber = v === "" ? undefined : Number(v);
      }}
      placeholder="Velg arkivnummer"
    />
    <Helper class="mt-2">
      Dersom feltet settes blankt vil neste ledige nummer i arkivet velges.
    </Helper>
  </div>
</form>
