<script lang="ts">
  import { Label, Input, Helper, Toggle } from "flowbite-svelte";
  import { Plus, X } from "@lucide/svelte";
  import type { UserForm } from "$lib/types";

  // `form` is mutated in place; the parent owns the reactive object.
  // `isEditing` drives the password copy; `showStatusAndRoles` gates the
  // activate/roles controls (edit mode on a v2 backend only).
  let {
    form,
    isEditing = false,
    showStatusAndRoles = false,
  }: {
    form: UserForm;
    isEditing?: boolean;
    showStatusAndRoles?: boolean;
  } = $props();

  let roleInput = $state("");

  const onInput = (key: "name" | "email" | "password") => (e: Event) => {
    form[key] = (e.currentTarget as HTMLInputElement).value;
  };

  function addRole() {
    const value = roleInput.trim();
    if (!value) return;
    if (
      !form.roles.some((role) => role.toLowerCase() === value.toLowerCase())
    ) {
      form.roles = [...form.roles, value];
    }
    roleInput = "";
  }

  function removeRole(index: number) {
    form.roles = form.roles.filter((_, i) => i !== index);
  }

  function onRoleKeydown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault();
      addRole();
    }
  }
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
  </div>

  {#if showStatusAndRoles}
    <div class="toggle-field">
      <div class="tx">
        <Label for="userActive">Aktiv</Label>
        <p class="hint">
          Inaktive brukere beholdes, men kan ikke logge inn før de aktiveres
          igjen.
        </p>
      </div>
      <Toggle id="userActive" bind:checked={form.active} />
    </div>

    <div class="roles-editor">
      <Label for="userRole" class="mb-1">Roller</Label>
      <p class="hint">
        Styrer brukerens tilganger — f.eks. «Admin» for
        administratorrettigheter.
      </p>
      <div class="role-input">
        <div class="role-input-field">
          <Input
            id="userRole"
            bind:value={roleInput}
            onkeydown={onRoleKeydown}
            placeholder="Skriv en rolle og trykk Enter"
          />
        </div>
        <button
          type="button"
          class="role-add"
          onclick={addRole}
          aria-label="Legg til rolle"
        >
          <Plus size={15} /> Legg til
        </button>
      </div>

      {#if form.roles.length === 0}
        <p class="role-empty">Ingen roller tildelt.</p>
      {:else}
        <div class="role-chips">
          {#each form.roles as role, index (role)}
            <span class="ed-chip">
              {role}
              <button
                type="button"
                onclick={() => removeRole(index)}
                aria-label={`Fjern ${role}`}
              >
                <X size={13} />
              </button>
            </span>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</form>

<style>
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

  .roles-editor .hint {
    margin-bottom: 10px;
  }
  .role-input {
    display: flex;
    gap: 9px;
  }
  .role-input-field {
    flex: 1;
  }
  .role-add {
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
  .role-add:hover {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .role-empty {
    margin: 14px 0 0;
    font-size: 12.5px;
    font-style: italic;
    color: var(--text-muted);
  }
  .role-chips {
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
