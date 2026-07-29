<script lang="ts">
  import { onMount } from "svelte";
  import { Check, Circle, X } from "@lucide/svelte";
  import { evaluatePassword, type PasswordRuleKey } from "$lib/password";
  import { passwordPolicy } from "$lib/stores/passwordPolicy.svelte";

  /**
   * Live requirements list for a password field: every rule the API asks for,
   * ticked off as the password satisfies it. Loads the shared policy itself so
   * no screen that shows a password field can forget to.
   *
   * `rejectedRules` marks the rows the API just refused — for the case where its
   * policy is stricter than the one this page loaded.
   */
  let {
    password,
    rejectedRules = [],
  }: {
    password: string;
    rejectedRules?: PasswordRuleKey[];
  } = $props();

  onMount(() => {
    passwordPolicy.load();
  });

  // Empty until the policy lands — and if the fetch failed it never does, so the
  // field simply stands on its own rather than showing rules we cannot vouch for.
  let rules = $derived.by(() => {
    const requirements = passwordPolicy.requirements;
    return requirements ? evaluatePassword(password, requirements) : [];
  });
</script>

{#if rules.length}
  <div class="checklist">
    <p class="checklist__title">Passordet må ha:</p>
    <ul>
      {#each rules as rule (rule.key)}
        {@const isRejected =
          !rule.isSatisfied && rejectedRules.includes(rule.key)}
        <li class:met={rule.isSatisfied} class:rejected={isRejected}>
          <span class="mark" aria-hidden="true">
            {#if rule.isSatisfied}
              <Check size={13} strokeWidth={2.6} />
            {:else if isRejected}
              <X size={13} strokeWidth={2.6} />
            {:else}
              <Circle size={9} strokeWidth={2.6} />
            {/if}
          </span>
          <span>{rule.label}</span>
          <!-- The tick is the only visual cue, so state is spelled out for
               anyone not seeing it. -->
          <span class="state">
            {rule.isSatisfied ? "— oppfylt" : "— ikke oppfylt"}
          </span>
        </li>
      {/each}
    </ul>
  </div>
{/if}

<style>
  .checklist {
    margin-top: 10px;
  }
  .checklist__title {
    margin: 0 0 7px;
    font-family: var(--font-text);
    font-size: 12px;
    color: var(--text-muted);
  }
  ul {
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: var(--font-text);
    font-size: 12.5px;
    line-height: 1.4;
    color: var(--text-muted);
    transition: color var(--dur-fast) var(--ease-out);
  }
  li.met {
    color: var(--success);
  }
  li.rejected {
    color: var(--danger);
  }
  /* Fixed box so labels stay aligned as the icon swaps between marks. */
  .mark {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 14px;
    height: 14px;
  }
  .state {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
</style>
