# Feature: Isolated monorepo layout

**From build-plan:** feature 29
**Build attempt:** 1
**Branch:** feature/isolated-monorepo-layout
**Status:** verified

## Goal

Transition the codebase into an isolated monorepo layout by moving the existing Next.js web application into `apps/web`, establishing independent roots for `apps/mobile` and `apps/windows`, preserving complete web functionality and root developer ergonomics, and enforcing cross-import and dependency boundaries in local scripts and CI.

## In scope

- Web application migration:
  - Move the existing Next.js application (including `app/`, `components/`, `lib/`, `types/`, `public/`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `vitest.config.ts`, `vitest.setup.ts`, `tsconfig.json`, `next-env.d.ts`, `package.json`, and `package-lock.json`) into `apps/web/`.
  - Ensure all path aliases (`@/*` pointing to `apps/web/*`) and imports within `apps/web` remain strictly self-contained.
  - Verify standalone operations inside `apps/web/`: `npm run dev`, `npm run build`, `npm run test`, and `npm run lint`.
- Independent platform roots:
  - Create `apps/mobile/` root for React Native (Android and iOS) with isolated README and boundary rules.
  - Create `apps/windows/` root for C# / .NET 10 LTS WPF with isolated README and boundary rules.
  - Ensure each platform root owns its future dependency declarations with zero cross-app runtime coupling.
- Root orchestration and developer ergonomics:
  - Create root `package.json` providing delegating scripts (`dev`, `build`, `start`, `lint`, `test`, `verify`, and `check:boundaries`) invoking `apps/web` without supplying runtime libraries or hoisting dependencies.
  - Add root boundary validation script `scripts/check-boundaries.mjs` verifying that no application imports source code from any sibling application.
  - Configure root `vercel.json` with `"rootDirectory": "apps/web"` and preserved HTTP security headers.
- Continuous Integration and documentation:
  - Create GitHub Actions workflow `.github/workflows/ci.yml` running cross-import boundary checks, type checking, linting, tests, and web build.
  - Update `AGENTS.md` and `CLAUDE.md` to document the new `apps/web` project structure and root commands.
  - Full verification: `npm run test`, `npm run lint`, `npm run build`, and `npm run check:boundaries`.

## Out of scope

- Implementing mobile application code or screens (scheduled for Milestone L / Feature 37).
- Implementing Windows WPF application code or views (scheduled for Milestone M / Feature 40).
- Implementing backend Route Handlers `/api/v1` or PostgreSQL migrations (scheduled for Milestone J / Feature 30).
- Monorepo tooling frameworks such as Turborepo, Nx, or Lerna (unnecessary machinery; standard npm scripts satisfy established requirements).

## Build loop

- `workflow.stepReview` is `feature`: implement and verify each step, then present one feature-level review packet.
- `workflow.checkpointCommits` is `disabled` in `blueprint/config.json`.
- `/complete` creates the single work commit and merges to `main`.

## Build steps

- [x] 1. Move Next.js web application into `apps/web` and verify standalone web operations.
  - Move web directories (`app`, `components`, `lib`, `types`, `public`) and configuration files into `apps/web/`.
  - Maintain `@/*` alias mapped to `apps/web/*` in `apps/web/tsconfig.json`.
  - Done when: running `npm run test`, `npm run lint`, and `npm run build` directly inside `apps/web` passes with zero errors.

- [x] 2. Establish independent `apps/mobile` and `apps/windows` roots with boundary contracts.
  - Create `apps/mobile/` with isolation README explaining React Native Expo architecture and dependency isolation.
  - Create `apps/windows/` with isolation README explaining C# / .NET 10 LTS WPF architecture and NuGet isolation.
  - Done when: directory roots exist with clear architecture guidelines and isolation contracts.

- [x] 3. Root orchestration, cross-import boundary validator, and Vercel monorepo configuration.
  - Create root `package.json` delegating `dev`, `build`, `start`, `lint`, `test`, `verify`, and `check:boundaries` to `apps/web`.
  - Implement `scripts/check-boundaries.mjs` ensuring zero cross-application imports between `apps/web`, `apps/mobile`, and `apps/windows`.
  - Update root `vercel.json` or `apps/web/vercel.json` for proper Vercel deployment with `rootDirectory: "apps/web"`.
  - Done when: running `npm run check:boundaries` and root delegating scripts succeed cleanly.

- [x] 4. GitHub Actions CI workflow, documentation update, and full repository verification.
  - Create `.github/workflows/ci.yml` running boundary checks, web lint, web tests, and web build on PR and main push.
  - Update `AGENTS.md` and `CLAUDE.md` to reflect the monorepo layout and root commands.
  - Done when: root `npm run test`, `npm run lint`, `npm run build`, and `npm run check:boundaries` pass cleanly.

## Files / areas

- `apps/web/`: self-contained Next.js web application and future API host.
- `apps/mobile/`: independent mobile application root.
- `apps/windows/`: independent Windows WPF application root.
- `scripts/check-boundaries.mjs`: cross-application import boundary validator.
- `package.json`: root orchestration manifest.
- `vercel.json`: Vercel monorepo deployment configuration.
- `.github/workflows/ci.yml`: GitHub Actions verification workflow.
- `AGENTS.md`: updated repository structure and command guide.
- `CLAUDE.md`: updated commands reference.

## Data / contracts

- Root commands:
  - `npm run dev`: starts web development server via `npm --prefix apps/web run dev`.
  - `npm run build`: builds web production bundle via `npm --prefix apps/web run build`.
  - `npm run start`: starts web production server via `npm --prefix apps/web run start`.
  - `npm run lint`: runs ESLint on web via `npm --prefix apps/web run lint`.
  - `npm run test`: runs Vitest suite on web via `npm --prefix apps/web run test`.
  - `npm run verify`: runs boundary check, lint, tests, and build.
  - `npm run check:boundaries`: scans `apps/*` to assert that no file imports from sibling `apps/*` directories.

## Testing

- Unit tests: existing 280 tests run and pass in their new `apps/web` location.
- Boundary test: `node scripts/check-boundaries.mjs` verifies zero illegal cross-application imports.
- Full verification: `npm run test`, `npm run lint`, `npm run build`, and `npm run check:boundaries`.

## Notes for the AI

- Writing style: strictly zero em dashes (—), en dashes (–), or ellipsis characters.
- Zero dependency hoisting: do not install web dependencies at repository root; keep them in `apps/web/node_modules`.
- Root ergonomics: ensure root commands seamlessly forward arguments and exit codes from `apps/web`.
- Git preservation: use `git mv` where possible to preserve commit history for moved files.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":6869,"specSha256":"4277257e261cad17abd0463b6488c7f4d6d78b64e11ba9b07a3edad62560f67d","branch":"refs/heads/feature/isolated-monorepo-layout","head":"e5af77b24bbe729a73ae28f0be3194e5101a6de2","baseRef":"refs/heads/main","baseCommit":"e5af77b24bbe729a73ae28f0be3194e5101a6de2","sourceTree":"ba33b9712e82c59f72287a9f95d5a2f860cfddd1","absentOptional":[]} -->
