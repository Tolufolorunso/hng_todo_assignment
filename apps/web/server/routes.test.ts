import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GET as healthRoute } from "../app/api/v1/health/route";
import { GET as capabilitiesRoute } from "../app/api/v1/capabilities/route";
import { GET as openApiRoute } from "../app/api/v1/openapi.json/route";
import { resetRateLimits } from "./rate-limit";
import { closeDatabasePool } from "./db/client";

describe("API v1 Route Handlers", () => {
  const originalEnv = process.env.DATABASE_URL;

  beforeEach(async () => {
    resetRateLimits();
    await closeDatabasePool();
    delete process.env.DATABASE_URL;
  });

  afterEach(async () => {
    await closeDatabasePool();
    if (originalEnv !== undefined) {
      process.env.DATABASE_URL = originalEnv;
    } else {
      delete process.env.DATABASE_URL;
    }
  });

  it("GET /api/v1/health returns ok status when unconfigured", async () => {
    const req = new Request("http://localhost:3000/api/v1/health");
    const res = await healthRoute(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.status).toBe("ok");
    expect(data.version).toBe("1.0.0");
    expect(data.timestamp).toBeTruthy();
    expect(data.database.status).toBe("unconfigured");
    expect(res.headers.get("X-RateLimit-Limit")).toBeTruthy();
    expect(res.headers.get("X-RateLimit-Remaining")).toBeTruthy();
  });

  it("GET /api/v1/health reports degraded when database connection fails", async () => {
    process.env.DATABASE_URL = "postgres://invalid:invalid@127.0.0.1:59999/test";
    const req = new Request("http://localhost:3000/api/v1/health");
    const res = await healthRoute(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.status).toBe("degraded");
    expect(data.database.status).toBe("disconnected");
    expect(data.database.error).toBeTruthy();
  });

  it("GET /api/v1/capabilities returns supported features and limits", async () => {
    const req = new Request("http://localhost:3000/api/v1/capabilities");
    const res = await capabilitiesRoute(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.version).toBe("1.0.0");
    expect(data.protocolVersion).toBe(1);
    expect(data.auth).toContain("otp");
    expect(data.entities).toContain("tasks");
    expect(data.entities).toContain("notes");
    expect(data.entities).toContain("followups");
    expect(data.entities).toContain("plans");
    expect(data.entities).toContain("inbox");
    expect(data.limits.taskTitleMaxLength).toBe(200);
    expect(data.limits.inboxTextMaxLength).toBe(20000);
  });

  it("GET /api/v1/openapi.json returns valid OpenAPI 3.1 document", async () => {
    const res = await openApiRoute();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("application/json");

    const doc = await res.json();
    expect(doc.openapi).toBe("3.1.0");
    expect(doc.info.title).toBe("TaskFlow Web API");
    expect(doc.paths["/health"]).toBeDefined();
    expect(doc.paths["/capabilities"]).toBeDefined();
    expect(doc.paths["/openapi.json"]).toBeDefined();
    expect(doc.components.schemas.HealthResponse).toBeDefined();
    expect(doc.components.schemas.CapabilitiesResponse).toBeDefined();
  });
});
