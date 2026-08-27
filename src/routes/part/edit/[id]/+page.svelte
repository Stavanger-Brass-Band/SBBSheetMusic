<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { Modal } from "flowbite-svelte";
  import { Plus, X, Trash2, Check, AlertTriangle } from "@lucide/svelte";
  import { parts as partsApi } from "$lib/api/parts";
  import { users as usersApi } from "$lib/api/users";
  import { auth } from "$lib/stores/auth.svelte";
  import { partsListHref } from "$lib/utils/partsListQuery";
  import { musiciansByPartId } from "$lib/utils/partMusicians";
  import { profilePictureVersion } from "$lib/utils/profilePicture";
  import type { Part, PartForm, PartRequest, User } from "$lib/types";
  import {
    Badge,
    Breadcrumb,
    Button,
    Loader,
    UserAvatar,
  } from "$lib/components/ui";
  import PartModalBody from "$lib/components/PartModalBody.svelte";
  import PageLoader from "$lib/components/PageLoader.svelte";

  let id = $derived(page.params.id!);
  /**
   * Back to the catalogue as the reader left it. The list passes its search and
   * group filter along in `from`, so every way out of this page returns to the
   * same filtered view rather than to the whole catalogue.
   */
  let listHref = $derived(partsListHref(page.url.searchParams.get("from")));

  let part = $state<Part | null>(null);
  let loading = $state(true);
  let notFound = $state(false);

  // Detaljer section (name/sortOrder/indexable/alwaysDisplay/instrumentGroup),
  // saved together via PUT.
  let detailsForm = $state<PartForm>({
    name: "",
    sortOrder: 0,
    indexable: true,
    alwaysDisplay: false,
    instrumentGroup: "",
  });
  let savingDetails = $state(false);
  let detailsError = $state("");
  let detailsSaved = $state(false);
  let detailsSavedTimer: ReturnType<typeof setTimeout> | undefined;

  // Aliases are immediate actions against their own endpoints.
  let aliasInput = $state("");
  let savingAlias = $state(false);
  let aliasError = $state("");

  /**
   * Musikanter — who is set up with this stemme. Read out of the user list, since
   * the assignment only exists on the user's side and nothing on a part points
   * back. `GET /users` is admin-only while this page also admits a Noteansvarlig,
   * so the panel is left out for them rather than claiming nobody plays it.
   */
  let musicians = $state<User[]>([]);
  let loadingMusicians = $state(false);
  let musiciansFailed = $state(false);
  let showMusicians = $derived(auth.isAdmin);

  // Delete confirmation.
  let confirmOpen = $state(false);
  let isDeleting = $state(false);
  let deleteError = $state("");

  let canSaveDetails = $derived(!!detailsForm.name.trim());

  onMount(() => {
    void load();
    void loadMusicians();
  });
  onDestroy(() => clearTimeout(detailsSavedTimer));

  async function load() {
    loading = true;
    let found: Part | null;
    try {
      found = (await partsApi.get(id)) ?? null;
    } catch {
      // A missing part answers with an empty body, which the JSON parse rejects.
      found = null;
    }
    part = found;
    notFound = !found?.id;
    if (found) {
      detailsForm = {
        name: found.name ?? "",
        sortOrder: found.sortOrder ?? 0,
        indexable: found.indexable ?? false,
        alwaysDisplay: found.alwaysDisplay ?? false,
        instrumentGroup: found.instrumentGroup ?? "",
      };
    }
    loading = false;
  }

  async function loadMusicians() {
    if (!showMusicians) return;
    loadingMusicians = true;
    musiciansFailed = false;
    const users = await usersApi.list().catch(() => null);
    loadingMusicians = false;
    if (!users) {
      musiciansFailed = true;
      return;
    }
    musicians = musiciansByPartId(users).get(id) ?? [];
  }

  async function saveDetails() {
    if (!canSaveDetails || !part) return;
    savingDetails = true;
    detailsError = "";
    // The endpoint nulls anything left out, so always send the full body.
    const body: PartRequest = {
      name: detailsForm.name.trim(),
      sortOrder: detailsForm.sortOrder,
      indexable: detailsForm.indexable,
      alwaysDisplay: detailsForm.alwaysDisplay,
      instrumentGroup: detailsForm.instrumentGroup || null,
    };
    try {
      const updated = await partsApi.update(part.id!, body);
      if (!updated) throw new Error("update failed");
      part = {
        ...part,
        name: detailsForm.name.trim(),
        sortOrder: detailsForm.sortOrder,
        indexable: detailsForm.indexable,
        alwaysDisplay: detailsForm.alwaysDisplay,
        instrumentGroup: detailsForm.instrumentGroup || null,
      };
      detailsSaved = true;
      clearTimeout(detailsSavedTimer);
      detailsSavedTimer = setTimeout(() => (detailsSaved = false), 2000);
    } catch {
      detailsError = "Kunne ikke lagre endringene. Prøv igjen.";
    } finally {
      savingDetails = false;
    }
  }

  async function addAlias() {
    const value = aliasInput.trim();
    if (!value || !part) return;
    // Ignore case-insensitive duplicates.
    if (
      (part.aliases ?? []).some(
        (alias) => alias.toLowerCase() === value.toLowerCase(),
      )
    ) {
      aliasInput = "";
      return;
    }
    savingAlias = true;
    aliasError = "";
    const response = await partsApi.addAlias(part.id!, value);
    savingAlias = false;
    if (response.ok) {
      part = { ...part, aliases: [...(part.aliases ?? []), value] };
      aliasInput = "";
    } else {
      aliasError = "Kunne ikke legge til aliaset. Prøv igjen.";
    }
  }

  async function removeAlias(alias: string) {
    if (!part) return;
    savingAlias = true;
    aliasError = "";
    const response = await partsApi.removeAlias(part.id!, alias);
    savingAlias = false;
    if (response.ok) {
      part = {
        ...part,
        aliases: (part.aliases ?? []).filter(
          (candidate) => candidate !== alias,
        ),
      };
    } else {
      aliasError = "Kunne ikke fjerne aliaset. Prøv igjen.";
    }
  }

  function onAliasKeydown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault();
      addAlias();
    }
  }

  function askDelete() {
    deleteError = "";
    confirmOpen = true;
  }

  async function confirmDelete() {
    if (!part) return;
    isDeleting = true;
    deleteError = "";
    const response = await partsApi.remove(part.id!);
    isDeleting = false;
    if (response.ok) {
      goto(listHref);
      return;
    }

    // A part still referenced by a musician or a set answers 409, and no amount
    // of retrying changes that — the references have to go first. Saying "prøv
    // igjen" there sends the user in a circle, so the two cases are told apart.
    deleteError =
      response.status === 409
        ? "Stemmen er i bruk og kan ikke slettes. Den er koblet til minst én bruker eller ett notesett — fjern koblingene først."
        : "Kunne ikke slette stemmen. Prøv igjen.";
  }
