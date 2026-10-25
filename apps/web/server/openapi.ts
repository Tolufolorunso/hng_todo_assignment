export const openApiSpecification = {
  openapi: "3.1.0",
  info: {
    title: "TaskFlow Web API",
    version: "1.0.0",
    description: "Versioned API v1 for TaskFlow local-first synchronization and account services.",
  },
  servers: [
    {
      url: "/api/v1",
      description: "Current environment",
    },
  ],
  paths: {
    "/health": {
      get: {
        summary: "Check API and database health",
        description: "Returns the operational status of the API and its database connection.",
        responses: {
          "200": {
            description: "Service is healthy or degraded",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HealthResponse" },
              },
            },
          },
          "429": {
            description: "Rate limit exceeded",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/capabilities": {
      get: {
        summary: "Expose API capabilities and limits",
        description: "Returns supported authentication schemes, protocol versions, entities, and operational limits.",
        responses: {
          "200": {
            description: "Capabilities information",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CapabilitiesResponse" },
              },
            },
          },
          "429": {
            description: "Rate limit exceeded",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/openapi.json": {
      get: {
        summary: "OpenAPI 3.1 specification",
        description: "Returns the machine-readable OpenAPI documentation for this API.",
        responses: {
          "200": {
            description: "OpenAPI 3.1 document",
            content: {
              "application/json": {},
            },
          },
        },
      },
    },
    "/auth/otp/request": {
      post: {
        summary: "Request email one-time password",
        description: "Sends a temporary verification code to the given email address.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: {
                  email: { type: "string", format: "email" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Verification code sent if valid",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["success", "message", "expiresInSeconds"],
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                    expiresInSeconds: { type: "integer" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/ErrorResponse" },
          "429": { $ref: "#/components/responses/ErrorResponse" },
          "503": { $ref: "#/components/responses/ErrorResponse" },
        },
      },
    },
    "/auth/otp/verify": {
      post: {
        summary: "Verify one-time password and create session",
        description: "Exchanges valid verification code for an access token and refresh credential.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "code"],
                properties: {
                  email: { type: "string", format: "email" },
                  code: { type: "string", minLength: 6, maxLength: 6 },
                  clientPlatform: { type: "string", enum: ["web", "mobile", "windows"] },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Session created successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthSuccessResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/ErrorResponse" },
          "401": { $ref: "#/components/responses/ErrorResponse" },
          "429": { $ref: "#/components/responses/ErrorResponse" },
          "503": { $ref: "#/components/responses/ErrorResponse" },
        },
      },
    },
    "/auth/refresh": {
      post: {
        summary: "Refresh access token",
        description: "Rotates refresh token and issues a new access token.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["refreshToken"],
                properties: {
                  refreshToken: { type: "string", minLength: 32 },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Tokens rotated successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RefreshSuccessResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/ErrorResponse" },
          "401": { $ref: "#/components/responses/ErrorResponse" },
          "429": { $ref: "#/components/responses/ErrorResponse" },
          "503": { $ref: "#/components/responses/ErrorResponse" },
        },
      },
    },
    "/auth/logout": {
      post: {
        summary: "Revoke current session",
        description: "Revokes the active session for the authenticated user.",
        security: [{ BearerAuth: [] }],
        responses: {
          "200": {
            description: "Logged out successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["success", "message"],
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/ErrorResponse" },
        },
      },
    },
    "/auth/sessions": {
      get: {
        summary: "List active sessions",
        description: "Returns all non-revoked sessions for the authenticated account.",
        security: [{ BearerAuth: [] }],
        responses: {
          "200": {
            description: "List of active sessions",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["sessions"],
                  properties: {
                    sessions: {
                      type: "array",
                      items: { $ref: "#/components/schemas/SessionSummary" },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/ErrorResponse" },
          "503": { $ref: "#/components/responses/ErrorResponse" },
        },
      },
      post: {
        summary: "Revoke sessions in bulk",
        description: "Revokes all other active sessions for the account.",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  keepCurrent: { type: "boolean", default: true },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Sessions revoked",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["success", "message", "revokedCount"],
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                    revokedCount: { type: "integer" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/ErrorResponse" },
          "503": { $ref: "#/components/responses/ErrorResponse" },
        },
      },
    },
    "/auth/sessions/{id}": {
      delete: {
        summary: "Revoke specific session",
        description: "Revokes an active session by its ID.",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Session ID to revoke",
          },
        ],
        responses: {
          "200": {
            description: "Session revoked",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["success", "message"],
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/ErrorResponse" },
          "404": { $ref: "#/components/responses/ErrorResponse" },
          "503": { $ref: "#/components/responses/ErrorResponse" },
        },
      },
    },
    "/auth/sessions/revoke-all": {
      post: {
        summary: "Revoke all other active sessions",
        description: "Revokes all active sessions for the authenticated account except the current one.",
        security: [{ BearerAuth: [] }],
        responses: {
          "200": {
            description: "Sessions revoked successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["success", "message", "revokedCount"],
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                    revokedCount: { type: "integer" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/ErrorResponse" },
          "503": { $ref: "#/components/responses/ErrorResponse" },
        },
      },
    },
    "/account": {
      get: {
        summary: "Get account profile",
        description: "Returns account profile details and active session summary.",
        security: [{ BearerAuth: [] }],
        responses: {
          "200": {
            description: "Account profile",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["account"],
                  properties: {
                    account: { $ref: "#/components/schemas/AccountProfile" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/ErrorResponse" },
          "404": { $ref: "#/components/responses/ErrorResponse" },
          "503": { $ref: "#/components/responses/ErrorResponse" },
        },
      },
      delete: {
        summary: "Delete account",
        description: "Soft deletes account and revokes all active sessions.",
        security: [{ BearerAuth: [] }],
        responses: {
          "200": {
            description: "Account deleted successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["success", "message"],
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/ErrorResponse" },
          "404": { $ref: "#/components/responses/ErrorResponse" },
          "503": { $ref: "#/components/responses/ErrorResponse" },
        },
      },
    },
    "/sync": {
      post: {
        summary: "Synchronize client changes and fetch server updates",
        description: "Idempotent push and pull batch operation for account workspaces.",
        security: [{ BearerAuth: [] }],
        responses: {
          "200": { description: "Synchronization batch result" },
          "401": { $ref: "#/components/responses/ErrorResponse" },
          "429": { $ref: "#/components/responses/ErrorResponse" },
        },
      },
    },
    "/tasks": {
      get: {
        summary: "List tasks",
        description: "Retrieve account tasks with optional completed, category, or priority filters.",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "completed", in: "query", schema: { type: "boolean" }, required: false },
          { name: "category", in: "query", schema: { type: "string" }, required: false },
          { name: "priority", in: "query", schema: { type: "string", enum: ["low", "medium", "high", "urgent"] }, required: false },
        ],
        responses: {
          "200": {
            description: "List of tasks",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["tasks"],
                  properties: {
                    tasks: { type: "array", items: { $ref: "#/components/schemas/Task" } },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/ErrorResponse" },
          "503": { $ref: "#/components/responses/ErrorResponse" },
        },
      },
      post: {
        summary: "Create task",
        description: "Create a new task with rich-text HTML description sanitization.",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/TaskInput" },
            },
          },
        },
        responses: {
          "201": {
            description: "Task created successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["task"],
                  properties: {
                    task: { $ref: "#/components/schemas/Task" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/ErrorResponse" },
          "401": { $ref: "#/components/responses/ErrorResponse" },
          "503": { $ref: "#/components/responses/ErrorResponse" },
        },
      },
    },
    "/tasks/{id}": {
      get: {
        summary: "Get task by ID",
        description: "Retrieve a single task owned by the authenticated account.",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Task retrieved",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["task"],
                  properties: {
                    task: { $ref: "#/components/schemas/Task" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/ErrorResponse" },
          "404": { $ref: "#/components/responses/ErrorResponse" },
          "503": { $ref: "#/components/responses/ErrorResponse" },
        },
      },
      patch: {
        summary: "Update task",
        description: "Update fields on an existing task with sanitized rich text.",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/TaskPatch" },
            },
          },
        },
        responses: {
          "200": {
            description: "Task updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["task"],
                  properties: {
                    task: { $ref: "#/components/schemas/Task" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/ErrorResponse" },
          "401": { $ref: "#/components/responses/ErrorResponse" },
          "404": { $ref: "#/components/responses/ErrorResponse" },
          "503": { $ref: "#/components/responses/ErrorResponse" },
        },
      },
      delete: {
        summary: "Delete task",
        description: "Delete a task and record a tombstone with revision sequencing.",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Task deleted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["success", "message"],
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/ErrorResponse" },
          "404": { $ref: "#/components/responses/ErrorResponse" },
          "503": { $ref: "#/components/responses/ErrorResponse" },
        },
      },
    },
    "/tasks/order": {
      get: {
        summary: "Get task order",
        description: "Retrieve custom task ordering list of IDs.",
        security: [{ BearerAuth: [] }],
        responses: {
          "200": {
            description: "Task order retrieved",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["taskIds"],
                  properties: {
                    taskIds: { type: "array", items: { type: "string" } },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/ErrorResponse" },
          "503": { $ref: "#/components/responses/ErrorResponse" },
        },
      },
      put: {
        summary: "Set task order",
        description: "Update the ordered list of task IDs for the authenticated account.",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["taskIds"],
                properties: {
                  taskIds: { type: "array", items: { type: "string" } },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Task order updated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TaskOrder" },
              },
            },
          },
          "400": { $ref: "#/components/responses/ErrorResponse" },
          "401": { $ref: "#/components/responses/ErrorResponse" },
          "503": { $ref: "#/components/responses/ErrorResponse" },
        },
      },
    },
    "/notes": {
      get: {
        summary: "List notes",
        description: "Retrieve all notes owned by the authenticated account.",
        security: [{ BearerAuth: [] }],
        responses: {
          "200": {
            description: "List of notes",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["notes"],
                  properties: {
                    notes: { type: "array", items: { $ref: "#/components/schemas/Note" } },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/ErrorResponse" },
          "503": { $ref: "#/components/responses/ErrorResponse" },
        },
      },
      post: {
        summary: "Create note",
        description: "Create a note with sanitized HTML body content.",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/NoteInput" },
            },
          },
        },
        responses: {
          "201": {
            description: "Note created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["note"],
                  properties: {
                    note: { $ref: "#/components/schemas/Note" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/ErrorResponse" },
          "401": { $ref: "#/components/responses/ErrorResponse" },
          "503": { $ref: "#/components/responses/ErrorResponse" },
        },
      },
    },
    "/notes/{id}": {
      get: {
        summary: "Get note by ID",
        description: "Retrieve a single note owned by the authenticated account.",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Note retrieved",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["note"],
                  properties: {
                    note: { $ref: "#/components/schemas/Note" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/ErrorResponse" },
          "404": { $ref: "#/components/responses/ErrorResponse" },
          "503": { $ref: "#/components/responses/ErrorResponse" },
        },
      },
      patch: {
        summary: "Update note",
        description: "Update note title or body with HTML sanitization.",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/NotePatch" },
            },
          },
        },
        responses: {
          "200": {
            description: "Note updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["note"],
                  properties: {
                    note: { $ref: "#/components/schemas/Note" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/ErrorResponse" },
          "401": { $ref: "#/components/responses/ErrorResponse" },
          "404": { $ref: "#/components/responses/ErrorResponse" },
          "503": { $ref: "#/components/responses/ErrorResponse" },
        },
      },
      delete: {
        summary: "Delete note",
        description: "Delete note and record deletion tombstone.",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Note deleted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["success", "message"],
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/ErrorResponse" },
          "404": { $ref: "#/components/responses/ErrorResponse" },
          "503": { $ref: "#/components/responses/ErrorResponse" },
        },
      },
    },
    "/followups": {
      get: {
        summary: "List follow-ups",
        description: "Retrieve follow-ups with optional status filter.",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "status", in: "query", schema: { type: "string", enum: ["open", "completed", "archived"] }, required: false },
        ],
        responses: {
          "200": {
            description: "List of follow-ups",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["followUps"],
                  properties: {
                    followUps: { type: "array", items: { $ref: "#/components/schemas/FollowUp" } },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/ErrorResponse" },
          "503": { $ref: "#/components/responses/ErrorResponse" },
        },
      },
      post: {
        summary: "Create follow-up",
        description: "Create a follow-up commitment with validated recurrence rule.",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/FollowUpInput" },
            },
          },
        },
        responses: {
          "201": {
            description: "Follow-up created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["followUp"],
                  properties: {
                    followUp: { $ref: "#/components/schemas/FollowUp" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/ErrorResponse" },
          "401": { $ref: "#/components/responses/ErrorResponse" },
          "503": { $ref: "#/components/responses/ErrorResponse" },
        },
      },
    },
    "/followups/{id}": {
      get: {
        summary: "Get follow-up by ID",
        description: "Retrieve a single follow-up commitment.",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Follow-up retrieved",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["followUp"],
                  properties: {
                    followUp: { $ref: "#/components/schemas/FollowUp" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/ErrorResponse" },
          "404": { $ref: "#/components/responses/ErrorResponse" },
          "503": { $ref: "#/components/responses/ErrorResponse" },
        },
      },
      patch: {
        summary: "Update follow-up",
        description: "Update details or status on a follow-up commitment.",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/FollowUpPatch" },
            },
          },
        },
        responses: {
          "200": {
            description: "Follow-up updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["followUp"],
                  properties: {
                    followUp: { $ref: "#/components/schemas/FollowUp" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/ErrorResponse" },
          "401": { $ref: "#/components/responses/ErrorResponse" },
          "404": { $ref: "#/components/responses/ErrorResponse" },
          "503": { $ref: "#/components/responses/ErrorResponse" },
        },
      },
      delete: {
        summary: "Delete follow-up",
        description: "Delete follow-up and record deletion tombstone.",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Follow-up deleted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["success", "message"],
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/ErrorResponse" },
          "404": { $ref: "#/components/responses/ErrorResponse" },
          "503": { $ref: "#/components/responses/ErrorResponse" },
        },
      },
    },
    "/followups/{id}/occurrences": {
      get: {
        summary: "List occurrences",
        description: "Retrieve occurrence completion history for a recurring follow-up.",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Occurrences retrieved",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["occurrences"],
                  properties: {
                    occurrences: { type: "array", items: { $ref: "#/components/schemas/FollowUpOccurrence" } },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/ErrorResponse" },
          "503": { $ref: "#/components/responses/ErrorResponse" },
        },
      },
      post: {
        summary: "Record occurrence",
        description: "Log a completed occurrence for a recurring follow-up.",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["dueAt"],
                properties: {
                  dueAt: { type: "string", format: "date-time" },
                  completedAt: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Occurrence recorded",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["occurrence"],
                  properties: {
                    occurrence: { $ref: "#/components/schemas/FollowUpOccurrence" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/ErrorResponse" },
          "401": { $ref: "#/components/responses/ErrorResponse" },
          "404": { $ref: "#/components/responses/ErrorResponse" },
          "503": { $ref: "#/components/responses/ErrorResponse" },
        },
      },
    },
    "/plans": {
      get: {
        summary: "List daily plans",
        description: "Retrieve daily plans for the authenticated account.",
        security: [{ BearerAuth: [] }],
        responses: {
          "200": {
            description: "Daily plans retrieved",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["plans"],
                  properties: {
                    plans: { type: "array", items: { $ref: "#/components/schemas/DailyPlan" } },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/ErrorResponse" },
          "503": { $ref: "#/components/responses/ErrorResponse" },
        },
      },
      put: {
        summary: "Upsert daily plan",
        description: "Create or replace daily plan items and time budget for a specific date.",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/DailyPlanInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Daily plan saved",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["plan"],
                  properties: {
                    plan: { $ref: "#/components/schemas/DailyPlan" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/ErrorResponse" },
          "401": { $ref: "#/components/responses/ErrorResponse" },
          "503": { $ref: "#/components/responses/ErrorResponse" },
        },
      },
    },
    "/plans/{date}": {
      get: {
        summary: "Get daily plan by date",
        description: "Retrieve daily plan for the specified calendar date (YYYY-MM-DD).",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "date", in: "path", required: true, schema: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" } },
        ],
        responses: {
          "200": {
            description: "Daily plan retrieved",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["plan"],
                  properties: {
                    plan: { $ref: "#/components/schemas/DailyPlan" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/ErrorResponse" },
          "401": { $ref: "#/components/responses/ErrorResponse" },
          "404": { $ref: "#/components/responses/ErrorResponse" },
          "503": { $ref: "#/components/responses/ErrorResponse" },
        },
      },
    },
    "/inbox": {
      get: {
        summary: "List inbox captures",
        description: "Retrieve rapid inbox captures with optional processing state filter.",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "state", in: "query", schema: { type: "string", enum: ["pending", "processed", "discarded"] }, required: false },
        ],
        responses: {
          "200": {
            description: "Inbox captures retrieved",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["captures"],
                  properties: {
                    captures: { type: "array", items: { $ref: "#/components/schemas/InboxCapture" } },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/ErrorResponse" },
          "503": { $ref: "#/components/responses/ErrorResponse" },
        },
      },
      post: {
        summary: "Create inbox capture",
        description: "Capture text, URL, or shared content for later triage.",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/InboxCaptureInput" },
            },
          },
        },
        responses: {
          "201": {
            description: "Inbox capture created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["capture"],
                  properties: {
                    capture: { $ref: "#/components/schemas/InboxCapture" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/ErrorResponse" },
          "401": { $ref: "#/components/responses/ErrorResponse" },
          "503": { $ref: "#/components/responses/ErrorResponse" },
        },
      },
    },
    "/inbox/{id}": {
      get: {
        summary: "Get inbox capture by ID",
        description: "Retrieve a single inbox capture.",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Inbox capture retrieved",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["capture"],
                  properties: {
                    capture: { $ref: "#/components/schemas/InboxCapture" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/ErrorResponse" },
          "404": { $ref: "#/components/responses/ErrorResponse" },
          "503": { $ref: "#/components/responses/ErrorResponse" },
        },
      },
      patch: {
        summary: "Update inbox capture",
        description: "Update processing state or link to converted entity.",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/InboxCapturePatch" },
            },
          },
        },
        responses: {
          "200": {
            description: "Inbox capture updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["capture"],
                  properties: {
                    capture: { $ref: "#/components/schemas/InboxCapture" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/ErrorResponse" },
          "401": { $ref: "#/components/responses/ErrorResponse" },
          "404": { $ref: "#/components/responses/ErrorResponse" },
          "503": { $ref: "#/components/responses/ErrorResponse" },
        },
      },
      delete: {
        summary: "Delete inbox capture",
        description: "Delete inbox capture and record deletion tombstone.",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Inbox capture deleted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["success", "message"],
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/ErrorResponse" },
          "404": { $ref: "#/components/responses/ErrorResponse" },
          "503": { $ref: "#/components/responses/ErrorResponse" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    responses: {
      ErrorResponse: {
        description: "Standard API error detail",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        required: ["error"],
        properties: {
          error: {
            type: "object",
            required: ["code", "message", "timestamp"],
            properties: {
              code: { type: "string" },
              message: { type: "string" },
              details: { nullable: true },
              timestamp: { type: "string", format: "date-time" },
            },
          },
        },
      },
      HealthResponse: {
        type: "object",
        required: ["status", "version", "timestamp", "database"],
        properties: {
          status: { type: "string", enum: ["ok", "degraded"] },
          version: { type: "string" },
          timestamp: { type: "string", format: "date-time" },
          database: {
            type: "object",
            required: ["status", "latencyMs", "error"],
            properties: {
              status: { type: "string", enum: ["connected", "unconfigured", "disconnected"] },
              latencyMs: { type: "integer", nullable: true },
              error: { type: "string", nullable: true },
            },
          },
        },
      },
      CapabilitiesResponse: {
        type: "object",
        required: ["version", "protocolVersion", "auth", "entities", "limits"],
        properties: {
          version: { type: "string" },
          protocolVersion: { type: "integer" },
          auth: {
            type: "array",
            items: { type: "string" },
          },
          entities: {
            type: "array",
            items: { type: "string" },
          },
          limits: {
            type: "object",
            required: [
              "taskTitleMaxLength",
              "taskDescriptionMaxLength",
              "noteTitleMaxLength",
              "noteBodyMaxLength",
              "followupNameMaxLength",
              "inboxTextMaxLength",
            ],
            properties: {
              taskTitleMaxLength: { type: "integer" },
              taskDescriptionMaxLength: { type: "integer" },
              noteTitleMaxLength: { type: "integer" },
              noteBodyMaxLength: { type: "integer" },
              followupNameMaxLength: { type: "integer" },
              inboxTextMaxLength: { type: "integer" },
            },
          },
        },
      },
      AuthSuccessResponse: {
        type: "object",
        required: ["accessToken", "refreshToken", "expiresIn", "account"],
        properties: {
          accessToken: { type: "string" },
          refreshToken: { type: "string" },
          expiresIn: { type: "integer" },
          account: {
            type: "object",
            required: ["id", "email", "createdAt"],
            properties: {
              id: { type: "string" },
              email: { type: "string", format: "email" },
              createdAt: { type: "string", format: "date-time" },
            },
          },
        },
      },
      RefreshSuccessResponse: {
        type: "object",
        required: ["accessToken", "refreshToken", "expiresIn"],
        properties: {
          accessToken: { type: "string" },
          refreshToken: { type: "string" },
          expiresIn: { type: "integer" },
        },
      },
      SessionSummary: {
        type: "object",
        required: ["id", "clientPlatform", "userAgent", "createdAt", "expiresAt", "isCurrent"],
        properties: {
          id: { type: "string" },
          clientPlatform: { type: "string" },
          userAgent: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          expiresAt: { type: "string", format: "date-time" },
          isCurrent: { type: "boolean" },
        },
      },
      AccountProfile: {
        type: "object",
        required: ["id", "email", "createdAt", "updatedAt", "activeSessionsCount"],
        properties: {
          id: { type: "string" },
          email: { type: "string", format: "email" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          activeSessionsCount: { type: "integer" },
        },
      },
      Task: {
        type: "object",
        required: ["id", "accountId", "title", "completed", "priority", "revision", "createdAt", "updatedAt"],
        properties: {
          id: { type: "string" },
          accountId: { type: "string" },
          title: { type: "string" },
          description: { type: "string", nullable: true },
          completed: { type: "boolean" },
          priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
          dueDate: { type: "string", nullable: true },
          category: { type: "string", nullable: true },
          estimatedMinutes: { type: "integer", nullable: true },
          sourceNoteId: { type: "string", nullable: true },
          sourceExcerpt: { type: "string", nullable: true },
          revision: { type: "integer" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          completedAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      TaskInput: {
        type: "object",
        required: ["title"],
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          description: { type: "string", nullable: true },
          completed: { type: "boolean" },
          priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
          dueDate: { type: "string", nullable: true },
          category: { type: "string", nullable: true },
          estimatedMinutes: { type: "integer", nullable: true },
          sourceNoteId: { type: "string", nullable: true },
          sourceExcerpt: { type: "string", nullable: true },
        },
      },
      TaskPatch: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string", nullable: true },
          completed: { type: "boolean" },
          priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
          dueDate: { type: "string", nullable: true },
          category: { type: "string", nullable: true },
          estimatedMinutes: { type: "integer", nullable: true },
        },
      },
      TaskOrder: {
        type: "object",
        required: ["taskIds", "revision", "updatedAt"],
        properties: {
          taskIds: { type: "array", items: { type: "string" } },
          revision: { type: "integer" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Note: {
        type: "object",
        required: ["id", "accountId", "title", "body", "revision", "createdAt", "updatedAt"],
        properties: {
          id: { type: "string" },
          accountId: { type: "string" },
          title: { type: "string" },
          body: { type: "string" },
          revision: { type: "integer" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      NoteInput: {
        type: "object",
        required: ["title"],
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          body: { type: "string" },
        },
      },
      NotePatch: {
        type: "object",
        properties: {
          title: { type: "string" },
          body: { type: "string" },
        },
      },
      FollowUp: {
        type: "object",
        required: ["id", "accountId", "personName", "commitment", "dueAt", "timeZone", "status", "revision", "createdAt", "updatedAt"],
        properties: {
          id: { type: "string" },
          accountId: { type: "string" },
          personName: { type: "string" },
          commitment: { type: "string" },
          details: { type: "string", nullable: true },
          dueAt: { type: "string", format: "date-time" },
          timeZone: { type: "string" },
          emailAddress: { type: "string", nullable: true },
          phoneNumber: { type: "string", nullable: true },
          whatsappNumber: { type: "string", nullable: true },
          preferredAction: { type: "string", nullable: true },
          recurrence: { type: "object", nullable: true },
          status: { type: "string", enum: ["open", "completed", "archived"] },
          sourceNoteId: { type: "string", nullable: true },
          sourceExcerpt: { type: "string", nullable: true },
          revision: { type: "integer" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      FollowUpInput: {
        type: "object",
        required: ["personName", "commitment", "dueAt"],
        properties: {
          id: { type: "string" },
          personName: { type: "string" },
          commitment: { type: "string" },
          details: { type: "string", nullable: true },
          dueAt: { type: "string", format: "date-time" },
          timeZone: { type: "string" },
          emailAddress: { type: "string", nullable: true },
          phoneNumber: { type: "string", nullable: true },
          whatsappNumber: { type: "string", nullable: true },
          preferredAction: { type: "string", enum: ["email", "whatsapp", "phone"], nullable: true },
          recurrence: { type: "object", nullable: true },
          sourceNoteId: { type: "string", nullable: true },
          sourceExcerpt: { type: "string", nullable: true },
        },
      },
      FollowUpPatch: {
        type: "object",
        properties: {
          personName: { type: "string" },
          commitment: { type: "string" },
          details: { type: "string", nullable: true },
          dueAt: { type: "string", format: "date-time" },
          timeZone: { type: "string" },
          emailAddress: { type: "string", nullable: true },
          phoneNumber: { type: "string", nullable: true },
          whatsappNumber: { type: "string", nullable: true },
          preferredAction: { type: "string", enum: ["email", "whatsapp", "phone"], nullable: true },
          recurrence: { type: "object", nullable: true },
          status: { type: "string", enum: ["open", "completed", "archived"] },
        },
      },
      FollowUpOccurrence: {
        type: "object",
        required: ["id", "followupId", "accountId", "dueAt", "completedAt", "createdAt"],
        properties: {
          id: { type: "string" },
          followupId: { type: "string" },
          accountId: { type: "string" },
          dueAt: { type: "string", format: "date-time" },
          completedAt: { type: "string", format: "date-time" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      DailyPlan: {
        type: "object",
        required: ["id", "accountId", "planDate", "availableMinutes", "items", "status", "revision", "createdAt", "updatedAt"],
        properties: {
          id: { type: "string" },
          accountId: { type: "string" },
          planDate: { type: "string" },
          availableMinutes: { type: "integer" },
          items: { type: "array", items: { type: "object" } },
          status: { type: "string" },
          revision: { type: "integer" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      DailyPlanInput: {
        type: "object",
        required: ["planDate", "availableMinutes", "items"],
        properties: {
          id: { type: "string" },
          planDate: { type: "string" },
          availableMinutes: { type: "integer" },
          items: { type: "array", items: { type: "object" } },
          status: { type: "string" },
        },
      },
      InboxCapture: {
        type: "object",
        required: ["id", "accountId", "text", "state", "capturedAt", "revision", "createdAt", "updatedAt"],
        properties: {
          id: { type: "string" },
          accountId: { type: "string" },
          text: { type: "string" },
          sharedUrl: { type: "string", nullable: true },
          sourceAppLabel: { type: "string", nullable: true },
          state: { type: "string", enum: ["pending", "processed", "discarded"] },
          targetType: { type: "string", nullable: true },
          targetId: { type: "string", nullable: true },
          capturedAt: { type: "string", format: "date-time" },
          processedAt: { type: "string", format: "date-time", nullable: true },
          discardedAt: { type: "string", format: "date-time", nullable: true },
          revision: { type: "integer" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      InboxCaptureInput: {
        type: "object",
        required: ["text"],
        properties: {
          id: { type: "string" },
          text: { type: "string" },
          sharedUrl: { type: "string", nullable: true },
          sourceAppLabel: { type: "string", nullable: true },
        },
      },
      InboxCapturePatch: {
        type: "object",
        properties: {
          state: { type: "string", enum: ["pending", "processed", "discarded"] },
          targetType: { type: "string", enum: ["task", "note", "followup"], nullable: true },
          targetId: { type: "string", nullable: true },
        },
      },
    },
  },
};
