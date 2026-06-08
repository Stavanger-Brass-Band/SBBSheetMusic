<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import {
    Modal,
    Dropdown,
    DropdownItem,
    DropdownDivider,
    Spinner,
    Button,
    Label,
    Input,
    Helper,
    Select,
    Fileupload,
    Card,
    ButtonGroup,
    InputAddon,
    Table,
    TableHead,
    TableHeadCell,
    TableBody,
    TableBodyRow,
    TableBodyCell,
  } from "flowbite-svelte";
  import { Breadcrumb } from "$lib/components/ui";
  import {
    TrashBinOutline,
    DownloadOutline,
    ExclamationCircleOutline,
    CheckCircleOutline,
    HeadphonesOutline,
    AnnotationOutline,
    ChevronDownOutline,
  } from "flowbite-svelte-icons";
  import { sheetMusic } from "$lib/api/sheetMusic";
  import { parts as partsApi } from "$lib/api/parts";
  import { catalog } from "$lib/stores/catalog.svelte";
  import { downloadPdf } from "$lib/utils/download";
  import type {
    MusicSet,
    MusicSetPart,
    Part,
    SetRequest,
    UploadFile,
  } from "$lib/types";
  import LoadingSpinner from "$lib/components/LoadingSpinner.svelte";
  import MusicSetModalBody from "$lib/components/MusicSetModalBody.svelte";
  import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";

  let id = $derived(page.params.id!);

  let set = $state<MusicSet>({});
  let loading = $state(true);
  let uploadComplete = $state(false);
  let uploads = $state<UploadFile[]>([]);
  let partSelectData = $state<Part[]>([]);
  let isUploading = $state(false);
  let selectedPartForDownload = $state<MusicSetPart | null>(null);
  let editSetModalIsOpen = $state(false);
  let savingSet = $state(false);

  let confirmDeleteSetOpen = $state(false);
  let confirmDeletePartOpen = $state(false);
  let partToDelete = $state<MusicSetPart | null>(null);

  let partItems = $derived(
    partSelectData.map((p) => ({ value: p.id ?? "", name: p.name ?? "" })),
  );

  onMount(async () => {
    set = await sheetMusic.getSetWithParts(id);
    const result = await partsApi.list();
    result.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    partSelectData = result;
    loading = false;
  });

  async function reloadParts() {
    const result = await sheetMusic.getSetWithParts(id);
    set.parts = [...(result.parts ?? [])];
    set.hasBeenScanned = !!set.parts && set.parts.length > 0;
    catalog.updateMusicSet(set);
  }

  async function removeSet() {
    const result = await sheetMusic.deleteSet(id);
    if (result.status === 200) {
      catalog.removeMusicSetById(id);
      goto("/archive");
    }
  }

  function askRemovePart(part: MusicSetPart) {
    partToDelete = part;
    confirmDeletePartOpen = true;
  }

  async function removePart() {
    const part = partToDelete;
    if (!part) return;
    const result = await sheetMusic.deletePart(id, part.musicPartId ?? "");
    if (result.status === 204) {
      set.parts = (set.parts ?? []).filter((p) => p !== part);
    }
    reloadParts();
  }

  function onFilesSelected(event: Event) {
    const list = (event.currentTarget as HTMLInputElement).files;
    if (!list) return;
    uploads = Array.from(list).map((file) => ({ file, name: file.name }));
    void suggestParts();
  }

  async function suggestParts() {
    uploadComplete = false;
    isUploading = true;
    uploads = uploads.map((u) => ({ ...u, isCheckingStatus: true }));

    const results = await Promise.all(
      uploads.map((u) =>
        partsApi.suggest(
          u.name.replace(set.title ?? "", "").replace(".pdf", ""),
        ),
      ),
    );

    uploads = uploads.map((u, i) => ({
      ...u,
      isCheckingStatus: false,
      suggestedPart: results[i],
    }));
    isUploading = false;
  }

  async function uploadFiles(event: SubmitEvent) {
    event.preventDefault();
    isUploading = true;

    for (let i = 0; i < uploads.length; i++) {
      const u = uploads[i];
      if (!u.suggestedPart?.name) continue;

      const result = await sheetMusic.uploadPartContent(
        set.id!,
        u.suggestedPart.name,
        u.file,
      );

      if (result && "success" in result) {
        uploads[i].uploadSuccess = true;
      } else if (result && (result as Record<string, unknown>).Status === 409) {
        uploads[i].uploadErrorMessage =
          "Stemmen eksiterer allerede på notesettet";
      }
    }

    isUploading = false;
    uploadComplete = true;
    reloadParts();
  }

  async function showPart(part: MusicSetPart) {
    if (selectedPartForDownload === part) return;
    selectedPartForDownload = part;

    const downloadToken = await sheetMusic.getZipToken(id);
    if (downloadToken) {
      const blob = await sheetMusic.getPartPdf(
        id,
        part.name ?? "",
        downloadToken,
      );
      downloadPdf(blob, `${set.title} - ${part.name}.pdf`);
    }
    selectedPartForDownload = null;
  }

  async function downloadAll() {
    const downloadToken = await sheetMusic.getZipToken(id);
    window.location.assign(
      `${set.zipDownloadUrl}?downloadToken=${downloadToken}`,
    );
  }

  function setSuggestedPart(upload: UploadFile, partId: string) {
    upload.suggestedPart = partSelectData.find((p) => p.id === partId);
  }

  async function saveSet() {
    savingSet = true;
    const result = await sheetMusic.updateSet(set.id!, set as SetRequest);
    savingSet = false;
    if (result) {
      editSetModalIsOpen = false;
      set.title = result.title;
      set.arranger = result.arranger;
      set.composer = result.composer;
      set.archiveNumber = result.archiveNumber;
      catalog.updateMusicSet(set);
    }
  }

  // Debounced autosave for the inline "missing parts" / "recording url" fields.
  let saveTimeout: ReturnType<typeof setTimeout> | undefined;
  function debouncedSave() {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => saveSet(), 1000);
  }
  onDestroy(() => {
    if (saveTimeout) clearTimeout(saveTimeout);
  });
