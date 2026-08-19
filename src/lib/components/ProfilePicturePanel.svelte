<script lang="ts">
  import { onDestroy } from "svelte";
  import { Modal } from "flowbite-svelte";
  import { Check, ImagePlus, Trash2 } from "@lucide/svelte";
  import { users as usersApi } from "$lib/api/users";
  import { auth } from "$lib/stores/auth.svelte";
  import { profilePictures } from "$lib/stores/profilePictures.svelte";
  import type { SaveState } from "$lib/types";
  import type { SquareCrop } from "$lib/utils/profilePicture";
  import {
    Button,
    SaveIndicator,
    UserAvatar,
    SAVED_VISIBLE_MS,
  } from "$lib/components/ui";
  import ProfilePictureCropper from "./ProfilePictureCropper.svelte";
  import ConfirmDialog from "./ConfirmDialog.svelte";

  /**
   * The Profilbilde panel, shared by a user's own profile page and the admin user
   * editor — the API allows both on the same endpoint (your own picture, or
   * anyone's as an Admin), so both hosts hand over an id and get the same panel.
   *
   * Choosing a file opens the cropper; confirming there uploads. Both the upload
   * and the removal write immediately, with no Lagre button of their own, so the
   * panel owes the reader a `SaveIndicator` and an error that stays put until the
   * next attempt.
   */
  let {
    userId,
    name,
    pictureVersion,
    onchange,
  }: {
    userId: string;
    /** For the initials shown until there is a picture. */
    name: string | null;
    /** The version the API reports on the user, or `null` for no picture. */
    pictureVersion: string | null;
    /**
     * Called once a change has landed, with the new version or `null` after a
     * removal, so the host can carry it on the user it holds.
     */
    onchange: (version: string | null) => void;
  } = $props();

  /**
   * What the API accepts, checked here so a file that was never going to make it
   * is refused before the upload rather than after it. The server is still the
   * judge — it answers `tooLarge` or `invalidFile` — but only these three types
   * are offered, and only the browser can measure the pixels.
   */
  const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
  const MAXIMUM_FILE_BYTES = 5 * 1024 * 1024;
  const MAXIMUM_EDGE_PIXELS = 4096;
  const LIMITS_HINT = "JPG, PNG eller WebP. Maks 5 MB og 4096 × 4096 px.";

  let fileInput: HTMLInputElement;
  /** Focused again after a dialog closes, so the keyboard lands where it began. */
  let uploadButton = $state<HTMLButtonElement>();
  let isConfirmingRemoval = $state(false);
  let dragging = $state(false);
  let saveState = $state<SaveState>("idle");
  let savedTimer: ReturnType<typeof setTimeout> | undefined;
  let errorMessage = $state("");

  /** The file being cropped, and the square chosen for it so far. */
  let pendingFile = $state<File | null>(null);
  let chosenCrop = $state<SquareCrop | null>(null);
  let isCropperOpen = $state(false);

  let isSaving = $derived(saveState === "saving");
  let hasPicture = $derived(!!pictureVersion);

  onDestroy(() => clearTimeout(savedTimer));

  /** Why this file can't be sent, or "" when it can. */
  function rejectionFor(file: File): string {
    if (!ACCEPTED_TYPES.includes(file.type))
      return "Bildet må være JPG, PNG eller WebP.";
    if (file.size > MAXIMUM_FILE_BYTES)
      return "Bildet er for stort. Maks 5 MB.";
    return "";
  }

  /**
   * Why the image's own pixels rule it out, or "" when they don't. Separate from
   * `rejectionFor` because it can only be answered once the browser has decoded
   * the file, which the cropper does — so this is checked when the image loads
   * rather than when it is chosen.
   */
  function dimensionRejection(width: number, height: number): string {
    if (width > MAXIMUM_EDGE_PIXELS || height > MAXIMUM_EDGE_PIXELS)
      return `Bildet er for stort: ${width} × ${height} px. Maks 4096 × 4096 px.`;
    return "";
  }

  function chooseFile(files: FileList | null) {
    const file = files?.[0];
    // The input is cleared as soon as the file is in hand, so choosing the same
    // photo again still fires a change event — it holds onto its value
    // otherwise, and a reader who cancels the crop and reaches for the same
    // photo would get no response at all. The `File` outlives the input's value.
    if (fileInput) fileInput.value = "";
    if (!file || isSaving) return;

    const rejection = rejectionFor(file);
    if (rejection) {
      errorMessage = rejection;
      return;
    }

    errorMessage = "";
    chosenCrop = null;
    pendingFile = file;
    isCropperOpen = true;
  }

  function closeCropper() {
    isCropperOpen = false;
    pendingFile = null;
    chosenCrop = null;
    uploadButton?.focus();
  }

  /** The cropper reports the decoded size; too many pixels ends the attempt. */
  function checkDimensions(width: number, height: number) {
    const rejection = dimensionRejection(width, height);
    if (!rejection) return;
    closeCropper();
    errorMessage = rejection;
  }

  function reportSaved(version: string | null) {
    saveState = "saved";
    clearTimeout(savedTimer);
    savedTimer = setTimeout(() => (saveState = "idle"), SAVED_VISIBLE_MS);
    onchange(version);
    // The header draws its avatar from the signed-in user's own cached version,
    // so changing your own picture — here or as an Admin editing yourself — has
    // to refresh that too, or the account menu keeps the old one until the next
    // sign-in.
    if (userId === auth.userId) void auth.loadRoles();
  }

  function reportFailure(message: string) {
    saveState = "error";
    errorMessage = message;
  }

  async function upload() {
    if (!pendingFile || !chosenCrop || isSaving) return;

    const file = pendingFile;
    const crop = chosenCrop;
    closeCropper();
    saveState = "saving";
    errorMessage = "";

    const result = await usersApi.setPicture(userId, file, crop);
    if (result.status === "ok") {
      profilePictures.replace(userId, result.version);
      reportSaved(result.version);
      return;
    }

    reportFailure(
      result.status === "tooLarge"
        ? "Bildet var for stort for serveren. Prøv et mindre bilde."
        : result.status === "invalidFile"
          ? "Serveren kunne ikke lese bildet. Prøv et annet."
          : "Kunne ikke lagre bildet. Prøv igjen.",
    );
  }

  async function remove() {
    uploadButton?.focus();
    if (isSaving || !hasPicture) return;
    saveState = "saving";
    errorMessage = "";

    const response = await usersApi.removePicture(userId).catch(() => null);
    if (response?.ok) {
      profilePictures.forget(userId);
      reportSaved(null);
      return;
    }

    reportFailure("Kunne ikke fjerne bildet. Prøv igjen.");
  }
