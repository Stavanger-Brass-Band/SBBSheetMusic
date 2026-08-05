<script lang="ts">
  import { Label, Input, Helper } from "flowbite-svelte";
  import type { UserForm } from "$lib/types";
  import type { PasswordRuleKey } from "$lib/password";
  import PasswordChecklist from "./PasswordChecklist.svelte";

  // `form` is mutated in place; the parent owns the reactive object. Status and
  // roles are managed on the user edit page (their own endpoints), not here.
  // `rejectedPasswordRules` comes from the parent because only it sees the
  // API's answer to a save.
  let {
    form,
    isEditing = false,
    rejectedPasswordRules = [],
  }: {
    form: Pick<UserForm, "name" | "email" | "password">;
    isEditing?: boolean;
    rejectedPasswordRules?: PasswordRuleKey[];
  } = $props();

  const onInput = (key: "name" | "email" | "password") => (e: Event) => {
    form[key] = (e.currentTarget as HTMLInputElement).value;
  };
</script>

<form class="space-y-4">
  <div>
    <Label for="userName" class="mb-2">Navn</Label>
    <Input
      id="userName"
      value={form.name}
      oninput={onInput("name")}
      placeholder="Skriv inn navn"
    />
  </div>
  <div>
    <Label for="userEmail" class="mb-2">E-post</Label>
    <Input
      id="userEmail"
      type="email"
      value={form.email}
      oninput={onInput("email")}
      placeholder="Skriv inn e-post"
    />
  </div>
  <div>
    <Label for="userPassword" class="mb-2">Passord</Label>
    <Input
      id="userPassword"
      type="password"
      value={form.password}
      oninput={onInput("password")}
      placeholder={isEditing
        ? "La stå tomt for å beholde"
        : "Skriv inn passord"}
    />
    {#if isEditing}
      <Helper class="mt-2"
        >La feltet stå tomt for å beholde nåværende passord.</Helper
      >
    {/if}
    <!-- When editing, the field means "keep the current password" until it is
         typed in, so the rules only appear once there is a new one to judge. -->
    {#if !isEditing || form.password}
      <PasswordChecklist
        password={form.password}
        rejectedRules={rejectedPasswordRules}
      />
    {/if}
  </div>
</form>