</script>

<Breadcrumb
  class="mb-6"
  items={[
    { label: "Arkivliste", href: "/archive" },
    { label: `${set.archiveNumber} - ${set.title ?? "-"}` },
  ]}
/>

{#if loading}
  <LoadingSpinner />
{:else}
  <div class="mb-6 flex items-start justify-between gap-4">
    <div>
      <h1 class="text-3xl font-semibold">{set.title}</h1>
      <p class="text-lg text-gray-400">
        {#if set.composer}{set.composer}{/if}
        {#if set.composer && set.arranger},{/if}
        {#if set.arranger}Arr. {set.arranger}{/if}
      </p>
    </div>
    <div class="shrink-0">
      <Button color="alternative">
        Handlinger<ChevronDownOutline class="ms-2 h-4 w-4" />
      </Button>
      <Dropdown simple>
        {#if set.hasBeenScanned}
          <DropdownItem onclick={downloadAll}>Last ned alle notene</DropdownItem
          >
        {/if}
        <DropdownItem onclick={() => (editSetModalIsOpen = true)}
          >Rediger</DropdownItem
        >
        <DropdownDivider />
        <DropdownItem onclick={() => (confirmDeleteSetOpen = true)}
          >Slett</DropdownItem
        >
      </Dropdown>
    </div>
  </div>

  <div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
    <div>
      <h4 class="mb-4 text-xl font-medium">Noter</h4>

      {#if !set.parts || set.parts.length < 1}
        <em class="text-gray-400">
          Ingen tilknyttede noter til notesettet. Last opp notefiler for å
          knytte dem til notesettet.
        </em>
      {:else}
        <Table>
          <TableHead>
            <TableHeadCell>Stemme</TableHeadCell>
            <TableHeadCell class="text-right">Handlinger</TableHeadCell>
          </TableHead>
          <TableBody>
            {#each set.parts as part}
              <TableBodyRow>
                <TableBodyCell class="font-normal">{part.name}</TableBodyCell>
                <TableBodyCell class="text-right">
                  <div class="inline-flex gap-2">
                    <Button
                      size="xs"
                      color="alternative"
                      onclick={(e: MouseEvent) => {
                        e.preventDefault();
                        showPart(part);
                      }}
                    >
                      {#if selectedPartForDownload === part}
                        <Spinner size="4" />
                      {:else}
                        <DownloadOutline size="sm" />
                      {/if}
                    </Button>
                    <Button
                      size="xs"
                      color="red"
                      onclick={() => askRemovePart(part)}
                    >
                      <TrashBinOutline size="sm" />
                    </Button>
                  </div>
                </TableBodyCell>
              </TableBodyRow>
            {/each}
          </TableBody>
        </Table>
      {/if}
    </div>

    <div>
      <form class="mb-6 space-y-4">
        <h4 class="text-xl font-medium">Settinformasjon</h4>
        <div>
          <Label class="mb-2">Manglende noter</Label>
          <ButtonGroup class="w-full">
            <InputAddon><AnnotationOutline size="sm" /></InputAddon>
            <Input
              value={set.missingParts ?? ""}
              oninput={(e) => {
                set.missingParts = (e.currentTarget as HTMLInputElement).value;
                debouncedSave();
              }}
              placeholder="Manglende noter..."
            />
          </ButtonGroup>
        </div>
        <div>
          <Label class="mb-2">Lytteeksempel</Label>
          <ButtonGroup class="w-full">
            <InputAddon><HeadphonesOutline size="sm" /></InputAddon>
            <Input
              value={set.recordingUrl ?? ""}
              oninput={(e) => {
                set.recordingUrl = (e.currentTarget as HTMLInputElement).value;
                debouncedSave();
              }}
              placeholder="Legg inn link til lytteeksempel..."
            />
          </ButtonGroup>
        </div>
        {#if savingSet}
          <div class="flex items-center gap-2 text-sm text-gray-400">
            <Spinner size="4" /> Lagrer...
          </div>
        {/if}
      </form>

      <Card class="w-full max-w-none p-4">
        <h4 class="mb-3 text-lg font-medium">Last opp noter</h4>
        <form onsubmit={uploadFiles} class="space-y-3">
          <div>
            <Label for="pdfFileInput" class="mb-2">Velg PDF filer</Label>
            <Fileupload
              id="pdfFileInput"
              multiple
              accept=".pdf"
              onchange={onFilesSelected}
            />
            <Helper class="mt-2">
              Her velges alle notefilene som skal knyttes til notesettet. Kun
              PDF filer støttes.
            </Helper>
          </div>

          {#if uploads.length > 0}
            <div class="flex items-center justify-between">
              <span class="font-medium">Valgte filer</span>
              <Button
                size="xs"
                color="alternative"
                onclick={(e: MouseEvent) => {
                  e.preventDefault();
                  uploads = [];
                }}
              >
                Nullstill
              </Button>
            </div>
            <div class="divide-y divide-gray-700">
              {#each uploads as upload}
                <div class="relative py-3 pr-10">
                  <div>{upload.name}</div>
                  {#if upload.suggestedPart && !upload.uploadSuccess && !upload.uploadErrorMessage}
                    <div class="mt-2">
                      {#if upload.suggestedPart.name}
                        <span class="text-sm text-green-400">
                          Stemme valgt. Kontroller før opplasting
                        </span>
                      {:else}
                        <span
                          class="inline-flex items-center gap-1 text-sm text-yellow-400"
                        >
                          <ExclamationCircleOutline size="sm" />
                          Kunne ikke finne en stemme basert på filnavnet. Velg fra
                          listen
                        </span>
                      {/if}
                      {#if !isUploading && !upload.uploadErrorMessage}
                        <Select
                          class="mt-2"
                          items={partItems}
                          value={upload.suggestedPart.id ?? ""}
                          placeholder="Velg en stemme..."
                          onchange={(e) =>
                            setSuggestedPart(upload, e.currentTarget.value)}
                        />
                      {/if}
                    </div>
                  {/if}
                  {#if upload.isCheckingStatus}
                    <small class="text-gray-400">Finner stemme...</small>
                  {/if}
                  {#if upload.uploadSuccess}
                    <small class="text-green-400">
                      Lastet opp stemme: {upload.suggestedPart?.name}
                    </small>
                  {/if}
                  {#if upload.uploadErrorMessage}
                    <small class="text-red-400"
                      >{upload.uploadErrorMessage}</small
                    >
                  {/if}
                  <div class="absolute top-1/2 right-2 -translate-y-1/2">
                    {#if (isUploading && !upload.uploadSuccess && !upload.uploadErrorMessage) || upload.isCheckingStatus}
                      <Spinner size="5" />
                    {:else if upload.uploadSuccess}
                      <CheckCircleOutline class="text-green-400" />
                    {:else if upload.uploadErrorMessage}
                      <ExclamationCircleOutline class="text-red-400" />
                    {/if}
                  </div>
                </div>
              {/each}
            </div>

            {#if !uploadComplete}
              <Button type="submit" disabled={isUploading}>Last opp</Button>
            {/if}
          {/if}
        </form>
      </Card>
    </div>
  </div>
{/if}

<ConfirmDialog
  bind:open={confirmDeleteSetOpen}
  title="Er du sikker på at du vil slette notesettet?"
  description="Handlingen kan ikke reverseres!"
  onconfirm={removeSet}
/>

<ConfirmDialog
  bind:open={confirmDeletePartOpen}
  title="Er du sikker på at du vil slette noten?"
  description="Handlingen kan ikke reverseres!"
  onconfirm={removePart}
/>

<Modal title="Oppdater notesett" bind:open={editSetModalIsOpen} size="sm">
  <MusicSetModalBody {set} />
  {#snippet footer()}
    <Button onclick={saveSet}>Lagre</Button>
    <Button color="alternative" onclick={() => (editSetModalIsOpen = false)}>
      Lukk
    </Button>
  {/snippet}
</Modal>
