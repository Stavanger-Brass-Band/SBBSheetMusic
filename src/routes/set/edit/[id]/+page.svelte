<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import {
    Modal,
    Dropdown,
    DropdownItem,
    DropdownDivider,
    Select,
    Tabs,
    TabItem,
  } from "flowbite-svelte";
  import {
    Check,
    EllipsisVertical,
    Pencil,
    Trash2,
    Download,
    CloudUpload,
    Upload,
    Headphones,
    FileText,
    FileMusic,
    CircleCheck,
    CircleAlert,
    Plus,
    X,
    Replace,
    Sparkles,
  } from "@lucide/svelte";
  import { sheetMusic } from "$lib/api/sheetMusic";
  import { catalogData } from "$lib/api/client";
  import { parts as partsApi } from "$lib/api/parts";
  import { categories as categoriesApi } from "$lib/api/categories";
  import { catalog } from "$lib/stores/catalog.svelte";
  import { downloadSetPart, downloadSetZip } from "$lib/utils/download";
  import {
    addedEntries,
    classifyUnresolved,
    splitMissingParts,
  } from "$lib/utils/pdfImportSummary";
  import type {
    Category,
    MusicSet,
    MusicSetPart,
    Part,
    SaveState,
    SetRequest,
  } from "$lib/types";
  import {
    Badge,
    Breadcrumb,
    Button,
    SaveIndicator,
    SAVED_VISIBLE_MS,
    Spinner,
    LoadFailed,
  } from "$lib/components/ui";
  import LoadingSpinner from "$lib/components/LoadingSpinner.svelte";
  import MusicSetModalBody from "$lib/components/MusicSetModalBody.svelte";
  import PdfImportPanel from "$lib/components/PdfImportPanel.svelte";
  import SetProjectHistory from "$lib/components/SetProjectHistory.svelte";
  import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";

  let id = $derived(page.params.id!);

  let set = $state<MusicSet>({});
  let catalogParts = $state<Part[]>([]);
  let loading = $state(true);
  // The set is the page. `set` stays a plain object so the markup below can read
  // it without guarding every field, so the failed load needs saying separately.
  let loadFailed = $state(false);

  // Per-field autosave state for the two auto-saving Settinformasjon fields.
  let recordingSave = $state<SaveState>("idle");
  let missingSave = $state<SaveState>("idle");
  // The details dialog has its own explicit save flow.
  let savingDetails = $state(false);

  let selectedPartForDownload = $state<MusicSetPart | null>(null);
  let justAdded = $state<Set<string>>(new Set());

  let isUploading = $state(false);
  let review = $state<
    {
      file: File;
      name: string;
      match: string;
      matching: boolean;
      chosenManually: boolean;
    }[]
  >([]);
  let fileInput: HTMLInputElement;
  let dragging = $state(false);

  let detailsOpen = $state(false);
  let draft = $state<Partial<MusicSet>>({});
  let detailsError = $state("");
  // Same rule the create dialog enforces: the API requires a title.
  let canSaveDetails = $derived(!!draft.title?.trim());
  let confirmDeleteOpen = $state(false);
  let confirmRemovePartOpen = $state(false);
  let partToRemove = $state<MusicSetPart | null>(null);

  // Moving an already-uploaded file onto the part it should have gone to — the
  // fix for a wrong auto-match, which otherwise costs a delete and a re-upload.
  let movePartOpen = $state(false);
  let partToMove = $state<MusicSetPart | null>(null);
  let moveTarget = $state("");
  let movingPart = $state(false);
  let moveError = $state("");

  // Add a single part by picking it from the catalog, then uploading its PDF.
  let addOpen = $state(false);
  let addValue = $state("");
  let pendingPart = $state("");
  let addFileInput: HTMLInputElement;
  let addingName = $state<string | null>(null);

  // Categories: `set.categories` is the assigned list, `categoryCatalog` every
  // category that can be picked. Assignment saves immediately (no draft).
  let categoryCatalog = $state<Category[]>([]);
  let categoryPick = $state("");
  let categorySave = $state<SaveState>("idle");
  let categorySavedTimer: ReturnType<typeof setTimeout> | undefined;
  let categoryBusy = $derived(categorySave === "saving");

  // Stemmer shows only the parts actually present on the set.
  let presentParts = $derived(set.parts ?? []);
  let assignedCategories = $derived(set.categories ?? []);
  let assignableCategories = $derived(
    categoryCatalog
      .filter(
        (category) =>
          !assignedCategories.some((assigned) => assigned.id === category.id),
      )
      .map((category) => ({
        value: category.id ?? "",
        name: category.name ?? "",
      })),
  );
  let matchedCount = $derived(review.filter((r) => r.match).length);
  let isMatchingFiles = $derived(review.some((row) => row.matching));
  /**
   * The parts the index answered with for more than one file. A part that covers
   * several players collides by design — "Solokornett 1" and "Solokornett 2" both
   * match the part "Solokornett 1-2", and the two percussion files both match
   * "Percussion 1" — and since the content upload is keyed by part name, sending
   * both would leave only the last file on that part. The collision is the
   * reader's to resolve, so it blocks the upload rather than losing a file.
   */
  let duplicateMatches = $derived(
    review
      .map((row) => row.match)
      .filter(
        (match, index, matches) => !!match && matches.indexOf(match) !== index,
      ),
  );
  let hasDuplicateMatches = $derived(duplicateMatches.length > 0);
  /**
   * The parts the set already holds a file for. Uploading to one of them is a
   * replacement rather than an addition — legitimate when a part is rescanned,
   * but silent otherwise, so the review row says so before the upload runs.
   */
  let existingPartNames = $derived(presentParts.map((part) => part.name ?? ""));
  // Catalog options for the Flowbite Select pickers.
  let catalogItems = $derived(
    catalogParts.map((p) => ({ value: p.name ?? "", name: p.name ?? "" })),
  );
  /**
   * Where a file can be moved to. A part the set already holds a file for can't
   * take another — the content endpoint answers 409 — so those stay in the list
   * but unselectable, saying why. Dropping them entirely was worse: the reader
   * looked for the stemme they knew was in the catalogue, didn't find it, and had
   * nothing to tell them whether it was occupied or the list was broken.
   */
  let moveTargets = $derived(
    catalogItems.map((item) =>
      existingPartNames.includes(item.value)
        ? {
            ...item,
            name: `${item.name} — har allerede en fil`,
            disabled: true,
          }
        : item,
    ),
  );

  async function loadSet() {
    loading = true;
    loadFailed = false;
    const loaded = catalogData(await sheetMusic.getSetWithParts(id));
    if (loaded) set = loaded;
    else loadFailed = true;
    const result = (await partsApi.list()) ?? [];
    result.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    catalogParts = result;
    loading = false;
    // Nothing to assign categories to when the set itself never arrived.
    if (!loadFailed) loadCategories();
  }

  onMount(loadSet);

  function flash(names: string[]) {
    justAdded = new Set(names);
    setTimeout(() => (justAdded = new Set()), 1500);
  }

  async function reloadParts() {
    const result = catalogData(await sheetMusic.getSetWithParts(id));
    if (!result) return;
    set.parts = [...(result.parts ?? [])];
    set.hasBeenScanned = !!set.parts && set.parts.length > 0;
    catalog.updateMusicSet(set);
  }

  async function downloadPart(part: MusicSetPart) {
    if (selectedPartForDownload === part) return;
    selectedPartForDownload = part;
    await downloadSetPart(id, part.name ?? "", set.title ?? "");
    selectedPartForDownload = null;
  }

  function askRemovePart(part: MusicSetPart) {
    partToRemove = part;
    confirmRemovePartOpen = true;
  }
  async function removePart() {
    const part = partToRemove;
    if (!part) return;
    const res = await sheetMusic.deletePart(id, part.musicPartId ?? "");
    if (res.ok) await reloadParts();
  }

  // ---- bulk upload + auto-match ----
  /** Whitespace and the dashes/underscores that join a title to a part name. */
  const SEPARATOR_EDGES = /^[\s\-–—_]+|[\s\-–—_]+$/g;

  /**
   * The term to look the part index up with for an uploaded file. Scanned files
   * are named "<tittel> - <stemme>.pdf", and the Lucene-backed index requires
   * every term in the query to match — "Sunny Sunday Partitur" finds nothing
   * where "Partitur" matches — so the term has to be narrowed to the part name
   * alone. The title comes off, then the separator it leaves behind, and the
   * extension goes too: Lucene keeps a dot between two letters, making
   * "Partitur.pdf" a single token that matches no part. The extension is matched
   * case-insensitively and only at the end, since scanners hand out ".PDF".
   *
   * The title is matched case-insensitively as well, because scanners don't
   * preserve the archive's casing and one wrongly-cased letter would leave the
   * whole title in the term and cost the match. A title that isn't in the file
   * name leaves the stem, and a file named after the set alone leaves the title;
   * neither can match, but there is nothing better to ask for.
   */
  function partSearchTerm(fileName: string, title: string): string {
    const stem = fileName.replace(/\.pdf$/i, "");
    const titleStart = title
      ? stem.toLowerCase().indexOf(title.toLowerCase())
      : -1;
    const withoutTitle =
      titleStart === -1
        ? stem
        : stem.slice(0, titleStart) + stem.slice(titleStart + title.length);
    return (
      withoutTitle.replace(SEPARATOR_EDGES, "") ||
      stem.replace(SEPARATOR_EDGES, "")
    );
  }

  async function onFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    review = Array.from(files).map((file) => ({
      file,
      name: file.name,
      match: "",
      matching: true,
      chosenManually: false,
    }));
    // Each row is looked up and settled on its own, so it can show that the
    // index is still answering rather than an empty match the reader would read
    // as "no match", and a lookup that fails outright leaves only its own row
    // empty to be picked by hand. Written through the row references captured
    // here rather than by index, so a lookup still in flight when a new
    // selection replaces `review` updates a row nothing renders any more.
    await Promise.all(
      review.map(async (row) => {
        try {
          const suggestion = await partsApi.suggest(
            partSearchTerm(row.name, set.title ?? ""),
          );
          row.match = suggestion?.name ?? "";
        } catch {
          // An empty match is the fallback the review list is built for.
        } finally {
          row.matching = false;
        }
      }),
    );
  }

  function assign(i: number, value: string) {
    review[i] = { ...review[i], match: value, chosenManually: true };
  }
  function dropFile(i: number) {
    review = review.filter((_, idx) => idx !== i);
  }

  async function commit() {
    isUploading = true;
    const added: string[] = [];
    for (const r of review) {
      if (!r.match) continue;
      const res = await sheetMusic.uploadPartContent(set.id!, r.match, r.file);
      if (res && "success" in res) added.push(r.match);
    }
    isUploading = false;
    review = [];
    await reloadParts();
    flash(added);
  }

  // ---- move an uploaded file to the right part ----
  /**
   * Hands the assignment over to the part the reader picked. The API carries the
   * PDF across and rolls its own copy back if the move fails, so there is no
   * half-moved state for this to recover from — a failure leaves the file exactly
   * where it was, and the message only has to say why.
   */
  async function movePart() {
    const part = partToMove;
    const targetName = moveTarget;
    if (!part || !targetName) return;

    movingPart = true;
    moveError = "";
    try {
      const response = await sheetMusic.changePart(
        id,
        part.musicPartId ?? part.name ?? "",
        targetName,
      );
      if (!response.ok) {
        moveError = moveFailureMessage(response.status, part.name, targetName);
        return;
      }

      movePartOpen = false;
      await reloadParts();
      flash([targetName]);
    } finally {
      movingPart = false;
    }
  }

  /**
   * Why a move was refused. A 409 is the one worth spelling out: the set already
   * holds the part picked, and the API refuses rather than merging the two — the
   * picker leaves those unselectable, so reaching this means the list moved under
   * the reader.
   */
  function moveFailureMessage(
    status: number,
    fromName: string | undefined,
    toName: string,
  ): string {
    if (status === 409)
      return `«${toName}» har allerede en fil i dette settet. Fjern den først hvis den er feil.`;
    if (status === 404)
      return "Stemmen finnes ikke lenger. Last siden på nytt.";
    return `Kunne ikke flytte filen til «${toName}». Den ligger fortsatt på «${fromName ?? ""}».`;
  }

  function askMovePart(part: MusicSetPart) {
    partToMove = part;
    moveTarget = "";
    moveError = "";
    movePartOpen = true;
  }

  // ---- import from one combined PDF ----
  /**
   * What the set held before an import ran. The API answers the import with 204
   * — neither the parts it placed, the pages it chose, nor the headers it
   * couldn't read come back — so the only way to tell what it did is to compare
   * the set with how it looked beforehand.
   */
  let partNamesBeforeImport: string[] = [];
  let unrecognizedBeforeImport: string[] = [];
  let importAddedParts = $state<string[]>([]);
  let importUnrecognized = $state<string[]>([]);
  // Pages the API couldn't read a header on at all. They are left out of the set
  // rather than stored, so this is its own line in the summary — a partitur run
  // through the import usually ends here.
  let importDroppedPages = $state(false);
  let importSummaryShown = $state(false);
  let importRunning = $state(false);

  async function importPdfParts(file: File) {
    partNamesBeforeImport = [...existingPartNames];
    unrecognizedBeforeImport = splitMissingParts(set.missingParts);
    importSummaryShown = false;
    // Held on the page, not inside the panel: the tabs render only the open
    // panel, so the other tab has to know not to let itself be opened while
    // this is still in the air.
    importRunning = true;
    try {
      return await sheetMusic.importPartsFromPdf(id, file);
    } finally {
      importRunning = false;
    }
  }

  async function onPartsImported() {
    const result = catalogData(await sheetMusic.getSetWithParts(id));
    if (!result) return;
    set.parts = [...(result.parts ?? [])];
    set.hasBeenScanned = !!set.parts && set.parts.length > 0;
    // The import appends to the same field a person writes their own notes in,
    // so the summary below credits it with only what it added.
    set.missingParts = result.missingParts;
    catalog.updateMusicSet(set);

    importAddedParts = addedEntries(
      partNamesBeforeImport,
      (result.parts ?? []).map((part) => part.name ?? ""),
    );
    const unresolved = classifyUnresolved(
      addedEntries(
        unrecognizedBeforeImport,
        splitMissingParts(result.missingParts),
      ),
    );
    importUnrecognized = unresolved.headerTexts;
    importDroppedPages = unresolved.hadUnreadablePages;
    importSummaryShown = true;
    flash(importAddedParts);
  }

  // ---- add single part from catalog ----
  function openAdd() {
    addValue = "";
    addOpen = true;
  }
  function confirmAdd() {
    const v = addValue.trim();
    if (!v) return;
    pendingPart = v;
    addOpen = false;
    addFileInput.click();
  }
  async function onAddFileSelected(files: FileList | null) {
    const file = files?.[0];
    const part = pendingPart;
    pendingPart = "";
    if (!file || !part) return;
    addingName = part;
    try {
      const res = await sheetMusic.uploadPartContent(set.id!, part, file);
      if (res && "success" in res) {
        await reloadParts();
        flash([part]);
      }
    } finally {
      addingName = null;
    }
  }

  // ---- kategorier ----
  /**
   * The category endpoints are not deployed to every environment yet, so a
   * failure leaves the panel empty instead of breaking the editor.
   */
  async function loadCategories() {
    try {
      const [catalogResult, assigned] = await Promise.all([
        categoriesApi.list(),
        sheetMusic.listSetCategories(id),
      ]);
      categoryCatalog = (catalogResult ?? [])
        .filter((category) => !category.inactive)
        .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "nb-NO"));
      set.categories = assigned ?? [];
    } catch {
      categoryCatalog = [];
    }
  }

  /** Confirm a category write the same way the autosaving fields do. */
  function flashCategorySaved() {
    categorySave = "saved";
    clearTimeout(categorySavedTimer);
    categorySavedTimer = setTimeout(
      () => (categorySave = "idle"),
      SAVED_VISIBLE_MS,
    );
  }

  async function assignCategory(categoryId: string) {
    if (!categoryId) return;
    categorySave = "saving";
    const result = await sheetMusic.assignCategory(set.id!, categoryId);
    if (result) {
      set.categories = result;
      catalog.updateMusicSet(set);
      flashCategorySaved();
    } else {
      categorySave = "error";
    }
    categoryPick = "";
  }

  async function removeCategory(category: Category) {
    categorySave = "saving";
    const res = await sheetMusic.removeCategory(set.id!, category.id!);
    if (res.ok) {
      set.categories = assignedCategories.filter(
        (assigned) => assigned.id !== category.id,
      );
      catalog.updateMusicSet(set);
      flashCategorySaved();
    } else {
      categorySave = "error";
    }
  }

  // ---- settinformasjon per-field autosave ----
  let recordingTimer: ReturnType<typeof setTimeout> | undefined;
  let missingTimer: ReturnType<typeof setTimeout> | undefined;

  function scheduleRecordingSave() {
    recordingSave = "saving";
    clearTimeout(recordingTimer);
    recordingTimer = setTimeout(() => persist("recording"), 800);
  }
  function scheduleMissingSave() {
    missingSave = "saving";
    clearTimeout(missingTimer);
    missingTimer = setTimeout(() => persist("missing"), 800);
  }
  /**
   * A set update replaces every property — the API nulls out whatever the body
   * omits — so an update always carries the whole set, with the fields being
   * edited laid over it.
   */
  function toSetRequest(edits: Partial<MusicSet> = {}): SetRequest {
    const merged = { ...set, ...edits };
    return {
      archiveNumber: merged.archiveNumber,
      // `title` is the one field the request schema declares non-nullable, so a
      // set the response left without one can only omit it.
      title: merged.title ?? undefined,
      composer: merged.composer,
      arranger: merged.arranger,
      soleSellingAgent: merged.soleSellingAgent,
      missingParts: merged.missingParts,
      recordingUrl: merged.recordingUrl,
      borrowedFrom: merged.borrowedFrom,
    };
  }

  async function persist(field: "recording" | "missing") {
    const res = await sheetMusic.updateSet(set.id!, toSetRequest());
    const ok = !!res;
    if (ok) catalog.updateMusicSet(set);
    if (field === "recording") recordingSave = ok ? "saved" : "error";
    else missingSave = ok ? "saved" : "error";
  }
  onDestroy(() => {
    clearTimeout(recordingTimer);
    clearTimeout(missingTimer);
    clearTimeout(categorySavedTimer);
  });

  // ---- details dialog ----
  function openDetails() {
    draft = {
      title: set.title,
      composer: set.composer,
      arranger: set.arranger,
      borrowedFrom: set.borrowedFrom,
      archiveNumber: set.archiveNumber,
    };
    detailsError = "";
    detailsOpen = true;
  }
  async function saveDetails() {
    if (!canSaveDetails) return;
    savingDetails = true;
    detailsError = "";
    const res = await sheetMusic.updateSet(set.id!, toSetRequest(draft));
    savingDetails = false;
    if (res) {
      set.title = res.title;
      set.composer = res.composer;
      set.arranger = res.arranger;
      set.archiveNumber = res.archiveNumber;
      set.borrowedFrom = res.borrowedFrom ?? set.borrowedFrom;
      catalog.updateMusicSet(set);
      detailsOpen = false;
    } else {
      detailsError = "Kunne ikke lagre detaljene. Prøv igjen.";
    }
  }

  async function removeSet() {
    const res = await sheetMusic.deleteSet(id);
    if (res.ok) {
      catalog.removeMusicSetById(id);
      goto("/archive");
    }
  }

  async function downloadAll() {
    await downloadSetZip(id, set.zipDownloadUrl ?? "");
  }
