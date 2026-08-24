<script lang="ts">
  import { Modal } from "flowbite-svelte";
  import { goto } from "$app/navigation";
  import { Pencil } from "@lucide/svelte";
  import { auth } from "$lib/stores/auth.svelte";
  import type { InstrumentGroup, Musician } from "$lib/types";
  import { profilePictureVersion } from "$lib/utils/profilePicture";
  import { Button, UserAvatar } from "$lib/components/ui";

  /**
   * A member of the Korpset roster read in full: their portrait, every stemme
   * they are assigned and every role they hold.
   *
   * The card can only carry the one stemme that seats it in its section, so this
   * is where a member playing several is shown as playing several. It says
   * nothing the roster endpoint doesn't serve — there is deliberately no e-mail
   * or account state in that contract, so the dialog has no contact row.
   *
   * `member` outlives the closing of the dialog: it fades out, and blanking the
   * content the moment it starts would empty the sheet while it is still on
   * screen.
   */
  let {
    open = $bindable(false),
    member,
  }: {
    open?: boolean;
    member: { musician: Musician; group: InstrumentGroup } | null;
  } = $props();

  /**
   * The way from a member as the roster shows them to the same member as their
   * account. Gated on the very flag `requireAdmin` guards `/user/edit/[id]` with,
   * so the shortcut is offered exactly when it will be let through — the same
   * bargain the project and set views make with their own editors.
   *
   * It needs an id to lead anywhere, which `ApiMusician` types as optional even
   * though the endpoint always sends one.
   */
  let editHref = $derived(
    auth.isAdmin && member?.musician.id
      ? `/user/edit/${member.musician.id}`
      : null,
  );

  function editUser(href: string) {
    // Closed first so the sheet is on its way out as the navigation starts,
    // rather than sitting over the page it is leaving.
    open = false;
    void goto(href);
  }
</script>

{#snippet pills(labels: string[], variant: "part" | "role")}
  <div class="pills">
    {#each labels as label}
      <span class="pill" class:role={variant === "role"}>{label}</span>
    {/each}
  </div>
{/snippet}

{#if member}
  {@const musician = member.musician}
  {@const parts = (musician.parts ?? [])
    .map((part) => part.name)
    .filter((name): name is string => !!name)}
  {@const roles = musician.roles ?? []}

  <Modal
    bind:open
    size="none"
    class="max-w-[400px]"
    classes={{ header: "p-0 md:p-0 justify-start", body: "p-0 md:p-0" }}
  >
    {#snippet header()}
      <div class="head">
        <span class="disc">
          <UserAvatar
            fill
            muted
            name={musician.name}
            userId={musician.id ?? null}
            pictureVersion={profilePictureVersion(musician)}
          />
        </span>
        <div class="identity">
          <h3>{musician.name}</h3>
          <p>{member.group}</p>
        </div>
      </div>
    {/snippet}

    <div class="body">
      <div class="row">
        <h4>Stemmer</h4>
        {@render pills(parts, "part")}
      </div>
      {#if roles.length}
        <div class="row">
          <h4>Roller</h4>
          {@render pills(roles, "role")}
        </div>
      {/if}
    </div>

    {#if editHref}
      <!-- Outside `.body` so the rule above it spans the sheet, the way the
           confirm dialog's action row does. -->
      <div class="actions">
        <Button
          size="sm"
          variant="secondary"
          onclick={() => editUser(editHref)}
        >
          <Pencil size={15} /> Rediger bruker
        </Button>
      </div>
    {/if}
  </Modal>
{/if}

<style>
  /* Even padding, no reservation for the close button: it sits absolutely in
     the top-right corner, well above where a vertically-centred name — next
     to an 84px avatar — ever reaches, so it never needs to make room for it. */
  .head {
    display: flex;
    align-items: center;
    gap: 18px;
    padding: 26px 24px 22px 24px;
  }
  /* A neutral ring, not the card's borderless disc: the card's portrait well
     is black, darker than the disc's own gradient, so the disc reads against
     it unringed. The dialog sits on `--surface-card`, brighter than the
     card's well and close enough to the disc's own tones that the edge
     between them washed out without one. `--border-strong` rather than
     brass — a ring is for separation here, not another accent. */
  .disc {
    position: relative;
    width: 84px;
    height: 84px;
    flex-shrink: 0;
    font-size: 30px;
    border-radius: var(--radius-full);
    overflow: hidden;
    background: var(--surface-sunken);
    box-shadow: 0 0 0 1px var(--border-strong);
  }
  .identity {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .identity h3 {
    margin: 0;
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 23px;
    line-height: 1.15;
    letter-spacing: -0.02em;
    color: var(--text-primary);
  }
  .identity p {
    margin: 0;
    font-family: var(--font-display);
    font-size: 11px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: var(--text-muted);
  }

  .body {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 22px 24px 26px;
  }
  .row {
    display: flex;
    flex-direction: column;
    gap: 9px;
  }
  .row h4 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 10.5px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: var(--text-muted);
  }
  .pills {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
  }
  .pill {
    display: inline-flex;
    align-items: center;
    height: 26px;
    padding: 0 11px;
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-full);
    font-family: var(--font-mono);
    font-size: 11.5px;
    font-weight: 600;
    color: var(--text-secondary);
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    padding: 14px 24px 18px;
    border-top: 1px solid var(--border-subtle);
  }

  .pill.role {
    border-color: var(--brass-700);
    background: var(--accent-soft);
    color: var(--brass-300);
    font-family: var(--font-display);
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
</style>
