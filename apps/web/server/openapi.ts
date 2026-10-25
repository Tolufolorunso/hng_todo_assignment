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
          "200": { description: "Verification code sent if valid" },
          "400": { $ref: "#/components/responses/ErrorResponse" },
          "429": { $ref: "#/components/responses/ErrorResponse" },
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
                  code: { type: "string" },
                  clientPlatform: { type: "string", enum: ["web", "mobile", "windows"] },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Session created successfully" },
          "400": { $ref: "#/components/responses/ErrorResponse" },
          "401": { $ref: "#/components/responses/ErrorResponse" },
          "429": { $ref: "#/components/responses/ErrorResponse" },
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
    },
  },
};
