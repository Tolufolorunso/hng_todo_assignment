import { describe, it, expect } from "vitest";
import { GET as getTasksHandler, POST as postTasksHandler } from "@/app/api/v1/tasks/route";
import { GET as getTaskHandler, PATCH as patchTaskHandler, DELETE as deleteTaskHandler } from "@/app/api/v1/tasks/[id]/route";
import { GET as getTaskOrderHandler, PUT as putTaskOrderHandler } from "@/app/api/v1/tasks/order/route";
import { GET as getNotesHandler, POST as postNotesHandler } from "@/app/api/v1/notes/route";
import { GET as getNoteHandler, PATCH as patchNoteHandler, DELETE as deleteNoteHandler } from "@/app/api/v1/notes/[id]/route";
import { GET as getFollowUpsHandler, POST as postFollowUpsHandler } from "@/app/api/v1/followups/route";
import { GET as getFollowUpHandler, PATCH as patchFollowUpHandler, DELETE as deleteFollowUpHandler } from "@/app/api/v1/followups/[id]/route";
import { GET as getOccurrencesHandler, POST as postOccurrencesHandler } from "@/app/api/v1/followups/[id]/occurrences/route";
import { GET as getPlansHandler, PUT as putPlansHandler } from "@/app/api/v1/plans/route";
import { GET as getPlanDateHandler } from "@/app/api/v1/plans/[date]/route";
import { GET as getInboxHandler, POST as postInboxHandler } from "@/app/api/v1/inbox/route";
import { GET as getInboxItemHandler, PATCH as patchInboxItemHandler, DELETE as deleteInboxItemHandler } from "@/app/api/v1/inbox/[id]/route";
import { createAccessToken } from "@/server/auth";