</script>

<section class="panel">
  <div class="panel-head">
    <h2 class="sbb-h3">Profilbilde</h2>
    <SaveIndicator state={saveState} />
  </div>
  <p class="hint">
    Bildet vises sammen med navnet i brukerlisten og øverst på siden.
  </p>

  <input
    bind:this={fileInput}
    type="file"
    accept="image/jpeg,image/png,image/webp"
    hidden
    onchange={(event) => chooseFile(event.currentTarget.files)}
  />

  <div class="picture-row">
    <UserAvatar {name} {userId} {pictureVersion} size={96} />

    <!-- Dropping a file works anywhere on the row, but the button is what the
         panel leads with: on a phone there is nothing to drag from. -->
    <div
      class="drop"
      class:drag={dragging}
      role="presentation"
      ondragover={(event) => {
        event.preventDefault();
        dragging = true;
      }}
      ondragleave={() => (dragging = false)}
      ondrop={(event) => {
        event.preventDefault();
        dragging = false;
        chooseFile(event.dataTransfer?.files ?? null);
      }}
    >
      <div class="actions">
        <Button
          bind:element={uploadButton}
          size="sm"
          disabled={isSaving}
          onclick={() => fileInput.click()}
        >
          <ImagePlus size={15} />
          {hasPicture ? "Bytt bilde" : "Last opp bilde"}
        </Button>
        {#if hasPicture}
          <Button
            variant="ghost"
            size="sm"
            disabled={isSaving}
            onclick={() => (isConfirmingRemoval = true)}
          >
            <Trash2 size={15} /> Fjern bilde
          </Button>
        {/if}
      </div>
      <!-- The limits are stated before anything is chosen, so a photo straight
           off a phone is not refused only after being picked. -->
      <p class="drop__hint">Dra et bilde hit, eller velg fil. {LIMITS_HINT}</p>
    </div>
  </div>

  {#if errorMessage}<p class="err">{errorMessage}</p>{/if}
</section>

<Modal
  title="Beskjær bildet"
  bind:open={isCropperOpen}
  size="sm"
  onclose={closeCropper}
>
  {#if pendingFile}
    <ProfilePictureCropper
      file={pendingFile}
      oncrop={(crop) => (chosenCrop = crop)}
      onmeasured={checkDimensions}
    />
  {/if}
  {#snippet footer()}
    <Button variant="ghost" onclick={closeCropper}>Avbryt</Button>
    <Button disabled={!chosenCrop} onclick={upload}>
      <Check size={16} /> Bruk bildet
    </Button>
  {/snippet}
</Modal>

<ConfirmDialog
  bind:open={isConfirmingRemoval}
  title="Fjerne profilbildet?"
  description="Bildet slettes, og initialene vises i stedet. Du kan laste opp et nytt når som helst."
  confirmTitle="Fjern bilde"
  onconfirm={remove}
/>

<style>
  /* Matches the panels on the pages that host this — see the user editor. */
  .panel {
    padding: 24px;
    background: var(--surface-card);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
  }
  .panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
  .panel h2 {
    margin: 0;
    font-size: 20px;
  }
  .hint {
    margin: 4px 0 20px;
    font-size: 13px;
    color: var(--text-muted);
    line-height: 1.5;
  }
  .picture-row {
    display: flex;
    align-items: center;
    gap: 20px;
    flex-wrap: wrap;
  }
  .drop {
    flex: 1 1 220px;
    min-width: 0;
    padding: 16px;
    border: 1px dashed var(--border-subtle);
    border-radius: var(--radius-md);
    transition:
      border-color var(--dur-fast),
      background var(--dur-fast);
  }
  .drop.drag {
    border-color: var(--accent);
    background: var(--surface-subtle);
  }
  .actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .drop__hint {
    margin: 12px 0 0;
    font-size: 12.5px;
    color: var(--text-muted);
  }
  .err {
    margin: 14px 0 0;
    font-size: 13px;
    color: var(--danger);
  }
</style>