</script>

<!-- bulk-upload (drop / velg filer) -->
<input
  bind:this={fileInput}
  type="file"
  multiple
  accept="application/pdf"
  hidden
  onchange={(e) => {
    onFilesSelected(e.currentTarget.files);
    e.currentTarget.value = "";
  }}
/>
<!-- single-file upload for "Legg til stemme" -->
<input
  bind:this={addFileInput}
  type="file"
  accept="application/pdf"
  hidden
  onchange={(e) => {
    onAddFileSelected(e.currentTarget.files);
    e.currentTarget.value = "";
  }}
/>
<Breadcrumb
  class="mb-6"
  items={[
    { label: "Arkivliste", href: "/archive" },
    { label: `${set.archiveNumber ?? ""} · ${set.title ?? "-"}` },
  ]}
/>

{#if loading}
  <LoadingSpinner label="Laster notesett…" />
{:else if loadFailed}
  <LoadFailed
    title="Fant ikke notesettet"
    description="Notesettet kunne ikke lastes. Det kan også ha blitt slettet fra arkivet."
    onretry={loadSet}
  />
{:else}
  <div class="head">
    <div class="head__main">
      <h1 class="sbb-h2 title">{set.title}</h1>
      <div class="byline">
        {set.composer ?? "—"}{set.arranger ? ` · Arr. ${set.arranger}` : ""} · Arkivnr.
        {set.archiveNumber}
      </div>
    </div>
    <div class="head__actions">
      <button class="kebab" aria-label="Handlinger">
        <EllipsisVertical size={18} />
      </button>
      <Dropdown simple class="min-w-52">
        <DropdownItem onclick={openDetails}>
          <span class="menu-row"><Pencil size={16} /> Rediger detaljer</span>
        </DropdownItem>
        {#if set.hasBeenScanned}
          <DropdownItem onclick={downloadAll}>
            <span class="menu-row"><Download size={16} /> Last ned alle</span>
          </DropdownItem>
        {/if}
        <DropdownDivider />
        <DropdownItem
          class="text-red-400"
          onclick={() => (confirmDeleteOpen = true)}
        >
          <span class="menu-row"><Trash2 size={16} /> Slett notesett</span>
        </DropdownItem>
      </Dropdown>
    </div>
  </div>

  <div class="layout">
    <!-- Stemmer (present parts only) -->
    <section class="col-list panel">
      <div class="panel__head">
        <h2>Stemmer</h2>
        <span class="sbb-mono meta">
          {presentParts.length}
          {presentParts.length === 1 ? "stemme" : "stemmer"}
        </span>
        <button class="addbtn" onclick={openAdd}>
          <Plus size={15} /> Legg til stemme
        </button>
      </div>
      <div class="panel__body">
        {#if presentParts.length === 0 && !addingName}
          <div class="empty">
            <span class="ic"><FileMusic size={34} strokeWidth={1.9} /></span>
            <div class="t">Ingen stemmer enda</div>
            <div class="s">
              Last opp PDF-filer i panelet til høyre for å komme i gang.
            </div>
          </div>
        {:else}
          <div class="stemlist">
            {#if addingName}
              <div class="stem adding">
                <span class="ficon loading"><Spinner size={16} inline /></span>
                <div class="sbody">
                  <div class="name">Laster opp {addingName}…</div>
                </div>
              </div>
            {/if}
            {#each presentParts as part}
              <div class="stem" class:flash={justAdded.has(part.name ?? "")}>
                <span class="ficon"><FileText size={18} /></span>
                <div class="sbody">
                  <div class="name">{part.name}</div>
                </div>
                <span class="acts">
                  <button
                    class="iconbtn"
                    title="Last ned"
                    onclick={() => downloadPart(part)}
                  >
                    {#if selectedPartForDownload === part}
                      <Spinner size={16} inline />
                    {:else}
                      <Download size={17} />
                    {/if}
                  </button>
                  <button
                    class="iconbtn"
                    title="Bytt stemme"
                    onclick={() => askMovePart(part)}
                  >
                    <Replace size={17} />
                  </button>
                  <button
                    class="iconbtn danger"
                    title="Fjern"
                    onclick={() => askRemovePart(part)}
                  >
                    <Trash2 size={17} />
                  </button>
                </span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </section>

    <!-- Upload -->
    <section class="col-upload panel">
      <div class="panel__head"><h2>Last opp stemmer</h2></div>
      <div class="panel__body">
        <!-- The two ways files get onto a set are alternatives, not steps, and
             they take different things: files already split per stemme in one,
             a single combined PDF in the other. Side by side they read as two
             near-identical drop zones, so which one you want is a choice made
             up front instead. Each tab is disabled while the other is
             mid-flight: only the open tab's panel is rendered, so switching
             away would tear down an upload that is still running. -->
        <Tabs
          tabStyle="underline"
          class="flex w-full space-x-0"
          classes={{
            content:
              "mt-0 p-0 pt-4 bg-transparent dark:bg-transparent rounded-none",
          }}
        >
          <TabItem
            open
            title="Én fil per stemme"
            disabled={importRunning}
            class="flex-1"
            classes={{ button: "w-full cursor-pointer" }}
          >
            <div
              class="drop"
              class:drag={dragging}
              role="button"
              tabindex="0"
              onclick={() => fileInput.click()}
              onkeydown={(e) => (e.key === "Enter" ? fileInput.click() : null)}
              ondragover={(e) => {
                e.preventDefault();
                dragging = true;
              }}
              ondragleave={() => (dragging = false)}
              ondrop={(e) => {
                e.preventDefault();
                dragging = false;
                onFilesSelected(e.dataTransfer?.files ?? null);
              }}
            >
              <span class="ic"><CloudUpload size={30} /></span>
              <div class="t">
                Dra PDF-filer hit, eller <span class="lnk">velg filer</span>
              </div>
              <div class="s">
                Én PDF per stemme. Vi matcher hver fil mot stemmekatalogen ut
                fra filnavnet, og du får se og rette treffene før noe lastes
                opp.
              </div>
            </div>

            {#if review.length > 0}
              <div class="review">
                <div class="review__bar">
                  <span class="sum">
                    {#if isMatchingFiles}
                      Matcher filer mot stemmekatalogen…
                    {:else if hasDuplicateMatches}
                      <span class="conflict">
                        Flere filer peker på samme stemme — velg riktig stemme
                        for hver.
                      </span>
                    {:else}
                      <b>{matchedCount}</b> av {review.length} filer klare
                    {/if}
                  </span>
                  <Button
                    size="sm"
                    onclick={commit}
                    loading={isUploading}
                    disabled={isMatchingFiles || hasDuplicateMatches}
                  >
                    <Plus size={15} /> Legg til
                  </Button>
                </div>
                {#each review as row, i}
                  {@const isDuplicate = duplicateMatches.includes(row.match)}
                  {@const isReplacing =
                    !!row.match && existingPartNames.includes(row.match)}
                  <div
                    class="filerow"
                    class:matched={!!row.match && !isDuplicate}
                    class:unmatched={!row.match && !row.matching}
                    class:matching={row.matching}
                    class:duplicate={isDuplicate}
                  >
                    <span class="ficon">
                      {#if row.matching}
                        <Spinner size={16} inline />
                      {:else}
                        <FileText size={18} />
                      {/if}
                    </span>
                    <div class="fbody">
                      <div class="fnamerow">
                        <div class="fname">{row.name}</div>
                        {#if isReplacing}
                          <Badge variant="accent">
                            <Replace size={11} /> Erstatter
                          </Badge>
                        {/if}
                      </div>
                      {#if row.matching}
                        <div class="fstatus">Søker etter stemme…</div>
                      {:else}
                        <div class="fstatus">
                          {#if isDuplicate}
                            <CircleAlert size={13} /> Samme stemme som en annen fil
                          {:else if !row.match}
                            <CircleAlert size={13} /> Fant ingen stemme — velg den
                            selv
                          {:else if row.chosenManually}
                            <CircleCheck size={13} /> Valgt manuelt
                          {:else}
                            <CircleCheck size={13} /> Matchet automatisk
                          {/if}
                        </div>
                        <!-- Every settled file keeps its picker, not just the
                             ones that missed: the index answers with the closest
                             part it has, which can be the wrong one, and this is
                             the only place that choice can be corrected before
                             upload. -->
                        <div class="assign">
                          <Select
                            size="sm"
                            items={catalogItems}
                            value={row.match}
                            placeholder="Velg stemme…"
                            aria-label={`Stemme for ${row.name}`}
                            onchange={(e) => assign(i, e.currentTarget.value)}
                          />
                        </div>
                      {/if}
                    </div>
                    <button
                      class="rm"
                      title="Fjern"
                      onclick={() => dropFile(i)}
                    >
                      <X size={17} />
                    </button>
                  </div>
                {/each}
              </div>
            {/if}
          </TabItem>

          <TabItem
            disabled={isUploading || isMatchingFiles}
            class="flex-1"
            classes={{ button: "w-full cursor-pointer" }}
          >
            {#snippet titleSlot()}
              <span class="tabtitle"
                ><Sparkles size={15} /> Samle-PDF med AI</span
              >
            {/snippet}

            <PdfImportPanel
              description="Stemmenavnet leses fra toppteksten på hver side, og filen deles i én PDF per stemme. Stemmer settet allerede har, hoppes over. Kun PDF, maks 300 MB."
              importFile={importPdfParts}
              onimported={onPartsImported}
              failedMessage="Importen feilet, eller svaret tok for lang tid. Last siden på nytt og sjekk om stemmene likevel ble lagt til før du prøver igjen."
            />

            <p class="mode-tip">
              Bruk «Alle stemmer»-filen her. Et partitur har sjelden stemmenavn
              i toppteksten og bør legges til med «Legg til stemme» i stedet —
              og ikke slå partitur og stemmer sammen til én PDF: sider uten
              lesbar topptekst havner i stemmen foran.
            </p>

            {#if importSummaryShown}
              <div class="importsum">
                <div class="importsum__row ok">
                  <CircleCheck size={15} />
                  <span>
                    {#if importAddedParts.length > 0}
                      La til {importAddedParts.length}
                      {importAddedParts.length === 1 ? "stemme" : "stemmer"}:
                      {importAddedParts.join(", ")}
                    {:else}
                      Ingen nye stemmer ble lagt til.
                    {/if}
                  </span>
                </div>
                {#if importUnrecognized.length > 0}
                  <div class="importsum__row warn">
                    <CircleAlert size={15} />
                    <span>
                      Fant ingen stemme som passer {importUnrecognized.join(
                        ", ",
                      )} — lagt i «Manglende noter». Legg navnet inn som alias på
                      riktig stemme, så treffer neste import.
                    </span>
                  </div>
                {/if}
                {#if importDroppedPages}
                  <div class="importsum__row warn">
                    <CircleAlert size={15} />
                    <span>
                      Noen sider hadde ingen lesbar topptekst og ble
                      <b>ikke lagt til</b> i settet. Last dem opp selv med «Legg til
                      stemme».
                    </span>
                  </div>
                {/if}
                <p class="importsum__note">
                  Sjekk stemmelisten: ligger en fil på feil stemme, flytt den
                  med «Bytt stemme». Sammenlign også sidetallet med originalen
                  før du regner settet som komplett.
                </p>
              </div>
            {/if}
          </TabItem>
        </Tabs>
      </div>
    </section>

    <!-- Settinformasjon -->
    <aside class="col-info panel">
      <div class="panel__head"><h2>Settinformasjon</h2></div>
      <div class="panel__body">
        {#if categoryCatalog.length > 0 || assignedCategories.length > 0}
          <div class="field">
            <div class="labelrow">
              <label for="categoryPicker">Kategorier</label>
              <SaveIndicator state={categorySave} />
            </div>
            {#if assignedCategories.length === 0}
              <p class="cat-empty">Ingen kategorier valgt.</p>
            {:else}
              <div class="cat-chips">
                {#each assignedCategories as category (category.id)}
                  <span class="cat-chip">
                    {category.name}
                    <button
                      type="button"
                      aria-label={`Fjern ${category.name}`}
                      disabled={categoryBusy}
                      onclick={() => removeCategory(category)}
                    >
                      <X size={13} />
                    </button>
                  </span>
                {/each}
              </div>
            {/if}
            {#if assignableCategories.length > 0}
              <Select
                id="categoryPicker"
                size="sm"
                items={assignableCategories}
                bind:value={categoryPick}
                placeholder="Legg til kategori…"
                disabled={categoryBusy}
                onchange={(e) => assignCategory(e.currentTarget.value)}
              />
            {/if}
            <span class="hint">
              Kategorier gjør settet lettere å finne i arkivlisten.
            </span>
          </div>
        {/if}
        <div class="field">
          <div class="labelrow">
            <label for="recordingUrl">Lytteeksempel</label>
            <SaveIndicator state={recordingSave} />
          </div>
          <div class="ctrl">
            <span class="ico"><Headphones size={16} /></span>
            <input
              id="recordingUrl"
              class="in has-ico"
              type="url"
              placeholder="Lenke til lytteeksempel…"
              value={set.recordingUrl ?? ""}
              oninput={(e) => {
                set.recordingUrl = e.currentTarget.value;
                scheduleRecordingSave();
              }}
            />
          </div>
          <span class="hint">
            Lenke til en innspilling medlemmene kan lytte til.
          </span>
        </div>
        <div class="field">
          <div class="labelrow">
            <label for="missingParts">Manglende noter</label>
            <SaveIndicator state={missingSave} />
          </div>
          <textarea
            id="missingParts"
            class="in"
            placeholder="F.eks. «Mangler 2. trombone og pauker — må scannes»."
            value={set.missingParts ?? ""}
            oninput={(e) => {
              set.missingParts = e.currentTarget.value;
              scheduleMissingSave();
            }}
          ></textarea>
          <span class="hint">
            Fritekst. Vises som notis til medlemmene på settsiden.
          </span>
        </div>
      </div>
    </aside>

    <!-- Brukshistorikk -->
    <div class="col-history">
      <SetProjectHistory setId={set.id} archiveNumber={set.archiveNumber} />
    </div>
  </div>
{/if}

<ConfirmDialog
  bind:open={confirmDeleteOpen}
  title="Er du sikker på at du vil slette notesettet?"
  description="Handlingen kan ikke reverseres!"
  onconfirm={removeSet}
/>

<ConfirmDialog
  bind:open={confirmRemovePartOpen}
  title="Slette stemmen?"
  description={`Hele PDF-filen for «${partToRemove?.name ?? ""}» slettes permanent fra arkivet. Handlingen kan ikke reverseres.`}
  confirmTitle="Slett"
  onconfirm={removePart}
/>

<Modal
  title="Bytt stemme"
  bind:open={movePartOpen}
  size="xs"
  dismissable={!movingPart}
  outsideclose={!movingPart}
>
  <div class="field" style="margin-bottom:0">
    <label for="moveTarget">
      Flytt filen fra «{partToMove?.name ?? ""}» til
    </label>
    <Select
      id="moveTarget"
      items={moveTargets}
      bind:value={moveTarget}
      placeholder="Velg riktig stemme…"
      disabled={movingPart}
    />
    <span class="hint">
      Samme PDF legges på stemmen du velger, og fjernes fra «{partToMove?.name ??
        ""}». En stemme som allerede har en fil kan ikke velges — fjern den
      filen først hvis den er feil.
    </span>
  </div>
  {#if moveError}
    <p class="error-message">{moveError}</p>
  {/if}
  {#snippet footer()}
    <Button onclick={movePart} loading={movingPart} disabled={!moveTarget}>
      <Replace size={16} /> Flytt
    </Button>
    <Button
      variant="ghost"
      disabled={movingPart}
      onclick={() => (movePartOpen = false)}
    >
      Avbryt
    </Button>
  {/snippet}
</Modal>

<Modal title="Legg til stemme" bind:open={addOpen} size="xs">
  <div class="field" style="margin-bottom:0">
    <label for="addInput">Velg stemme fra katalogen</label>
    <Select
      id="addInput"
      items={catalogItems}
      bind:value={addValue}
      placeholder="Velg stemme…"
    />
    <span class="hint"> Velg en stemme, last så opp PDF-en for den. </span>
  </div>
  {#snippet footer()}
    <Button onclick={confirmAdd}><Upload size={16} /> Velg fil</Button>
    <Button variant="ghost" onclick={() => (addOpen = false)}>Avbryt</Button>
  {/snippet}
</Modal>

<Modal title="Rediger detaljer" bind:open={detailsOpen} size="sm">
  <MusicSetModalBody set={draft} />
  {#if detailsError}
    <p class="error-message">{detailsError}</p>
  {/if}
  {#snippet footer()}
    <Button
      onclick={saveDetails}
      loading={savingDetails}
      disabled={!canSaveDetails}
    >
      <Check size={16} /> Lagre detaljer
    </Button>
    <Button variant="ghost" onclick={() => (detailsOpen = false)}>Avbryt</Button
    >
  {/snippet}
</Modal>

<style>
  /* ---- header ---- */
  .head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 28px;
  }
  .head__main {
    min-width: 0;
  }
  .title {
    margin: 0;
    font-size: 30px;
  }
  .byline {
    font-size: 14px;
    color: var(--text-secondary);
    margin-top: 6px;
  }
  .head__actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
    position: relative;
  }
  .labelrow {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .kebab {
    width: 42px;
    height: 42px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--text-primary);
    background: transparent;
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: background var(--dur-fast);
  }
  .kebab:hover {
    background: var(--surface-hover);
  }
  .menu-row {
    display: flex;
    align-items: center;
    gap: 11px;
    width: 100%;
  }
  .menu-row :global(svg) {
    flex-shrink: 0;
  }

  /* ---- layout ---- */
  .layout {
    display: grid;
    grid-template-columns: 1fr 408px;
    grid-template-areas:
      "list upload"
      "list info"
      "list history"
      "list .";
    grid-template-rows: auto auto auto 1fr;
    gap: 24px;
    align-items: start;
  }
  .col-list {
    grid-area: list;
  }
  .col-upload {
    grid-area: upload;
  }
  .col-info {
    grid-area: info;
  }
  .col-history {
    grid-area: history;
  }

  .panel {
    background: var(--surface-card);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
  }
  .panel__head {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 18px 20px;
    border-bottom: 1px solid var(--border-subtle);
  }
  .panel__head h2 {
    margin: 0;
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 22px;
    color: var(--text-primary);
  }
  /* Count pushes right so it groups with the add button on wide screens. */
  .panel__head .meta {
    font-size: 12px;
    margin-left: auto;
  }
  /* On phones the count drops onto its own line, under the "Stemmer" title. */
  @media (max-width: 640px) {
    .panel__head {
      flex-wrap: wrap;
      row-gap: 4px;
    }
    .panel__head .meta {
      order: 3;
      flex-basis: 100%;
      margin-left: 0;
    }
    .panel__head .addbtn {
      margin-left: auto;
    }
  }
  .panel__body {
    padding: 18px 20px;
  }

  .addbtn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    height: 34px;
    padding: 0 13px;
    font-family: var(--font-text);
    font-weight: 600;
    font-size: 13px;
    color: var(--accent);
    background: transparent;
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-sm);
    cursor: pointer;
    white-space: nowrap;
    transition:
      border-color var(--dur-fast),
      background var(--dur-fast);
  }
  .addbtn:hover {
    border-color: var(--accent);
    background: var(--accent-soft);
  }

  /* ---- stemmer (present parts) ---- */
  .stemlist {
    display: flex;
    flex-direction: column;
  }
  .stem {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 11px 10px;
    margin: 0 -10px;
    border-bottom: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
  }
  .stem:last-child {
    border-bottom: none;
  }
  .stem .ficon {
    width: 38px;
    height: 38px;
    border-radius: var(--radius-sm);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: var(--surface-sunken);
    color: var(--success);
  }
  .stem .ficon.loading {
    color: var(--text-muted);
  }
  .stem.adding .name {
    color: var(--text-secondary);
  }
  .stem .sbody {
    flex: 1;
    min-width: 0;
  }
  .stem .name {
    font-size: 15px;
    font-weight: 500;
    color: var(--text-primary);
  }
  @keyframes stemFlash {
    0% {
      background: var(--accent-soft);
    }
    100% {
      background: transparent;
    }
  }
  .stem.flash {
    animation: stemFlash 1.4s var(--ease-out);
  }
  .stem .acts {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .iconbtn {
    width: 34px;
    height: 34px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all var(--dur-fast);
  }
  .iconbtn:hover {
    color: var(--text-primary);
    background: var(--surface-hover);
  }
  .iconbtn.danger:hover {
    color: var(--danger);
    background: rgba(251, 112, 89, 0.12);
  }

  /* empty state */
  .empty {
    text-align: center;
    padding: 40px 20px;
  }
  .empty .ic {
    color: var(--text-muted);
    display: inline-flex;
    margin-bottom: 12px;
  }
  .empty .t {
    font-weight: 600;
    font-size: 16px;
    color: var(--text-primary);
  }
  .empty .s {
    font-size: 13px;
    color: var(--text-secondary);
    margin-top: 6px;
  }

  /* ---- upload ---- */
  .drop {
    border: 1.5px dashed var(--border-strong);
    border-radius: var(--radius-md);
    padding: 24px;
    text-align: center;
    cursor: pointer;
    transition:
      border-color var(--dur-fast),
      background var(--dur-fast);
  }
  .drop:hover,
  .drop.drag {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .drop .ic {
    color: var(--brass-500);
    display: inline-flex;
    margin-bottom: 8px;
  }
  .drop .t {
    font-weight: 600;
    font-size: 15px;
  }
  .drop .lnk {
    color: var(--accent);
  }
  .drop .s {
    font-size: 12.5px;
    color: var(--text-muted);
    margin-top: 4px;
  }

  /* The AI tab's title, so the sparkle sits on the accent rather than reading as
     one more grey glyph. */
  .tabtitle {
    display: inline-flex;
    align-items: center;
    gap: 7px;
  }
  .tabtitle :global(svg) {
    color: var(--accent);
  }
  .mode-tip {
    margin: 12px 0 0;
    font-size: 12.5px;
    line-height: 1.5;
    color: var(--text-muted);
  }
  .importsum {
    margin-top: 14px;
  }
  .importsum__row {
    display: flex;
    align-items: flex-start;
    gap: 7px;
    font-size: 13px;
    line-height: 1.45;
  }
  .importsum__row + .importsum__row {
    margin-top: 6px;
  }
  .importsum__row :global(svg) {
    flex: none;
    margin-top: 2px;
  }
  .importsum__row.ok {
    color: var(--text-secondary);
  }
  .importsum__row.ok :global(svg) {
    color: var(--success);
  }
  .importsum__row.warn {
    color: var(--text-secondary);
  }
  .importsum__row.warn :global(svg) {
    color: var(--brass-400);
  }
  .importsum__note {
    margin: 8px 0 0;
    font-size: 12.5px;
    color: var(--text-muted);
  }

  .review {
    margin-top: 16px;
  }
  .review__bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 12px;
  }
  .review__bar .sum {
    font-size: 13px;
    color: var(--text-secondary);
  }
  .review__bar .sum b {
    color: var(--success);
  }
  .review__bar .sum .conflict {
    color: var(--danger);
  }
  .filerow {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    margin-bottom: 10px;
    background: var(--ink-900);
  }
  .filerow .ficon {
    width: 38px;
    height: 38px;
    border-radius: var(--radius-sm);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: var(--surface-sunken);
    color: var(--text-secondary);
  }
  .filerow.matched .ficon {
    color: var(--success);
  }
  .filerow.unmatched .ficon {
    color: var(--brass-400);
  }
  .filerow.matching .ficon,
  .filerow.matching .fstatus {
    color: var(--text-muted);
  }
  .filerow.duplicate {
    border-color: var(--danger-soft);
  }
  .filerow.duplicate .ficon,
  .filerow.duplicate .fstatus {
    color: var(--danger);
  }
  .filerow .fbody {
    flex: 1;
    min-width: 0;
  }
  .filerow .fnamerow {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }
  .filerow .fname {
    flex: 1;
    min-width: 0;
    font-size: 13.5px;
    font-weight: 500;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .filerow .fstatus {
    font-size: 12px;
    margin-top: 3px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .filerow.matched .fstatus {
    color: var(--success);
  }
  .filerow.unmatched .fstatus {
    color: var(--brass-400);
  }
  .filerow .assign {
    margin-top: 8px;
  }
  .filerow .rm {
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
  }
  .filerow .rm:hover {
    color: var(--danger);
    background: rgba(251, 112, 89, 0.12);
  }

  /* ---- fields ---- */
  .field {
    display: flex;
    flex-direction: column;
    gap: 7px;
    margin-bottom: 16px;
  }
  .field:last-child {
    margin-bottom: 0;
  }
  .field label {
    font-weight: 600;
    font-size: 13px;
    color: var(--text-primary);
  }
  .field .hint {
    font-size: 12px;
    color: var(--text-muted);
  }
  .ctrl {
    position: relative;
    display: flex;
    align-items: center;
  }

  /* ---- kategorier ---- */
  .cat-empty {
    margin: 0;
    font-size: 12.5px;
    font-style: italic;
    color: var(--text-muted);
  }
  .cat-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .cat-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 30px;
    padding: 0 6px 0 12px;
    font-size: 13px;
    color: var(--text-secondary);
    background: var(--surface-sunken);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-full);
  }
  .cat-chip button {
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
  .cat-chip button:hover {
    color: var(--danger);
    background: var(--danger-soft);
  }
  .cat-chip button:disabled {
    cursor: progress;
  }
  .ctrl .ico {
    position: absolute;
    left: 13px;
    color: var(--text-muted);
    display: flex;
    pointer-events: none;
  }

  .in {
    width: 100%;
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
  input.in {
    height: 44px;
    padding: 0 14px;
  }
  input.in.has-ico {
    padding-left: 40px;
  }
  textarea.in {
    padding: 11px 14px;
    min-height: 70px;
    resize: vertical;
    line-height: 1.5;
  }
  .in:focus {
    border-color: var(--accent);
    box-shadow: var(--ring-focus);
  }

  .error-message {
    margin-top: 16px;
    font-family: var(--font-text);
    font-size: 13px;
    color: var(--danger);
  }

  /* ---- responsive ---- */
  @media (max-width: 900px) {
    .layout {
      grid-template-columns: 1fr;
      grid-template-areas:
        "upload"
        "list"
        "info"
        "history";
      grid-template-rows: auto auto auto auto;
      gap: 16px;
    }
    .title {
      font-size: 26px;
    }
    input.in {
      height: 48px;
      font-size: 16px;
    }
    textarea.in {
      font-size: 16px;
    }
  }
</style>
