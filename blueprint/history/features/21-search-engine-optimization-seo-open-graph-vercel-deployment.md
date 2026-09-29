# Feature: Search engine optimization (SEO), Open Graph & Vercel deployment

**From build-plan:** feature 21
**Build attempt:** 1
**Branch:** feature/search-engine-optimization-seo-open-graph-vercel-deployment
**Status:** verified

## Goal

Provide comprehensive search engine optimization (SEO), social preview cards (Open Graph and Twitter), Schema.org JSON-LD structured data, dynamic crawler directives (`sitemap.xml` and `robots.txt`), page-level metadata across all routes, and a production-ready `vercel.json` deployment configuration with security headers and caching policies.

## In scope

- Dynamic sitemap route at `app/sitemap.ts` listing all primary routes (`/`, `/notes`, `/calendar`, `/analytics`) with change frequencies and priorities.
- Dynamic robots configuration at `app/robots.ts` permitting indexing and referencing the sitemap.
- Unit tests in `lib/seo.test.ts` verifying `sitemap` and `robots` return correct endpoints and crawler directives.
- Comprehensive root metadata in `app/layout.tsx` including `metadataBase`, title template (`%s | TaskFlow`), rich description, keywords, author, creator, Open Graph (`openGraph`), Twitter card (`twitter`), and crawler directives (`robots`).
- JSON-LD structured data component `components/app/JsonLd.tsx` injecting `WebApplication` schema.
- Distinctive page-level metadata for `app/page.tsx`, `app/notes/page.tsx`, `app/calendar/page.tsx`, `app/analytics/page.tsx`, and `app/notes/[id]/page.tsx` (`generateMetadata`).
- Production `vercel.json` configuring HTTP security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) and immutable caching headers for static assets.

## Out of scope

- Third-party analytics or tracking scripts (Google Analytics, Mixpanel, telemetry) preserving TaskFlow's 100% private, offline guarantee.
- Server-side indexing of user-created notes or tasks from IndexedDB (all user data remains private to the browser).
- Paid search ads, tracking pixels, or monetization tags.

## Build loop

- Step review: `feature` (continue through passing steps).
- Checkpoint commits: `disabled` (as configured in `blueprint/config.json`).
- Final completion: `/complete` creates the final work commit and archives the spec.

## Build steps

- [x] 1. **Dynamic sitemap and robots routes with unit tests** - implement `app/sitemap.ts` and `app/robots.ts` using Next.js `MetadataRoute`, and add unit test suite in `lib/seo.test.ts`. Done when tests pass with `npm run test`.
- [x] 2. **Root metadata, Open Graph cards, and JSON-LD structured data** - expand `app/layout.tsx` metadata with metadataBase, title template, description, keywords, author, openGraph, twitter, and robots directives, and create `components/app/JsonLd.tsx` rendering Schema.org `WebApplication` data. Done when layout passes TypeScript and lint checks.
- [x] 3. **Page-level metadata and canonical links** - add dedicated `metadata` exports to `app/page.tsx`, `app/notes/page.tsx`, `app/calendar/page.tsx`, `app/analytics/page.tsx`, and `generateMetadata` to `app/notes/[id]/page.tsx`. Done when each route provides distinctive title, description, and canonical URLs.
- [x] 4. **Vercel deployment configuration** - create `vercel.json` with security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) and cache-control rules for static assets and manifests. Done when `vercel.json` is syntactically valid JSON and passes Next.js build.
- [x] 5. **Verification and quality gates** - run `npm run test`, `npm run lint`, and `npm run build` to confirm zero lint errors, zero type errors, all unit tests passing, and a clean Next.js build generating static sitemap and robots routes. Done when all commands exit code 0.

## Files / areas

- `app/sitemap.ts` - dynamic sitemap generation.
- `app/robots.ts` - crawler directives and sitemap reference.
- `lib/seo.test.ts` - unit tests for sitemap and robots routes.
- `app/layout.tsx` - enhanced root metadata, Open Graph, and Twitter tags.
- `components/app/JsonLd.tsx` - Schema.org WebApplication structured data component.
- `app/page.tsx` - tasks workspace metadata.
- `app/notes/page.tsx` - notes workspace metadata.
- `app/notes/[id]/page.tsx` - dynamic note reader metadata.
- `app/calendar/page.tsx` - calendar workspace metadata.
- `app/analytics/page.tsx` - analytics workspace metadata.
- `vercel.json` - security headers and asset caching headers.

## Data / contracts

- Schema.org WebApplication JSON-LD format:
  ```json
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "TaskFlow",
    "url": "https://taskflow-assignment.vercel.app",
    "applicationCategory": "ProductivityApplication",
    "operatingSystem": "Any",
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
    "browserRequirements": "Requires JavaScript. Requires HTML5."
  }
  ```
- Sitemap routes contract:
  - `/` - daily, priority 1.0
  - `/notes` - daily, priority 0.8
  - `/calendar` - daily, priority 0.8
  - `/analytics` - weekly, priority 0.7

## Testing

- Unit tests in `lib/seo.test.ts`:
  - `sitemap()` returns valid URL list with all primary routes, correct priority values, and ISO timestamps.
  - `robots()` permits crawling all routes (`allow: "/"`) and includes the sitemap reference.
- Automated gate:
  - `npm run test` (Vitest)
  - `npm run lint` (ESLint)
  - `npm run build` (Next.js Turbopack build verifying `/sitemap.xml` and `/robots.txt` generation)

## Notes for the AI

- Maintain zero em dashes across all code, comments, and strings.
- Ensure `metadataBase` resolves safely even in local development (falling back to `http://localhost:3000` or production domain `https://taskflow-assignment.vercel.app`).
- Keep all crawler rules standard to avoid Next.js App Router build-time type mismatches with `MetadataRoute.Sitemap` and `MetadataRoute.Robots`.


<!-- blueprint:completion {"schemaVersion":1,"specBytes":5911,"specSha256":"06c677843df5c9fabb4addaa721bfb26f0c98e5286245b323cad698a298479c8","branch":"refs/heads/feature/search-engine-optimization-seo-open-graph-vercel-deployment","head":"23652d4986cf5589751b190b98dad0ed534404ca","baseRef":"refs/heads/main","baseCommit":"23652d4986cf5589751b190b98dad0ed534404ca","sourceTree":"aed89adff7d99c16c4678ccc341aacd399158f81","absentOptional":[]} -->
