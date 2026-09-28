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

- Routes and route-level UI: `app/[segment]/page.tsx`
- Shared components: `components/[feature]/ComponentName.tsx`
- Server actions and shared logic: `lib/[name].ts`
- Types: `types/[feature].ts`

Marked items become real as they appear; leave a short `> TODO` rather than
inventing a convention that does not exist yet.

## Commands

- Dev server: `npm run dev` (http://localhost:3000)
- Build: `npm run build`
- Production server: `npm run start`
- Lint: `npm run lint` (ESLint)
- Test: `npm run test` (Vitest)

Testing is configured. `npm run test` runs the unit suite over the data layer and
logic. Logic-bearing changes must ship a passing test; UI and integration-only
changes ride on screenshot and build evidence.

Type checking: `tsc --noEmit` is available through the installed TypeScript, but
there is no dedicated `typecheck` script yet.

There is no combined `Verify` command and no CI configuration in this repository
yet.
