# CLAUDE.md

Guidance for working in this repo. Read this before making changes.

## What this is

**Notearkiv** — Stavanger Brass Band's members' sheet-music archive. A
**SvelteKit static SPA** (Svelte 5 runes, TypeScript) that talks to an external
.NET "Sheetmusic API". UI text is **Norwegian (Bokmål)**. See `README.md` for
architecture and deployment.

## Commands

| Command           | What                                             |
| ----------------- | ------------------------------------------------ |
| `npm run dev`     | Vite dev server on **port 5100**                 |
| `npm run build`   | Static build to `build/`                         |
| `npm run check`   | `svelte-kit sync` + `svelte-check` (types)       |
| `npm run lint`    | `prettier --check` + `eslint`                    |
| `npm run format`  | `prettier --write`                               |
| `npm run api:gen` | Regenerate API types from the live OpenAPI specs |

**Always run `npm run check` and `npm run lint` before considering work done.**
Both must be clean (0 errors). Run `npm run format` to fix Prettier issues.
Use the **PowerShell** tool for commands (Windows); the Bash tool prints a
harmless `ng completion` warning.

## Code quality

Write clean, readable, maintainable code. These apply everywhere:

- **DRY — reuse what exists.** Before writing logic, check for an existing
  helper/component and use it: API calls go through `src/lib/api/*` (never raw
  `fetch` in components), dates through `src/lib/utils/date.ts`, PDF downloads
  through `src/lib/utils/download.ts`, shared UI through
  `src/lib/components/ui/*`. If you copy-paste a block, extract it instead.
- **Rule of three / avoid premature abstraction.** Don't build a generic
  abstraction for a single caller. Extract a helper/component once a pattern
  genuinely repeats (≈3×). Keep it simple (KISS) and don't add config/options
  nothing uses (YAGNI).
- **Small, focused units.** One component/function does one thing. If a
  component grows past a few responsibilities or a function past a screenful,
  split it. Prefer pure functions; isolate side effects (API, navigation).
- **Write human-readable code — spell names out in full.** Code is read far
  more often than it's written, so always favour clarity over brevity. Don't
  shorten or abbreviate identifiers: prefer `index` over `idx`, `button` over
  `btn`, `count` over `cnt`, `selectedIds` over `selIds`, `loadingMore` over
  `ldMore`. Names should be descriptive and intention-revealing, in the
  codebase's language (Norwegian UI strings, English code identifiers). The
  only short forms to use are ones genuinely universal (`id`, `url`, `api`) or
  an idiomatic loop index (`i`). This applies to variables, functions,
  parameters, types, and CSS classes alike — and avoid single-letter or cryptic
  names that force the reader to decode intent.
- **Types over `any`.** Lean on the generated API types and `src/lib/types`.
  Don't reach for `any`/`as` to silence the checker — model the data correctly.
- **Handle the unhappy paths.** Cover loading, empty, and error states for
  anything async (see existing pages for the pattern). Don't leave a spinner
  that can hang forever.
- **Comments explain _why_, not _what_.** The code says what; a comment
  justifies a non-obvious choice, workaround, or constraint. Delete dead code
  and stale comments rather than commenting them out.
- **Match the surrounding code.** Mirror nearby files' structure, naming, and
  idioms so the codebase reads as one hand. Let Prettier/ESLint format — don't
  hand-format against them.

## Svelte 5 conventions (this is a runes codebase)

- Use **runes**: `$state`, `$derived`, `$props`, `$effect`. No legacy
  `export let` / `$:` reactive statements.
- Use **event attributes** (`onclick`, `oninput`, `onsubmit`) — not the legacy
  `on:` directives, and no event modifiers (call `e.preventDefault()` yourself).
- Use **snippets** (`{#snippet}` / `{@render}`), not slots.
- `page` comes from **`$app/state`** (not `$app/stores`); navigate with `goto`
  from `$app/navigation`.