</script>

<Breadcrumb
  class="mb-4"
  items={[
    { label: "Stemmekatalog", href: listHref },
    { label: part?.name ?? "-" },
  ]}
/>

{#if loading}
  <PageLoader label="Laster stemme…" />
{:else if notFound || !part}
  <div class="notfound">
    <h1 class="sbb-h1">Fant ikke stemmen</h1>
    <p>Stemmen finnes ikke, eller er allerede slettet.</p>
    <Button onclick={() => goto(listHref)}>Til stemmekatalog</Button>
  </div>
{:else}
  <div class="head">
    <div class="title-cell">
      <h1 class="sbb-h1 title">{part.name}</h1>
      <p class="order">Rekkefølge {part.sortOrder ?? 0}</p>
    </div>
    <div class="badges">
      {#if part.instrumentGroup}
        <Badge variant="outline">{part.instrumentGroup}</Badge>
      {/if}
      <!-- Deliberately not worded with "synlig": the pill beside it already
           spends that word on the indexing, and the two mean different things.
           Only shown when on — stemmene a musikant has to be set up with are
           the ordinary case, and don't need saying. -->
      {#if part.alwaysDisplay}
        <Badge variant="outline">Vises for alle</Badge>
      {/if}
      {#if part.indexable}
        <Badge variant="success" dot>Synlig</Badge>
      {:else}
        <Badge variant="neutral" dot>Skjult</Badge>
      {/if}
    </div>
  </div>

  <!-- Detaljer -->
  <section class="panel">
    <h2 class="sbb-h3">Detaljer</h2>
    <PartModalBody form={detailsForm} />
    {#if detailsError}<p class="err">{detailsError}</p>{/if}
    <div class="panel-foot">
      {#if detailsSaved}
        <span class="saved"><Check size={15} /> Lagret</span>
      {/if}
      <Button
        loading={savingDetails}
        disabled={!canSaveDetails}
        onclick={saveDetails}
      >
        Lagre endringer
      </Button>
    </div>
  </section>

  <!-- Aliaser -->
  <section class="panel">
    <h2 class="sbb-h3">Aliaser</h2>
    <p class="hint">
      Alternative navn som matches mot opplastede filnavn — f.eks. «Cornet 1»,
      «1st Cornet», «Kornett I». Endringer lagres med én gang.
    </p>
    <div class="alias-input">
      <input
        class="alias-field"
        placeholder="Skriv et alias og trykk Enter"
        bind:value={aliasInput}
        onkeydown={onAliasKeydown}
        disabled={savingAlias}
      />
      <button
        type="button"
        class="alias-add"
        onclick={addAlias}
        disabled={savingAlias || !aliasInput.trim()}
      >
        <Plus size={15} /> Legg til
      </button>
    </div>
    {#if aliasError}<p class="err">{aliasError}</p>{/if}
    {#if (part.aliases ?? []).length === 0}
      <p class="hint empty">Ingen aliaser lagt til ennå.</p>
    {:else}
      <div class="alias-chips">
        {#each part.aliases ?? [] as alias (alias)}
          <span class="ed-chip">
            {alias}
            <button
              type="button"
              onclick={() => removeAlias(alias)}
              disabled={savingAlias}
              aria-label={`Fjern ${alias}`}
            >
              <X size={13} />
            </button>
          </span>
        {/each}
      </div>
    {/if}
  </section>

  <!-- Musikanter -->
  {#if showMusicians}
    <section class="panel">
      <div class="panel-head">
        <h2 class="sbb-h3">Musikanter</h2>
        {#if musicians.length}
          <Badge variant="neutral">{musicians.length}</Badge>
        {/if}
      </div>
      <p class="hint">
        Hvem som er satt opp med denne stemmen. Koblingen endres på den enkelte
        brukeren, og en stemme som er i bruk kan ikke slettes.
      </p>
      {#if loadingMusicians}
        <p class="hint empty hint--loading">
          <Loader variant="valves" size="sm" /> Laster musikanter…
        </p>
      {:else if musiciansFailed}
        <p class="err">
          Kunne ikke laste musikantene.
          <button type="button" class="retry" onclick={loadMusicians}>
            Prøv igjen
          </button>
        </p>
      {:else if musicians.length === 0}
        <p class="hint empty">Ingen musikanter spiller denne stemmen ennå.</p>
      {:else}
        <ul class="musician-list">
          {#each musicians as musician (musician.id)}
            <li>
              <a class="musician" href={`/user/edit/${musician.id}`}>
                <UserAvatar
                  name={musician.name}
                  userId={musician.id}
                  pictureVersion={profilePictureVersion(musician)}
                  size={36}
                />
                <span class="musician__text">
                  <span class="musician__name">{musician.name}</span>
                  <span class="musician__email">{musician.email}</span>
                </span>
                {#if musician.inactive}
                  <Badge variant="neutral" dot>Inaktiv</Badge>
                {/if}
              </a>
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  {/if}

  <!-- Faresone -->
  <section class="panel danger">
    <h2 class="sbb-h3">Faresone</h2>
    <p class="hint">
      Slett stemmen fra katalogen. Filer som tidligere matchet på navnet eller
      aliasene blir ikke lenger gjenkjent automatisk.
    </p>
    <Button variant="danger" onclick={askDelete}>
      <Trash2 size={16} /> Slett stemme
    </Button>
  </section>
{/if}

<Modal bind:open={confirmOpen} size="xs">
  <div class="confirm-body">
    <span class="danger-ico"><Trash2 size={22} /></span>
    <h3>Slette stemme?</h3>
    <p>«{part?.name}» fjernes fra katalogen.</p>
    <div class="warn">
      <span class="wi"><AlertTriangle size={17} /></span>
      <span>
        Å fjerne en stemme kan påvirke eksisterende automatisk gjenkjenning.
        Filer som tidligere matchet på dette navnet eller aliasene blir ikke
        lenger gjenkjent automatisk.
      </span>
    </div>
    {#if deleteError}<p class="err">{deleteError}</p>{/if}
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
  .head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    flex-wrap: wrap;
    margin-bottom: 28px;
  }
  .badges {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .title {
    margin: 0;
    font-size: 40px;
  }
  .order {
    margin: 6px 0 0;
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--text-secondary);
  }

  .panel {
    padding: 24px;
    background: var(--surface-card);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
    margin-bottom: 20px;
    max-width: 640px;
  }
  .panel h2 {
    margin: 0 0 16px;
    font-size: 20px;
  }
  .panel.danger {
    border-color: color-mix(in srgb, var(--danger) 40%, var(--border-subtle));
  }
  /* The count sits on the heading's own line, so the panel says how many before
     the reader starts counting faces. */
  .panel-head {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .panel-head h2 {
    margin: 0 0 4px;
  }
  .panel-foot {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 14px;
    margin-top: 20px;
  }
  .saved {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    color: var(--success);
  }
  .hint {
    font-size: 13px;
    color: var(--text-muted);
    line-height: 1.5;
    margin: 0 0 16px;
  }
  .hint.empty {
    margin: 14px 0 0;
    font-style: italic;
  }
  /* The mark is a shape rather than a glyph, so the line has to lay it out. */
  .hint--loading {
    display: flex;
    align-items: center;
    gap: 9px;
  }
  .err {
    margin: 14px 0 0;
    font-size: 13px;
    color: var(--danger);
  }

  /* Musikanter — one row each, the whole row a link to that user's page, which
     is where the assignment is actually changed. */
  .musician-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .musician {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 10px 14px;
    background: var(--surface-sunken);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    text-decoration: none;
    transition: border-color var(--dur-fast);
  }
  .musician:hover {
    border-color: var(--accent);
  }
  .musician__text {
    flex: 1;
    min-width: 0;
  }
  .musician__name,
  .musician__email {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .musician__name {
    font-family: var(--font-text);
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
  }
  .musician__email {
    margin-top: 2px;
    font-size: 12.5px;
    color: var(--text-secondary);
  }

  /* Alias editor. */
  .alias-input {
    display: flex;
    gap: 9px;
  }
  .alias-field {
    flex: 1;
    height: 42px;
    padding: 0 14px;
    font-family: var(--font-text);
    font-size: 14px;
    color: var(--text-primary);
    background: var(--surface-sunken);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-sm);
    outline: none;
    transition:
      border-color var(--dur-fast),
      box-shadow var(--dur-fast);
  }
  .alias-field:focus {
    border-color: var(--accent);
    box-shadow: var(--ring-focus);
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
  .alias-add:hover:not(:disabled) {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .alias-add:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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
  .ed-chip button:hover:not(:disabled) {
    color: var(--danger);
    background: var(--danger-soft);
  }

  .notfound {
    text-align: center;
    padding: 60px 24px;
  }
  .notfound p {
    margin: 10px 0 20px;
    color: var(--text-secondary);
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
  /* Reads as the link it behaves like, and inherits the message's own size so it
     sits in the sentence rather than beside it. */
  .retry {
    padding: 0;
    font: inherit;
    color: var(--text-primary);
    background: transparent;
    border: 0;
    text-decoration: underline;
    text-underline-offset: 2px;
    cursor: pointer;
  }
  .retry:hover {
    color: var(--brass-400);
  }
</style>
