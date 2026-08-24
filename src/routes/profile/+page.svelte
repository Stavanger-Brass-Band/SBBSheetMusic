<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { Check } from "@lucide/svelte";
  import { users as usersApi } from "$lib/api/users";
  import { auth } from "$lib/stores/auth.svelte";
  import {
    isPasswordAcceptable,
    readPasswordRejection,
    type PasswordRuleKey,
  } from "$lib/password";
  import { passwordPolicy } from "$lib/stores/passwordPolicy.svelte";
  import type { UpdateUserRequest, UserForm } from "$lib/types";
  import { formatDateTime } from "$lib/utils/date";
  import { profilePictureVersion } from "$lib/utils/profilePicture";
  import {
    Breadcrumb,
    Button,
    SAVED_VISIBLE_MS,
    LoadFailed,
  } from "$lib/components/ui";
  import UserModalBody from "$lib/components/UserModalBody.svelte";
  import ProfilePicturePanel from "$lib/components/ProfilePicturePanel.svelte";
  import LoadingSpinner from "$lib/components/LoadingSpinner.svelte";

  // Set once the profile has loaded — every save targets this id, since the
  // update endpoint (unlike the read) takes a real guid, not "me". The picture
  // endpoints are the same way round, which is why the panel below waits for it.
  let userId = $state("");
  /** The version of the picture now stored, or null while there is none. */
  let pictureVersion = $state<string | null>(null);
  /**
   * When this account last signed in, as the API reports it — read from
   * `/users/me` rather than worked out from the token, which only says when the
   * current session started. Null for an account that never has, which cannot
   * happen while reading your own profile but is what the field allows.
   */
  let lastLoginAt = $state<string | null>(null);

  let loading = $state(true);
  let loadFailed = $state(false);

  let form = $state<Pick<UserForm, "name" | "email" | "password">>({
    name: "",
    email: "",
    password: "",
  });
  let saving = $state(false);
  let error = $state("");
  let saved = $state(false);
  let savedTimer: ReturnType<typeof setTimeout> | undefined;
  let rejectedPasswordRules = $state<PasswordRuleKey[]>([]);

  // A blank password field keeps the current one, so the policy only has a say
  // once something has been typed into it — same rule as the admin editor.
  let canSave = $derived(
    !!form.name.trim() &&
      !!form.email.trim() &&
      (!form.password ||
        isPasswordAcceptable(form.password, passwordPolicy.requirements)),
  );

  async function loadProfile() {
    loading = true;
    loadFailed = false;
    passwordPolicy.load();
    const me = await usersApi.get("me").catch(() => null);
    if (me?.id) {
      userId = me.id;
      pictureVersion = profilePictureVersion(me);
      lastLoginAt = me.lastLoginAt ?? null;
      form = {
        name: me.name ?? "",
        email: me.email ?? "",
        password: "",
      };
    } else {
      loadFailed = true;
    }
    loading = false;
  }

  onMount(loadProfile);

  onDestroy(() => clearTimeout(savedTimer));

  async function save() {
    if (!canSave || !userId) return;
    saving = true;
    error = "";
    rejectedPasswordRules = [];
    const body: UpdateUserRequest = {
      name: form.name.trim(),
      email: form.email.trim(),
    };
    if (form.password) body.password = form.password;
    const response = await usersApi.update(userId, body);
    saving = false;
    if (response.ok) {
      form.password = "";
      saved = true;
      clearTimeout(savedTimer);
      savedTimer = setTimeout(() => (saved = false), SAVED_VISIBLE_MS);
      // The account menu caches name/email from `/users/me` at login — refresh
      // it so a changed name shows there right away, not after the next login.
      await auth.loadRoles();
      return;
    }

    const rejection = await readPasswordRejection(response);
    passwordPolicy.applyFromRejection(rejection?.requirements ?? null);
    rejectedPasswordRules = rejection?.failedRules ?? [];
    error = rejectedPasswordRules.length
      ? "Passordet oppfyller ikke kravene."
      : "Kunne ikke lagre endringene. Prøv igjen.";
  }
</script>

<Breadcrumb
  class="mb-6"
  items={[{ label: "Hjem", href: "/" }, { label: "Min profil" }]}
/>

{#if loading}
  <LoadingSpinner label="Laster profil…" />
{:else if loadFailed}
  <LoadFailed
    title="Kunne ikke laste profilen"
    description="Noe gikk galt da vi hentet profilen din."
    onretry={loadProfile}
  />
{:else}
  <h1 class="sbb-h1 title">Min profil</h1>

  <!-- The picture comes first: it is the part of a profile you recognise, and
       the fields below it are the ones you only ever change deliberately. -->
  <div class="panels">
    <ProfilePicturePanel
      {userId}
      name={form.name}
      {pictureVersion}
      onchange={(version) => (pictureVersion = version)}
    />

    <section class="panel">
      <UserModalBody {form} isEditing {rejectedPasswordRules} />
      {#if error}<p class="err">{error}</p>{/if}
      <!-- Read-only, and never part of the update body: it is the server's
           record of the account, not a field of the profile. -->
      <p class="last-login">
        Sist innlogget: <span class="last-login__value">
          {lastLoginAt ? formatDateTime(lastLoginAt) : "aldri"}
        </span>
      </p>
      <div class="panel-foot">
        {#if saved}
          <span class="saved"><Check size={15} /> Lagret</span>
        {/if}
        <Button loading={saving} disabled={!canSave} onclick={save}>
          Lagre endringer
        </Button>
      </div>
    </section>
  </div>
{/if}

<style>
  .title {
    margin: 0 0 28px;
    font-size: 40px;
  }
  /* Both panels share one column, so neither carries its own width. */
  .panels {
    display: flex;
    flex-direction: column;
    gap: 20px;
    max-width: 640px;
  }
  .panel {
    padding: 24px;
    background: var(--surface-card);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
  }
  .last-login {
    margin: 20px 0 0;
    font-size: 13px;
    color: var(--text-muted);
  }
  .last-login__value {
    color: var(--text-secondary);
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
  .err {
    margin: 14px 0 0;
    font-size: 13px;
    color: var(--danger);
  }

  @media (max-width: 720px) {
    .title {
      font-size: 30px;
    }
  }
</style>
