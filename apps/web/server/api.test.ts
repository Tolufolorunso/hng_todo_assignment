import { describe, it, expect, beforeEach } from "vitest";
import {
  apiError,
  apiSuccess,
  createErrorPayload,
} from "./errors";
import {
  parseJsonBody,
  validateString,
  validateEmail,
  validateEnum,
  validateInteger,
  validateDateFormat,
} from "./validation";
import {
  checkRateLimit,
  getClientIp,
  getRateLimitHeaders,
  resetRateLimits,
} from "./rate-limit";

describe("API Error and Success helpers", () => {
  it("creates standard error payload with timestamp", () => {
    const payload = createErrorPayload("BAD_REQUEST", "Invalid input", { field: "title" });
    expect(payload.error.code).toBe("BAD_REQUEST");
    expect(payload.error.message).toBe("Invalid input");
    expect(payload.error.details).toEqual({ field: "title" });
    expect(payload.error.timestamp).toBeTruthy();
  });

  it("returns Response with default status mapping and headers", async () => {
    const res = apiError("NOT_FOUND", "Resource missing");
    expect(res.status).toBe(404);
    expect(res.headers.get("Content-Type")).toContain("application/json");

    const json = await res.json();
    expect(json.error.code).toBe("NOT_FOUND");
    expect(json.error.message).toBe("Resource missing");
  });

  it("respects status override and custom headers", async () => {
    const res = apiError("BAD_REQUEST", "Custom", {
      status: 422,
      headers: { "X-Custom": "test-header" },
    });
    expect(res.status).toBe(422);
    expect(res.headers.get("X-Custom")).toBe("test-header");
  });

  it("formats successful JSON response", async () => {
    const res = apiSuccess({ hello: "world" }, { status: 201 });
    expect(res.status).toBe(201);
    expect(res.headers.get("Content-Type")).toContain("application/json");
    const json = await res.json();
    expect(json).toEqual({ hello: "world" });
  });
});

describe("Request validation helpers", () => {
  it("parses valid JSON request body", async () => {
    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ name: "Alice" }),
    });
    const parsed = await parseJsonBody<{ name: string }>(req);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.name).toBe("Alice");
    }
  });

  it("fails gracefully on empty or malformed body", async () => {
    const emptyReq = new Request("http://localhost", { method: "POST", body: "" });
    const emptyRes = await parseJsonBody(emptyReq);
    expect(emptyRes.success).toBe(false);

    const badReq = new Request("http://localhost", { method: "POST", body: "{bad json" });
    const badRes = await parseJsonBody(badReq);
    expect(badRes.success).toBe(false);
  });

  it("validates string bounds and required flags", () => {
    expect(validateString("", "title", { required: true })).toBe("title is required");
    expect(validateString("ab", "title", { minLength: 3 })).toBe("title must be at least 3 characters");
    expect(validateString("abcdef", "title", { maxLength: 5 })).toBe("title cannot exceed 5 characters");
    expect(validateString("valid", "title", { minLength: 3, maxLength: 10 })).toBeNull();
  });

  it("validates email addresses", () => {
    expect(validateEmail("not-an-email")).toBe("email must be a valid email address");
    expect(validateEmail("user@example.com")).toBeNull();
  });

  it("validates enums", () => {
    const priorities = ["low", "medium", "high"] as const;
    expect(validateEnum("urgent", "priority", priorities)).toContain("must be one of: low, medium, high");
    expect(validateEnum("high", "priority", priorities)).toBeNull();
  });

  it("validates integers", () => {
    expect(validateInteger("123", "count")).toBe("count must be an integer");
    expect(validateInteger(1.5, "count")).toBe("count must be an integer");
    expect(validateInteger(0, "count", { min: 1 })).toBe("count cannot be less than 1");
    expect(validateInteger(10, "count", { min: 1, max: 5 })).toBe("count cannot exceed 5");
    expect(validateInteger(3, "count", { min: 1, max: 5 })).toBeNull();
  });

  it("validates calendar date format YYYY-MM-DD", () => {
    expect(validateDateFormat("2026-13-45", "dueDate")).toBe("dueDate is not a valid calendar date");
    expect(validateDateFormat("invalid-date", "dueDate")).toBe("dueDate must be in YYYY-MM-DD format");
    expect(validateDateFormat("2026-10-25", "dueDate")).toBeNull();
  });
});

describe("Rate limiter", () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it("allows requests under the limit and tracks remaining quota", () => {
    const key = "test-client-1";
    const r1 = checkRateLimit(key, { max: 3, windowSeconds: 60 });
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = checkRateLimit(key, { max: 3, windowSeconds: 60 });
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = checkRateLimit(key, { max: 3, windowSeconds: 60 });
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);

    const r4 = checkRateLimit(key, { max: 3, windowSeconds: 60 });
    expect(r4.allowed).toBe(false);
    expect(r4.remaining).toBe(0);
    expect(r4.retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });

  it("generates correct rate limit headers", () => {
    const allowedResult = {
      allowed: true,
      limit: 60,
      remaining: 59,
      resetSeconds: 60,
    };
    const allowedHeaders = getRateLimitHeaders(allowedResult);
    expect(allowedHeaders["X-RateLimit-Limit"]).toBe("60");
    expect(allowedHeaders["X-RateLimit-Remaining"]).toBe("59");
    expect(allowedHeaders["X-RateLimit-Reset"]).toBe("60");
    expect(allowedHeaders["Retry-After"]).toBeUndefined();

    const blockedResult = {
      allowed: false,
      limit: 60,
      remaining: 0,
      resetSeconds: 45,
      retryAfterSeconds: 45,
    };
    const blockedHeaders = getRateLimitHeaders(blockedResult);
    expect(blockedHeaders["Retry-After"]).toBe("45");
  });

  it("extracts client IP from headers", () => {
    const reqForwarded = new Request("http://localhost", {
      headers: { "x-forwarded-for": "203.0.113.195, 70.41.3.18" },
    });
    expect(getClientIp(reqForwarded)).toBe("203.0.113.195");

    const reqRealIp = new Request("http://localhost", {
      headers: { "x-real-ip": "198.51.100.1" },
    });
    expect(getClientIp(reqRealIp)).toBe("198.51.100.1");

    const reqFallback = new Request("http://localhost");
    expect(getClientIp(reqFallback)).toBe("127.0.0.1");
  });
});
