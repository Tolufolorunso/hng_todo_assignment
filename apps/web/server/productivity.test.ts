import { describe, it, expect } from "vitest";
import {
  validateRecurrenceRule,
  createTask,
  getTask,
  listTasks,
  updateTask,
  deleteTask,
  createNote,
  getNote,
  listNotes,
  updateNote,
  deleteNote,
  createFollowUp,
  getFollowUp,
  listFollowUps,
  updateFollowUp,
  deleteFollowUp,
  recordOccurrence,
  listOccurrences,
  upsertDailyPlan,
  getDailyPlanByDate,
  listDailyPlans,
  createInboxCapture,
  getInboxCapture,
  listInboxCaptures,
  updateInboxCapture,
  deleteInboxCapture,
  getTaskOrder,
  setTaskOrder,
} from "./productivity";
import { loadMigrationFiles } from "./db/migrate";

describe("Productivity Persistence Engine (server/productivity.ts)", () => {
  describe("Recurrence Rule Validation", () => {
    it("accepts null or undefined recurrence rule", () => {
      expect(validateRecurrenceRule(null)).toBeNull();
      expect(validateRecurrenceRule(undefined)).toBeNull();
    });

    it("accepts valid daily, weekly, monthly, and customDays rules", () => {
      expect(validateRecurrenceRule({ frequency: "daily", interval: 1 })).toBeNull();
      expect(
        validateRecurrenceRule({
          frequency: "weekly",
          interval: 2,
          weekdays: [1, 3, 5],
        })
      ).toBeNull();
      expect(validateRecurrenceRule({ frequency: "monthly", interval: 1 })).toBeNull();
      expect(validateRecurrenceRule({ frequency: "customDays", interval: 14 })).toBeNull();
    });

    it("rejects invalid frequency", () => {
      expect(validateRecurrenceRule({ frequency: "yearly" })).toContain("Recurrence frequency must be one of");
    });

    it("rejects non-positive interval", () => {
      expect(validateRecurrenceRule({ frequency: "daily", interval: 0 })).toContain("positive integer");
      expect(validateRecurrenceRule({ frequency: "daily", interval: -1 })).toContain("positive integer");
      expect(validateRecurrenceRule({ frequency: "daily", interval: 1.5 })).toContain("positive integer");
    });

    it("rejects invalid weekdays", () => {
      expect(
        validateRecurrenceRule({
          frequency: "weekly",
          weekdays: [7], // 0-6 allowed
        })
      ).toContain("between 0 and 6");
      expect(
        validateRecurrenceRule({
          frequency: "weekly",
          weekdays: "not-an-array" as never,
        })
      ).toContain("array of integers");
    });
  });

  describe("Schema Migration 003 (003_task_orders.sql)", () => {
    it("parses 003_task_orders.sql as valid migration", () => {
      const migrations = loadMigrationFiles();
      const m003 = migrations.find((m) => m.version === 3);

      expect(m003).toBeDefined();
      expect(m003?.name).toBe("task_orders");
      expect(m003?.sql).toContain("CREATE TABLE IF NOT EXISTS task_orders");
      expect(m003?.sql).toContain("task_ids_json JSONB");
      expect(m003?.sql).toContain("revision BIGINT NOT NULL DEFAULT 1");
    });
  });

  describe("Offline / Unconfigured Database Resilience", () => {
    it("throws DATABASE_UNAVAILABLE across all repository operations when unconfigured", async () => {
      if (!process.env.DATABASE_URL) {
        const acc = "acc_test_offline";

        // Tasks
        await expect(createTask(acc, { title: "Test" })).rejects.toThrow("DATABASE_UNAVAILABLE");
        await expect(getTask(acc, "tsk_1")).rejects.toThrow("DATABASE_UNAVAILABLE");
        await expect(listTasks(acc)).rejects.toThrow("DATABASE_UNAVAILABLE");
        await expect(updateTask(acc, "tsk_1", { title: "New" })).rejects.toThrow("DATABASE_UNAVAILABLE");
        await expect(deleteTask(acc, "tsk_1")).rejects.toThrow("DATABASE_UNAVAILABLE");

        // Notes
        await expect(createNote(acc, { title: "Note" })).rejects.toThrow("DATABASE_UNAVAILABLE");
        await expect(getNote(acc, "not_1")).rejects.toThrow("DATABASE_UNAVAILABLE");
        await expect(listNotes(acc)).rejects.toThrow("DATABASE_UNAVAILABLE");
        await expect(updateNote(acc, "not_1", { title: "New" })).rejects.toThrow("DATABASE_UNAVAILABLE");
        await expect(deleteNote(acc, "not_1")).rejects.toThrow("DATABASE_UNAVAILABLE");

        // Follow-ups
        await expect(
          createFollowUp(acc, { personName: "Alex", commitment: "Talk", dueAt: "2026-10-30T10:00:00Z" })
        ).rejects.toThrow("DATABASE_UNAVAILABLE");
        await expect(getFollowUp(acc, "fol_1")).rejects.toThrow("DATABASE_UNAVAILABLE");
        await expect(listFollowUps(acc)).rejects.toThrow("DATABASE_UNAVAILABLE");
        await expect(updateFollowUp(acc, "fol_1", { commitment: "New" })).rejects.toThrow("DATABASE_UNAVAILABLE");
        await expect(deleteFollowUp(acc, "fol_1")).rejects.toThrow("DATABASE_UNAVAILABLE");
        await expect(recordOccurrence(acc, "fol_1", "2026-10-30T10:00:00Z")).rejects.toThrow("DATABASE_UNAVAILABLE");
        await expect(listOccurrences(acc)).rejects.toThrow("DATABASE_UNAVAILABLE");

        // Daily Plans
        await expect(
          upsertDailyPlan(acc, { planDate: "2026-10-30", availableMinutes: 120, items: [] })
        ).rejects.toThrow("DATABASE_UNAVAILABLE");
        await expect(getDailyPlanByDate(acc, "2026-10-30")).rejects.toThrow("DATABASE_UNAVAILABLE");
        await expect(listDailyPlans(acc)).rejects.toThrow("DATABASE_UNAVAILABLE");

        // Inbox
        await expect(createInboxCapture(acc, { text: "Quick capture" })).rejects.toThrow("DATABASE_UNAVAILABLE");
        await expect(getInboxCapture(acc, "inb_1")).rejects.toThrow("DATABASE_UNAVAILABLE");
        await expect(listInboxCaptures(acc)).rejects.toThrow("DATABASE_UNAVAILABLE");
        await expect(updateInboxCapture(acc, "inb_1", { state: "processed" })).rejects.toThrow("DATABASE_UNAVAILABLE");
        await expect(deleteInboxCapture(acc, "inb_1")).rejects.toThrow("DATABASE_UNAVAILABLE");

        // Task Orders
        await expect(getTaskOrder(acc)).rejects.toThrow("DATABASE_UNAVAILABLE");
        await expect(setTaskOrder(acc, ["tsk_1"])).rejects.toThrow("DATABASE_UNAVAILABLE");
      }
    });
  });
});