- Route params are typed `string | undefined`; assert with `!` for guaranteed
  params: `let id = $derived(page.params.id!)`.
- **Do not `bind:value` to nullable API fields** — Flowbite/typed inputs reject
  `null`. Use `value={x ?? ""}` + `oninput` and assign back (see
  `MusicSetModalBody.svelte`).
- Set-part `{#each}` lists are intentionally **unkeyed** — `musicPartId` is not
  unique across a set's parts and keying on it crashes (`each_key_duplicate`).
  `svelte/require-each-key` is disabled in `eslint.config.js` for this reason.

## State

Global state is **rune-class singletons** in `src/lib/stores/*.svelte.ts`:

- `auth` (`auth.svelte.ts`) — `auth.isAuthenticated`, `auth.isAdmin`,
  `login()/checkAdmin()/logout()`. Seeded from `localStorage`. Read it directly
  in components (no `$` prefix).
- `catalog` (`catalog.svelte.ts`) — cached music sets / active projects. **Mutate
  via its methods** (`setMusicSets`, `addMusicSet`, …), never by mutating arrays
  in components.

## API layer (`src/lib/api/`)

- **Never edit `schema.v1.d.ts` / `schema.v2.d.ts`** — they're generated by
  `npm run api:gen` (`openapi-typescript` against the live specs). Regenerate
  when the backend changes and commit the result.
- **Both versions generate from the test environment's OpenAPI documents**
  (`/openapi/1.0.json`, `/openapi/2.0.json`), browsable as Scalar docs at
  `/scalar`. These replaced the old Swashbuckle `/swagger/{version}/swagger.json`
  routes, which no longer exist. Generating from test means the schemas can run
  ahead of prod — they're expected to ship alongside the API release.
- The documents declare every `int32` as `["integer","string"]`, so
  `openapi-typescript` widens numeric fields to `number | string`. The affected
  fields the app does arithmetic on are pinned back to `number` in
  `src/lib/types/index.ts` — see the note there.
- `client.ts` is a thin typed fetch wrapper: it injects the `Authorization`
  bearer header and the required **`?api-version`** query param, and calls
  `auth.logout()` on `401`. Create a client per version with
  `createClient("2.0" | "1.0")`.
- **Version split:** sheetmusic-set and user endpoints → **v2.0**; projects,
  auth, parts, categories → **v1.0**.
- App-facing types live in `src/lib/types/` as aliases over the generated
  `components["schemas"]`, plus a few hand-authored types where the spec leaves
  responses undefined (`User`).
- **OData query options** — flat query-string params on every collection
  endpoint (sets, projects, parts, categories): `$search` (free text), `$filter`
  (e.g. `archiveNumber gt 100`), `$orderby` (comma separated `field [asc|desc]`,
  e.g. `composer asc,title desc`), `$top`, `$skip`, `$expand` (related
  collections, e.g. `parts`). The sets endpoint also takes a plain `category`
  param matching on category name. Responses are bare arrays (no total-count
  envelope) → offset paging with "load more".
- **`$expand` is not optional for related collections** — they're omitted from
  collection responses unless asked for. `GET /parts` needs `$expand=aliases`
  or every part comes back with its aliases missing. Check the Scalar docs for
  which expansions an endpoint supports before assuming a field is broken.

## Styling & design system

The look is the **SBB "Tuxedo"** system: black-first, monochrome, one brass
accent (`#EA5B0C`).

- **Tokens** are CSS custom properties in `src/app.css` (`--accent`,
  `--surface-card`, `--text-secondary`, `--radius-lg`, `--shadow-paper`, the
  `--brass-*` / `--ink-*` scales, motion vars). Style with these, not hardcoded
  colors.
- Type roles: classes `.sbb-h1`, `.sbb-h2`, `.sbb-h3`, `.sbb-overline`,
  `.sbb-mono` (mono = JetBrains Mono for dates/catalog numbers/counts).
