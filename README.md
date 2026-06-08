# SBB Sheet Music

Member site for Stavanger Brass Band's sheet-music archive. A SvelteKit
single-page app (static SPA) talking to the Sheetmusic API.

## Tech stack

- **SvelteKit** (Svelte 5 / runes) built with **Vite**, output as a static SPA
  via `@sveltejs/adapter-static` (`fallback: index.html`, `ssr = false`).
- **TypeScript** throughout. API types are generated from the backend's OpenAPI
  specs with `openapi-typescript` (see `npm run api:gen`).
- **Tailwind CSS + Flowbite Svelte** for interactive UI (modals, dropdowns,
  navbar, datepicker). The legacy Bootstrap (superhero) theme is still loaded
  from `static/global.css` for visual continuity pending a full restyle.

## Get started

Install dependencies...

```bash
npm install
```

...then start the dev server:

```bash
npm run dev
```

Navigate to [localhost:5100](http://localhost:5100).

### Scripts

| Script            | Description                                        |
| ----------------- | -------------------------------------------------- |
| `npm run dev`     | Vite dev server on port 5100                       |
| `npm run build`   | Production build to `build/`                       |
| `npm run preview` | Serve the production build locally                 |
| `npm run check`   | `svelte-kit sync` + `svelte-check` (type checking) |
| `npm run lint`    | Prettier + ESLint                                  |
| `npm run format`  | Prettier write                                     |
| `npm run api:gen` | Regenerate API types from the live OpenAPI specs   |

### Configuration

The API base URL is read at build time from the `PUBLIC_API_BASE_URL`
environment variable (`$env/static/public`). Locally it lives in `.env`
(see `.env.example`); in CI it is injected per environment by
`azure-pipelines.yml`.

### API versions

The backend selects its version via a required `?api-version=` query
parameter, injected automatically by the API client: **`2.0`** for the
sheetmusic-set endpoints (OData-capable), **`1.0`** for projects, users, auth
and parts. Types are generated from both specs into `src/lib/api/schema.v1.d.ts`
and `schema.v2.d.ts`.

## Deploying to the web

Committing to `master` triggers a build in Azure Pipelines with automatic deploy
to the Azure App Service test environment. Approval is required for deploy to
production; approvers are notified via email.

[![Build Status](https://dev.azure.com/luffe/Sheet%20Music%20Archive%20V4/_apis/build/status/Sheet%20Music%20App?repoName=Stavanger-Brass-Band%2FSBBSheetMusic&branchName=master)](https://dev.azure.com/luffe/Sheet%20Music%20Archive%20V4/_build/latest?definitionId=4&repoName=Stavanger-Brass-Band%2FSBBSheetMusic&branchName=master)

The pipeline builds with `npm ci && npm run build` and packages the `build/`
directory.

### Infrastructure

#### Sheetmusic [resource group]

| Name                | Type                   | URL                                            | Comment                                                |
| ------------------- | ---------------------- | ---------------------------------------------- | ------------------------------------------------------ |
| sheetmusic-app-test | Azure App Service      | https://sheetmusic-app-test.azurewebsites.net/ | Test environment, running against api test environment |
| sheetmusic-app      | Azure App Service      | https://noter.stavanger-brassband.no           | Production app                                         |
| sheetmusic-app-plan | Azure App Service Plan | N/A                                            | Linux. Running both envs to save $                     |

#### App Service startup command

The static SPA is served by PM2. **The `--spa` flag is required** so deep links
(e.g. refreshing on `/archive`) fall back to `index.html` instead of 404-ing —
the app now uses path-based routing, not the old hash routing.

Set Configuration → General settings → Startup command to:

```
pm2 serve /home/site/wwwroot --no-daemon --spa
```

> Note: with a static SPA the API URL is baked in at build time via
> `PUBLIC_API_BASE_URL`, so a runtime App Service application setting for the
> API URL is no longer used.
