# TaskFlow Production Operations Runbook

This document details production operations, health monitoring, release deployment, release rollback, database disaster recovery, and incident response procedures for the TaskFlow personal productivity suite across Web, Mobile, and Windows applications.

## 1. Health Monitoring and Diagnostics

TaskFlow provides standardized HTTP endpoints for operational health checks, readiness probes, and capability discovery.

### 1.1 Health Check (`GET /api/v1/health`)

- **Purpose**: Liveness and readiness probe for load balancers, container orchestrators, and uptime monitors.
- **Response Codes**:
  - `200 OK` with status `"ok"`: Web application and PostgreSQL database pool are healthy.
  - `200 OK` with status `"degraded"`: Web server is responsive but database connection failed or is unreachable. Local-first client operations continue uninterrupted.
- **Sample Payload**:
  ```json
  {
    "status": "ok",
    "version": "1.0.0",
    "timestamp": "2026-05-01T12:00:00.000Z",
    "database": {
      "status": "connected"
    }
  }
  ```
- **Rate Limiting**: Health checks are rate-limited to 60 requests per minute per IP address. `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers are returned.

### 1.2 System Capabilities (`GET /api/v1/capabilities`)

- **Purpose**: Contract negotiation for Mobile and Windows clients during initial handshake.
- **Key Fields**:
  - `protocolVersion`: `1` (Sync protocol specification version).
  - `auth`: `["otp"]` (Passwordless one-time passcode authentication).
  - `entities`: `["tasks", "notes", "followups", "plans", "inbox"]`.
  - `limits`: Request body size, title lengths, and batch size limits.

### 1.3 OpenAPI Specification (`GET /api/v1/openapi.json`)

- **Purpose**: Machine-readable OpenAPI 3.1.0 specification documenting all REST route handlers, request/response schemas, security schemes, and status codes.

---

## 2. Production Release Procedures

TaskFlow employs an isolated monorepo architecture. Each client application is deployed through platform-native distribution channels.

### 2.1 Web Application (Next.js / Vercel)

1. **Pre-flight Verification**:
   ```bash
   npm run check:boundaries
   npm --prefix apps/web run lint
   npm --prefix apps/web test
   npm --prefix apps/web run build
   ```
2. **Environment Variables**:
   - `DATABASE_URL`: PostgreSQL connection string with TLS enabled (`sslmode=require`).
   - `AUTH_SECRET`: Cryptographically random 32-byte hexadecimal string.
   - `VAPID_PUBLIC_KEY`: Base64-encoded VAPID public key for Web Push.
   - `VAPID_PRIVATE_KEY`: Base64-encoded VAPID private key.
   - `VAPID_SUBJECT`: Contact email or URL for web push identification (mailto:ops@taskflow.dev).
   - `SYNC_RATE_LIMIT_MAX`: Optional maximum sync requests per minute (default 120).
3. **Database Migration Execution**:
   Run pending PostgreSQL migrations before switching production traffic:
   ```bash
   npm run db:migrate
   ```
4. **Deploy to Vercel**:
   Deploy production build using standard Vercel CLI or Git integration.

### 2.2 Mobile Application (Expo / React Native)

1. **Pre-flight Verification**:
   ```bash
   npm --prefix apps/mobile run lint
   npm --prefix apps/mobile test
   ```
2. **Google Play (Android)**:
   - Build Android App Bundle (AAB):
     ```bash
     cd apps/mobile && npx eas-cli build --platform android --profile production
     ```
   - Submit to Google Play Internal Test track for smoke testing before production rollout.
3. **Apple App Store (iOS)**:
   - Build IPA archive:
     ```bash
     cd apps/mobile && npx eas-cli build --platform ios --profile production
     ```
   - Submit to TestFlight for device verification before App Store submission.

### 2.3 Windows Application (WPF / .NET 10 LTS)

1. **Pre-flight Verification**:
   ```bash
   dotnet test apps/windows/TaskFlow.sln
   dotnet publish apps/windows/TaskFlow/TaskFlow.csproj -c Release -r win-x64 --self-contained
   ```
2. **Packaging**:
   - Package as MSIX application using Windows Application Packaging Project.
   - Sign MSIX package using trusted code-signing certificate.
3. **Distribution**:
   - Publish to Microsoft Store partner center or distribute enterprise MSIX installer.

---

## 3. Database Disaster Recovery and Migrations

### 3.1 Migration Strategy

1. All PostgreSQL migrations under `apps/web/server/db/migrations/` must be strictly backward compatible.
2. Tables and columns are added using `CREATE TABLE IF NOT EXISTS` and `ADD COLUMN IF NOT EXISTS`.
3. Migrations are tracked in the `schema_migrations` table and executed within database transactions.

### 3.2 Emergency Migration Rollback

1. If a migration encounters an error during deployment, the migration runner automatically aborts the transaction and exits with a non-zero code.
2. Database schema changes must never drop columns or tables in the same release that introduces replacement schema. Old and new code versions must run concurrently during rolling deployments.
3. In the event of an unrecoverable database incident, restore from the latest automated snapshot:
   - Stop web API traffic by setting maintenance mode.
   - Restore database instance from point-in-time snapshot.
   - Run `npm run db:migrate` to verify schema version consistency.
   - Re-enable web API traffic. Clients will reconcile state on their next sync cycle using local SQLite/IndexedDB outboxes.

---

## 4. Incident Response Playbooks

### 4.1 Playbook A: Sync Desynchronization and Stale Revision Conflicts

- **Symptom**: Client logs report repeated `conflict` mutation receipts or sync loops.
- **Root Cause Analysis**:
  1. Inspect the server conflict details returned in the sync receipt.
  2. Verify if entity was deleted: if tombstone exists, put mutations are rejected to prevent entity resurrection.
  3. Verify client baseRevision: if client baseRevision is lower than server revision, client must fetch remote changes before reapplying.
- **Remediation**:
  1. Trigger client catch-up pull (`cursor` sync without mutations).
  2. If client outbox has invalid mutations, clear client conflict store and allow fresh edits to generate clean mutations.
  3. Client data is always safely exportable to JSON backup files from Settings.

### 4.2 Playbook B: Web Push Delivery Outages and Expired Subscriptions

- **Symptom**: Web push dispatch logs report elevated 410 Gone or 404 Not Found responses from push services.
- **Root Cause Analysis**:
  1. Browser push subscriptions naturally expire when users clear site data or browser profiles.
  2. Expired endpoints return HTTP 410 Gone from Google FCM, Apple APNs, or Mozilla autopush.
- **Remediation**:
  1. TaskFlow automatically prunes 410 subscriptions during dispatch (`markSubscriptionExpired`).
  2. User UI displays "Push Disabled" or "Subscription Expired" banner with one-click re-subscription button.
  3. If VAPID keys were rotated, all existing subscriptions will return 401 Unauthorized; run automated cleanup query:
     ```sql
     UPDATE push_subscriptions SET is_active = false, revoked_at = NOW() WHERE is_active = true;
     ```

### 4.3 Playbook C: Authentication and OTP Abuse

- **Symptom**: Spike in `POST /api/v1/auth/otp/request` calls resulting in HTTP 429 Too Many Requests.
- **Root Cause Analysis**:
  1. Brute-force bot activity attempting to abuse email dispatch.
  2. High traffic from shared enterprise NAT proxies.
- **Remediation**:
  1. TaskFlow rate limits OTP requests to 5 attempts per 15 minutes per IP address.
  2. If attack persists across distributed IPs, tighten `API_RATE_LIMIT_MAX` or route through Cloudflare / WAF with bot challenge.
  3. Legitimate offline users continue using the local-first application without interruption.

---

## 5. Content-Free Operational Logging

TaskFlow strictly enforces zero-PII logging across all operational environments.

1. **Prohibited in Logs**:
   - Task descriptions, note bodies, commitment details.
   - Recipient email addresses, phone numbers, WhatsApp numbers.
   - Passwords, OTP codes, session tokens, JWTs, VAPID private keys.
2. **Permitted in Logs**:
   - Opaque IDs (account IDs, mutation IDs, push endpoint IDs).
   - Numeric counters (batch sizes, revisions, latency in ms).
   - Standardized HTTP status codes (200, 400, 401, 404, 429, 500, 503).
   - Structured tags for log aggregators (e.g., `tag=followup_fu_1`).