- **Build UI from the bespoke primitives** in `src/lib/components/ui/`
  (`Button`, `Input`, `Badge`, `Avatar`, `Breadcrumb`, `Spinner`, `SetCard`,
  `PartTile`). The signature object is `SetCard` (white stacked-sheet card).
- Use **Tailwind utilities** for layout/spacing; component-specific visuals go in
  scoped `<style>` referencing the tokens.
- **Prefer Flowbite Svelte for overlay & complex form widgets** — Modal,
  Dropdown, Datepicker, Select — rather than hand-rolling native equivalents
  (e.g. use Flowbite `Datepicker`, **not** `<input type="date">`; Flowbite
  `Select`, not a bespoke combobox). It's re-skinned to the tuxedo palette via
  the `@theme` bridge in `app.css` (`primary`→brass, `gray`→ink). The
  `ProjectModalBody` (name + Flowbite Datepickers) is the shared project
  create/edit form — reuse it. Still reach for the bespoke `ui/` primitives for
  the basics (Button, Input, Badge, …) where they exist.
- Icons: **`@lucide/svelte`** (PascalCase imports, e.g. `import { Download } from
"@lucide/svelte"`). Do not reintroduce FontAwesome or Bootstrap.
- Dates: `src/lib/utils/date.ts` (native `Intl` with `nb-NO`). **No moment.js.**

## Routing & auth

- SPA only: `+layout.ts` sets `ssr = false; prerender = false; csr = true`.
- The root `+layout.svelte` is the auth gate (redirects to `/login` when not
  authenticated). Admin-only pages add a `+page.ts` calling `requireAdmin()`
  (`src/lib/guards.ts`).
- Member hierarchy lives **under Hjem**: `/`, `/project/[id]`,
  `/project/[projectId]/set/[id]`. Editors are admin: `/set/edit/[id]` (under
  Arkivliste), `/project/edit/[id]` (under Prosjekter), `/user/edit/[id]` (under
  Brukere), `/part/edit/[id]` (under Stemmekatalog). The Header's `sectionFor()`
  maps paths to the active nav section accordingly — add new editor routes there
  or the nav loses its active section.
- **Create in a modal, edit on a page.** List pages (`/users`, `/parts`) keep a
  create-only Flowbite `Modal`; clicking a row navigates to the editor page. The
  `*ModalBody` component is shared by both, so it holds only the fields of the
  create/update request body. Sub-resources with their own endpoints (user roles
  and status, part aliases) belong on the editor page as their own panel, applied
  **immediately** with a per-panel error message — not diffed and flushed on
  save, which hides partial failures.

## Deploy gotchas

- Build output is `build/` (not `public/`). `PUBLIC_API_BASE_URL` is inlined at
  **build time** (`$env/static/public`); CI injects it per environment.
- The App Service startup command **must** be `pm2 serve … --spa` or deep-link
  refreshes 404 (path-based routing). See `README.md`.

## Commits & releases

- PRs are **squash-merged**, so the PR title becomes the commit message on
  `master` — it **must** follow
  [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`,
  `fix:`, `chore:`, `ci:`, `docs:`, `style:`, `refactor:`, `perf:`, `test:`,
  `build:`, `revert:`). This is enforced by a PR-title-lint workflow.
- [release-please](https://github.com/googleapis/release-please) reads those
  commits on every push to `master` and keeps a `chore(main): release X.Y.Z`
  PR up to date with the version bump and `CHANGELOG.md` entries. Merging that
  PR tags the release and publishes it on GitHub.
- Release type is `simple` (`release-please-config.json` +
  `.release-please-manifest.json`) — the version lives in the manifest, not in
  `package.json`'s `version` field.

## Don't

- Commit/push unless asked. Don't edit generated schema files. Don't add
  Bootstrap/FontAwesome/moment. Don't bypass the design tokens with ad-hoc hex
  colors. Don't use `$app/stores` or legacy Svelte 4 syntax.
