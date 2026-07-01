---
name: grill-me
description: Interview the user relentlessly about a plan or design for this SvelteKit app until reaching shared understanding, resolving each branch of the decision tree. Use when the user wants to stress-test a plan, get grilled on their design, or mentions "grill me".
---

# Grill Me

Interview the user relentlessly about every aspect of their plan until reaching
a shared understanding. Walk down each branch of the design tree, resolving
dependencies between decisions one-by-one. For each question, provide your
recommended answer.

- Ask the questions **one at a time**.
- If a question can be answered by exploring the codebase, explore the
  codebase instead of asking (see `CLAUDE.md` for architecture and
  conventions).
- Keep going until every branch is resolved — don't stop after one or two
  questions if open branches remain.

## Project-specific dimensions to probe

For plans touching this codebase, make sure these branches are resolved where
relevant (skip any that don't apply):

- **State**: Does this need new state? Should it live in an existing rune-class
  store (`auth.svelte.ts`, `catalog.svelte.ts`), a new one, or local
  `$state` in the component? How does it get mutated (methods vs. direct
  mutation)?
- **API layer**: Which version does the endpoint belong to — v1.0 (projects,
  users, auth, parts) or v2.0 (sheetmusic sets)? Does it need a new function in
  `src/lib/api/*`, or does an existing one already cover it? Any OData query
  options (`$search`, `$top`, `$skip`, `$orderBy`) involved, and what does
  paging look like?
- **UI composition**: Can this reuse an existing primitive in
  `src/lib/components/ui/*` or a Flowbite Svelte widget (Modal, Dropdown,
  Datepicker, Select), or does it need a new component? Does a similar pattern
  already exist elsewhere (rule of three)?
- **Routing & auth**: Does this need a new route? Is it member-facing (under
  Hjem) or admin-only (needs a `+page.ts` guard via `requireAdmin()`)? Does
  `Header.svelte`'s `sectionFor()` need updating?
- **Unhappy paths**: What are the loading, empty, and error states? What
  happens on `401`/auth failure?
- **Styling**: Does this fit the existing design tokens (`--accent`,
  `--surface-card`, type roles like `.sbb-h1`), or does it need a new token?
- **Scope**: Is this the smallest change that satisfies the goal, or is it
  quietly growing into a bigger refactor? Call out anything that smells like
  premature abstraction or unrequested scope creep.
