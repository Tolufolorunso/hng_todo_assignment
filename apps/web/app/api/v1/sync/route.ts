import { apiError, apiSuccess } from "@/server/errors";
import { authenticateRequest } from "@/server/auth";
import { isDatabaseConfigured } from "@/server/db/client";
import { parseJsonBody, validateEnum, validateString } from "@/server/validation";
import {
  processSyncBatch,
  SYNC_PROTOCOL_VERSION,
  MAX_SYNC_MUTATIONS_PER_BATCH,
  MAX_SYNC_PAGE_LIMIT,
  type SyncMutation,
  type SyncEntityType,
  type SyncMutationAction,
} from "@/server/sync";

export const dynamic = "force-dynamic";

const VALID_ENTITY_TYPES: SyncEntityType[] = [
  "task",
  "note",
  "followup",
  "occurrence",
  "plan",
  "inbox",
  "task_order",
];

const VALID_ACTIONS: SyncMutationAction[] = ["put", "delete"];

const RESPONSE_HEADERS = {
  "Cache-Control": "no-store, private",
};

export async function POST(request: Request): Promise<Response> {
  const auth = await authenticateRequest(request);
  if (!auth) {
    return apiError("UNAUTHORIZED", "Authentication required. Please provide a valid Bearer token.", {
      headers: RESPONSE_HEADERS,
    });
  }

  const parsed = await parseJsonBody<{
    protocolVersion?: unknown;
    mutations?: unknown;
    cursor?: unknown;
    limit?: unknown;
  }>(request);

  if (!parsed.success) {
    return apiError("BAD_REQUEST", parsed.error, {
      headers: RESPONSE_HEADERS,
    });
  }

  const validationErrors: Array<{ field: string; message: string }> = [];

  // 1. Protocol version validation
  if (parsed.data.protocolVersion !== undefined && parsed.data.protocolVersion !== null) {
    if (
      typeof parsed.data.protocolVersion !== "number" ||
      !Number.isInteger(parsed.data.protocolVersion) ||
      parsed.data.protocolVersion !== SYNC_PROTOCOL_VERSION
    ) {
      validationErrors.push({
        field: "protocolVersion",
        message: `Unsupported protocolVersion. Expected integer ${SYNC_PROTOCOL_VERSION}.`,
      });
    }
  }

  // 2. Cursor validation
  if (parsed.data.cursor !== undefined && parsed.data.cursor !== null) {
    if (
      typeof parsed.data.cursor !== "number" ||
      !Number.isInteger(parsed.data.cursor) ||
      parsed.data.cursor < 0
    ) {
      validationErrors.push({
        field: "cursor",
        message: "Cursor must be a non-negative integer.",
      });
    }
  }

  // 3. Limit validation
  if (parsed.data.limit !== undefined && parsed.data.limit !== null) {
    if (
      typeof parsed.data.limit !== "number" ||
      !Number.isInteger(parsed.data.limit) ||
      parsed.data.limit < 1 ||
      parsed.data.limit > MAX_SYNC_PAGE_LIMIT
    ) {
      validationErrors.push({
        field: "limit",
        message: `Limit must be an integer between 1 and ${MAX_SYNC_PAGE_LIMIT}.`,
      });
    }
  }

  // 4. Mutations array validation
  if (parsed.data.mutations !== undefined && parsed.data.mutations !== null) {
    if (!Array.isArray(parsed.data.mutations)) {
      validationErrors.push({
        field: "mutations",
        message: "Mutations must be an array.",
      });
    } else if (parsed.data.mutations.length > MAX_SYNC_MUTATIONS_PER_BATCH) {
      validationErrors.push({
        field: "mutations",
        message: `Mutations batch size exceeds maximum limit of ${MAX_SYNC_MUTATIONS_PER_BATCH}.`,
      });
    } else {
      for (let i = 0; i < parsed.data.mutations.length; i++) {
        const item = parsed.data.mutations[i];
        if (!item || typeof item !== "object") {
          validationErrors.push({
            field: `mutations[${i}]`,
            message: "Mutation item must be an object.",
          });
          continue;
        }

        const mut = item as Record<string, unknown>;

        const idError = validateString(mut.mutationId, `mutations[${i}].mutationId`, { required: true });
        if (idError) validationErrors.push({ field: `mutations[${i}].mutationId`, message: idError });

        const typeError = validateEnum(mut.entityType, `mutations[${i}].entityType`, VALID_ENTITY_TYPES, true);
        if (typeError) validationErrors.push({ field: `mutations[${i}].entityType`, message: typeError });

        const entityIdError = validateString(mut.entityId, `mutations[${i}].entityId`, { required: true });
        if (entityIdError) validationErrors.push({ field: `mutations[${i}].entityId`, message: entityIdError });

        const actionError = validateEnum(mut.action, `mutations[${i}].action`, VALID_ACTIONS, true);
        if (actionError) validationErrors.push({ field: `mutations[${i}].action`, message: actionError });

        if (mut.baseRevision !== undefined && mut.baseRevision !== null) {
          if (
            typeof mut.baseRevision !== "number" ||
            !Number.isInteger(mut.baseRevision) ||
            mut.baseRevision < 0
          ) {
            validationErrors.push({
              field: `mutations[${i}].baseRevision`,
              message: "baseRevision must be a non-negative integer when provided.",
            });
          }
        }
      }
    }
  }

  if (validationErrors.length > 0) {
    return apiError("BAD_REQUEST", "Validation failed", {
      details: validationErrors,
      headers: RESPONSE_HEADERS,
    });
  }

  if (!isDatabaseConfigured()) {
    return apiError("DATABASE_UNAVAILABLE", "Database connection is not configured on this server.", {
      headers: RESPONSE_HEADERS,
    });
  }

  try {
    const result = await processSyncBatch(auth.sub, {
      protocolVersion:
        typeof parsed.data.protocolVersion === "number" ? parsed.data.protocolVersion : undefined,
      mutations: Array.isArray(parsed.data.mutations) ? (parsed.data.mutations as SyncMutation[]) : undefined,
      cursor: typeof parsed.data.cursor === "number" ? parsed.data.cursor : undefined,
      limit: typeof parsed.data.limit === "number" ? parsed.data.limit : undefined,
    });

    return apiSuccess(result, {
      headers: RESPONSE_HEADERS,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("DATABASE_UNAVAILABLE")) {
      return apiError("DATABASE_UNAVAILABLE", message, {
        headers: RESPONSE_HEADERS,
      });
    }
    if (message.includes("Unsupported protocol version") || message.includes("Batch size exceeds")) {
      return apiError("BAD_REQUEST", message, {
        headers: RESPONSE_HEADERS,
      });
    }
    return apiError("INTERNAL_ERROR", "Failed to process synchronization batch.", {
      headers: RESPONSE_HEADERS,
    });
  }
}