describe("Productivity Route Handlers", () => {
  const validToken = createAccessToken({
    accountId: "acc_test_routes",
    sessionId: "ses_test_routes",
    email: "productivity.routes@example.com",
  });

  const authHeaders = {
    Authorization: `Bearer ${validToken}`,
    "Content-Type": "application/json",
  };

  describe("Tasks Endpoints", () => {
    it("returns 401 when unauthenticated on GET /api/v1/tasks", async () => {
      const req = new Request("http://localhost:3000/api/v1/tasks");
      const res = await getTasksHandler(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe("UNAUTHORIZED");
    });

    it("returns 401 when unauthenticated on POST /api/v1/tasks", async () => {
      const req = new Request("http://localhost:3000/api/v1/tasks", {
        method: "POST",
        body: JSON.stringify({ title: "Task without auth" }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await postTasksHandler(req);
      expect(res.status).toBe(401);
    });

    it("returns 401 when unauthenticated on GET /api/v1/tasks/[id]", async () => {
      const req = new Request("http://localhost:3000/api/v1/tasks/tsk_123");
      const res = await getTaskHandler(req, { params: Promise.resolve({ id: "tsk_123" }) });
      expect(res.status).toBe(401);
    });

    it("returns 401 when unauthenticated on DELETE /api/v1/tasks/[id]", async () => {
      const req = new Request("http://localhost:3000/api/v1/tasks/tsk_123", { method: "DELETE" });
      const res = await deleteTaskHandler(req, { params: Promise.resolve({ id: "tsk_123" }) });
      expect(res.status).toBe(401);
    });

    it("returns 400 on POST /api/v1/tasks with missing title", async () => {
      const req = new Request("http://localhost:3000/api/v1/tasks", {
        method: "POST",
        body: JSON.stringify({}),
        headers: authHeaders,
      });
      const res = await postTasksHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe("BAD_REQUEST");
      expect(json.error.details.some((d: { field: string }) => d.field === "title")).toBe(true);
    });

    it("returns 400 on POST /api/v1/tasks with invalid priority", async () => {
      const req = new Request("http://localhost:3000/api/v1/tasks", {
        method: "POST",
        body: JSON.stringify({ title: "Valid title", priority: "critical_priority" }),
        headers: authHeaders,
      });
      const res = await postTasksHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.details.some((d: { field: string }) => d.field === "priority")).toBe(true);
    });

    it("returns 400 on PATCH /api/v1/tasks/[id] with invalid date format", async () => {
      const req = new Request("http://localhost:3000/api/v1/tasks/tsk_123", {
        method: "PATCH",
        body: JSON.stringify({ dueDate: "31-12-2026" }),
        headers: authHeaders,
      });
      const res = await patchTaskHandler(req, { params: Promise.resolve({ id: "tsk_123" }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.details.some((d: { field: string }) => d.field === "dueDate")).toBe(true);
    });

    it("returns 400 on PUT /api/v1/tasks/order with non-array taskIds", async () => {
      const req = new Request("http://localhost:3000/api/v1/tasks/order", {
        method: "PUT",
        body: JSON.stringify({ taskIds: "not-an-array" }),
        headers: authHeaders,
      });
      const res = await putTaskOrderHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe("BAD_REQUEST");
    });
  });

  describe("Notes Endpoints", () => {
    it("returns 401 when unauthenticated on GET /api/v1/notes", async () => {
      const req = new Request("http://localhost:3000/api/v1/notes");
      const res = await getNotesHandler(req);
      expect(res.status).toBe(401);
    });

    it("returns 401 when unauthenticated on GET /api/v1/notes/[id]", async () => {
      const req = new Request("http://localhost:3000/api/v1/notes/not_123");
      const res = await getNoteHandler(req, { params: Promise.resolve({ id: "not_123" }) });
      expect(res.status).toBe(401);
    });

    it("returns 401 when unauthenticated on DELETE /api/v1/notes/[id]", async () => {
      const req = new Request("http://localhost:3000/api/v1/notes/not_123", { method: "DELETE" });
      const res = await deleteNoteHandler(req, { params: Promise.resolve({ id: "not_123" }) });
      expect(res.status).toBe(401);
    });

    it("returns 400 on POST /api/v1/notes when title is missing", async () => {
      const req = new Request("http://localhost:3000/api/v1/notes", {
        method: "POST",
        body: JSON.stringify({ body: "<p>Note body</p>" }),
        headers: authHeaders,
      });
      const res = await postNotesHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe("BAD_REQUEST");
      expect(json.error.details.some((d: { field: string }) => d.field === "title")).toBe(true);
    });

    it("returns 400 on PATCH /api/v1/notes/[id] when title is empty string", async () => {
      const req = new Request("http://localhost:3000/api/v1/notes/not_123", {
        method: "PATCH",
        body: JSON.stringify({ title: "" }),
        headers: authHeaders,
      });
      const res = await patchNoteHandler(req, { params: Promise.resolve({ id: "not_123" }) });
      expect(res.status).toBe(400);
    });
  });

  describe("Follow-ups and Occurrences Endpoints", () => {
    it("returns 401 when unauthenticated on GET /api/v1/followups", async () => {
      const req = new Request("http://localhost:3000/api/v1/followups");
      const res = await getFollowUpsHandler(req);
      expect(res.status).toBe(401);
    });

    it("returns 401 when unauthenticated on GET /api/v1/followups/[id]", async () => {
      const req = new Request("http://localhost:3000/api/v1/followups/fol_1");
      const res = await getFollowUpHandler(req, { params: Promise.resolve({ id: "fol_1" }) });
      expect(res.status).toBe(401);
    });

    it("returns 401 when unauthenticated on DELETE /api/v1/followups/[id]", async () => {
      const req = new Request("http://localhost:3000/api/v1/followups/fol_1", { method: "DELETE" });
      const res = await deleteFollowUpHandler(req, { params: Promise.resolve({ id: "fol_1" }) });
      expect(res.status).toBe(401);
    });

    it("returns 401 when unauthenticated on GET /api/v1/followups/[id]/occurrences", async () => {
      const req = new Request("http://localhost:3000/api/v1/followups/fol_1/occurrences");
      const res = await getOccurrencesHandler(req, { params: Promise.resolve({ id: "fol_1" }) });
      expect(res.status).toBe(401);
    });

    it("returns 400 on POST /api/v1/followups with missing required fields", async () => {
      const req = new Request("http://localhost:3000/api/v1/followups", {
        method: "POST",
        body: JSON.stringify({ personName: "Alice" }),
        headers: authHeaders,
      });
      const res = await postFollowUpsHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.details.some((d: { field: string }) => d.field === "commitment")).toBe(true);
      expect(json.error.details.some((d: { field: string }) => d.field === "dueAt")).toBe(true);
    });

    it("returns 400 on POST /api/v1/followups with invalid recurrence frequency", async () => {
      const req = new Request("http://localhost:3000/api/v1/followups", {
        method: "POST",
        body: JSON.stringify({
          personName: "Bob",
          commitment: "Catch up",
          dueAt: "2026-10-30T10:00:00Z",
          recurrence: { frequency: "yearly" },
        }),
        headers: authHeaders,
      });
      const res = await postFollowUpsHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.details.some((d: { field: string }) => d.field === "recurrence")).toBe(true);
    });

    it("returns 400 on PATCH /api/v1/followups/[id] with invalid status", async () => {
      const req = new Request("http://localhost:3000/api/v1/followups/fol_1", {
        method: "PATCH",
        body: JSON.stringify({ status: "invalid_status" }),
        headers: authHeaders,
      });
      const res = await patchFollowUpHandler(req, { params: Promise.resolve({ id: "fol_1" }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.details.some((d: { field: string }) => d.field === "status")).toBe(true);
    });

    it("returns 400 on POST /api/v1/followups/[id]/occurrences with missing dueAt", async () => {
      const req = new Request("http://localhost:3000/api/v1/followups/fol_1/occurrences", {
        method: "POST",
        body: JSON.stringify({}),
        headers: authHeaders,
      });
      const res = await postOccurrencesHandler(req, { params: Promise.resolve({ id: "fol_1" }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.details.some((d: { field: string }) => d.field === "dueAt")).toBe(true);
    });
  });

  describe("Daily Plans Endpoints", () => {
    it("returns 401 when unauthenticated on GET /api/v1/plans", async () => {
      const req = new Request("http://localhost:3000/api/v1/plans");
      const res = await getPlansHandler(req);
      expect(res.status).toBe(401);
    });

    it("returns 400 on GET /api/v1/plans/[date] with invalid date format", async () => {
      const req = new Request("http://localhost:3000/api/v1/plans/2026-13-45", {
        headers: authHeaders,
      });
      const res = await getPlanDateHandler(req, { params: Promise.resolve({ date: "2026-13-45" }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe("BAD_REQUEST");
    });

    it("returns 400 on PUT /api/v1/plans with invalid availableMinutes or non-array items", async () => {
      const req = new Request("http://localhost:3000/api/v1/plans", {
        method: "PUT",
        body: JSON.stringify({
          planDate: "2026-10-25",
          availableMinutes: -10,
          items: "invalid",
        }),
        headers: authHeaders,
      });
      const res = await putPlansHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.details.some((d: { field: string }) => d.field === "availableMinutes")).toBe(true);
      expect(json.error.details.some((d: { field: string }) => d.field === "items")).toBe(true);
    });
  });

  describe("Inbox Endpoints", () => {
    it("returns 401 when unauthenticated on GET /api/v1/inbox", async () => {
      const req = new Request("http://localhost:3000/api/v1/inbox");
      const res = await getInboxHandler(req);
      expect(res.status).toBe(401);
    });

    it("returns 401 when unauthenticated on GET /api/v1/inbox/[id]", async () => {
      const req = new Request("http://localhost:3000/api/v1/inbox/inb_1");
      const res = await getInboxItemHandler(req, { params: Promise.resolve({ id: "inb_1" }) });
      expect(res.status).toBe(401);
    });

    it("returns 401 when unauthenticated on DELETE /api/v1/inbox/[id]", async () => {
      const req = new Request("http://localhost:3000/api/v1/inbox/inb_1", { method: "DELETE" });
      const res = await deleteInboxItemHandler(req, { params: Promise.resolve({ id: "inb_1" }) });
      expect(res.status).toBe(401);
    });

    it("returns 400 on POST /api/v1/inbox when text is missing", async () => {
      const req = new Request("http://localhost:3000/api/v1/inbox", {
        method: "POST",
        body: JSON.stringify({ sharedUrl: "https://example.com" }),
        headers: authHeaders,
      });
      const res = await postInboxHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.details.some((d: { field: string }) => d.field === "text")).toBe(true);
    });

    it("returns 400 on PATCH /api/v1/inbox/[id] with invalid targetType", async () => {
      const req = new Request("http://localhost:3000/api/v1/inbox/inb_1", {
        method: "PATCH",
        body: JSON.stringify({ targetType: "unsupported_type" }),
        headers: authHeaders,
      });
      const res = await patchInboxItemHandler(req, { params: Promise.resolve({ id: "inb_1" }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.details.some((d: { field: string }) => d.field === "targetType")).toBe(true);
    });
  });

  describe("Database Unavailable handling", () => {
    it("returns 503 DATABASE_UNAVAILABLE when database is unconfigured for authenticated requests", async () => {
      if (!process.env.DATABASE_URL) {
        const reqTasks = new Request("http://localhost:3000/api/v1/tasks", { headers: authHeaders });
        const resTasks = await getTasksHandler(reqTasks);
        expect(resTasks.status).toBe(503);
        const jsonTasks = await resTasks.json();
        expect(jsonTasks.error.code).toBe("DATABASE_UNAVAILABLE");

        const reqTaskOrder = new Request("http://localhost:3000/api/v1/tasks/order", { headers: authHeaders });
        const resTaskOrder = await getTaskOrderHandler(reqTaskOrder);
        expect(resTaskOrder.status).toBe(503);

        const reqNotes = new Request("http://localhost:3000/api/v1/notes", { headers: authHeaders });
        const resNotes = await getNotesHandler(reqNotes);
        expect(resNotes.status).toBe(503);

        const reqFollowUps = new Request("http://localhost:3000/api/v1/followups", { headers: authHeaders });
        const resFollowUps = await getFollowUpsHandler(reqFollowUps);
        expect(resFollowUps.status).toBe(503);

        const reqPlans = new Request("http://localhost:3000/api/v1/plans", { headers: authHeaders });
        const resPlans = await getPlansHandler(reqPlans);
        expect(resPlans.status).toBe(503);

        const reqInbox = new Request("http://localhost:3000/api/v1/inbox", { headers: authHeaders });
        const resInbox = await getInboxHandler(reqInbox);
        expect(resInbox.status).toBe(503);
      }
    });
  });
});
