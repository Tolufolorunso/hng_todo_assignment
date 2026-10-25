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
    },
  },
};
