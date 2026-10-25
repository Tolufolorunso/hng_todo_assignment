# AGENTS.md

Instructions for AI coding agents working in this project. This is the cross-tool
entry point: Codex, OpenCode, Cursor, GitHub Copilot, Gemini CLI, Aider, Zed,
Windsurf, and others read `AGENTS.md`. Claude Code reads `CLAUDE.md`, which imports
this file, so there is a single source of truth.

Do not add AI attribution to commits or pull requests, including AI
`Co-Authored-By` trailers or generated-by signatures. Preserve genuine human
attribution.

## What this is

A description of your project and the problem it solves.

> TODO: add a one-paragraph description of what this app does, who it is for, and
> the problem it solves.

## Stack

- Next.js 16 (App Router) with React 19 and TypeScript in strict mode
- Tailwind CSS v4, configured from CSS (`@import "tailwindcss"` plus `@theme` in
  `app/globals.css`); there is no `tailwind.config.*`
- ESLint 9 via `eslint-config-next`
- Package manager: npm (`package-lock.json`)

## Proportional engineering

Build for established requirements, not hypothetical scale, threats, or future
flexibility. Reuse existing code, the standard library, native platform features,
and installed dependencies before adding machinery.

- Unknown scale or extensibility defaults to the smaller reversible design. Do
  not infer enterprise, multi-tenant, hostile-user, or compliance requirements.
- Derive trust and data-integrity boundaries from actual reachability: untrusted
  input, auth/session/ownership, shared persisted data, destructive operations,
  payments, secrets, and sensitive data.
- Ask only when an unknown materially changes behavior, architecture, persisted
  data, interoperability, a real security boundary, or cost. Otherwise choose the
  simplest repository-native implementation.
- Add an abstraction, dependency, service, configuration surface, compatibility
  layer, or security mechanism only for a current requirement.
- Simplicity never removes real trust-boundary validation, data-loss prevention,
  accessibility, explicit security requirements, configured tests, or project rules.
- Stack-specific template standards apply only when the project uses that stack.

## Conventions

- TypeScript strict mode is on; avoid `any` and prefer precise types or `unknown`.
- Server Components by default. Add `'use client'` only for interactivity, hooks,
  or browser APIs.
- Keep components focused and extract reusable logic into custom hooks.
- Use the `@/*` path alias (maps to the project root) instead of long relative
  imports.
- Write code that explains itself; comment only what the code cannot say. No em
  dashes in generated content, comments, commit messages, or docs.

## Project structure

The repository is organized as an isolated monorepo:

- `apps/web`: Next.js web application and future API host (`app/`, `components/`, `lib/`, `types/`, `public/`).
- `apps/mobile`: Standalone React Native (Android and iOS) root.
- `apps/windows`: Standalone C# / .NET 10 LTS WPF root.
- `scripts/`: Monorepo orchestration scripts, including cross-application boundary checks.

Within `apps/web`:
- Routes and route-level UI: `apps/web/app/[segment]/page.tsx`
- Shared components: `apps/web/components/[feature]/ComponentName.tsx`
- Shared logic and data access: `apps/web/lib/[name].ts`
- Types: `apps/web/types/[feature].ts`

## Commands

All commands can be run directly from the repository root:

- Dev server: `npm run dev` (runs `apps/web` development server at http://localhost:3000)
- Build: `npm run build` (builds `apps/web` production bundle)
- Production server: `npm run start` (starts `apps/web` production server)
- Lint: `npm run lint` (runs ESLint on `apps/web`)
- Test: `npm run test` (runs Vitest test suite on `apps/web`)
- Boundary check: `npm run check:boundaries` (verifies zero cross-application imports)
- Verify: `npm run verify` (runs boundary check, lint, tests, and build)

Commands can also be executed directly within `apps/web` with local `npm run <command>`.

Testing is configured. `npm run test` runs the unit suite over the data layer and
logic. Logic-bearing changes must ship a passing test; UI and integration-only
changes ride on screenshot and build evidence.

CI is configured via GitHub Actions (`.github/workflows/ci.yml`), running boundary checks,
linting, unit tests, and production build on pull requests and pushes to `main`.
