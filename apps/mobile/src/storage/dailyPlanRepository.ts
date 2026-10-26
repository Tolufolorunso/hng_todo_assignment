import type { SqliteDatabase } from "../db/driver.js";
import type {
  DailyPlan,
  DailyPlanItem,
  CreateDailyPlanInput,
  UpdateDailyPlanInput,
} from "../types/plan.js";

interface DailyPlanRow {
  id: string;
  local_date: string;
  time_zone: string;
  available_minutes: number;
  items: string;
  accepted_at: string | null;
  updated_at: string;
}

function mapRowToDailyPlan(row: DailyPlanRow): DailyPlan {
  let items: DailyPlanItem[] = [];
  try {
    items = JSON.parse(row.items || "[]");
  } catch {
    items = [];
  }

  return {
    id: row.id,
    localDate: row.local_date,
    timeZone: row.time_zone || "UTC",
    availableMinutes: Number(row.available_minutes) || 480,
    items,
    acceptedAt: row.accepted_at,
    updatedAt: row.updated_at,
  };
}

export class DailyPlanRepository {
  constructor(private db: SqliteDatabase) {}

  async getByDate(localDate: string): Promise<DailyPlan | null> {
    const row = await this.db.queryFirst<DailyPlanRow>(
      "SELECT * FROM daily_plans WHERE local_date = ?",
      [localDate]
    );
    return row ? mapRowToDailyPlan(row) : null;
  }

  async getById(id: string): Promise<DailyPlan | null> {
    const row = await this.db.queryFirst<DailyPlanRow>(
      "SELECT * FROM daily_plans WHERE id = ?",
      [id]
    );
    return row ? mapRowToDailyPlan(row) : null;
  }

  async save(input: CreateDailyPlanInput): Promise<DailyPlan> {
    if (!input.localDate) {
      throw new Error("localDate is required");
    }
    const existing = await this.getByDate(input.localDate);
    const now = new Date().toISOString();
    const itemsJson = JSON.stringify(input.items || []);

    if (existing) {
      await this.db.execute(
        `UPDATE daily_plans
         SET time_zone = ?, available_minutes = ?, items = ?, accepted_at = ?, updated_at = ?
         WHERE id = ?`,
        [
          input.timeZone || existing.timeZone,
          input.availableMinutes ?? existing.availableMinutes,
          itemsJson,
          input.acceptedAt !== undefined ? input.acceptedAt : existing.acceptedAt,
          now,
          existing.id,
        ]
      );
      return {
        id: existing.id,
        localDate: existing.localDate,
        timeZone: input.timeZone || existing.timeZone,
        availableMinutes: input.availableMinutes ?? existing.availableMinutes,
        items: input.items || [],
        acceptedAt: input.acceptedAt !== undefined ? input.acceptedAt : existing.acceptedAt,
        updatedAt: now,
      };
    }

    const id = "plan_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    await this.db.execute(
      `INSERT INTO daily_plans (id, local_date, time_zone, available_minutes, items, accepted_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.localDate,
        input.timeZone || "UTC",
        input.availableMinutes ?? 480,
        itemsJson,
        input.acceptedAt || null,
        now,
      ]
    );

    return {
      id,
      localDate: input.localDate,
      timeZone: input.timeZone || "UTC",
      availableMinutes: input.availableMinutes ?? 480,
      items: input.items || [],
      acceptedAt: input.acceptedAt || null,
      updatedAt: now,
    };
  }

  async update(id: string, input: UpdateDailyPlanInput): Promise<DailyPlan> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`DailyPlan ${id} not found`);
    }

    const now = new Date().toISOString();
    const availableMinutes = input.availableMinutes !== undefined ? input.availableMinutes : existing.availableMinutes;
    const items = input.items !== undefined ? input.items : existing.items;
    const acceptedAt = input.acceptedAt !== undefined ? input.acceptedAt : existing.acceptedAt;

    await this.db.execute(
      `UPDATE daily_plans
       SET available_minutes = ?, items = ?, accepted_at = ?, updated_at = ?
       WHERE id = ?`,
      [availableMinutes, JSON.stringify(items), acceptedAt, now, id]
    );

    return {
      ...existing,
      availableMinutes,
      items,
      acceptedAt,
      updatedAt: now,
    };
  }

  async toggleItem(planId: string, itemId: string): Promise<DailyPlan> {
    const existing = await this.getById(planId);
    if (!existing) {
      throw new Error(`DailyPlan ${planId} not found`);
    }

    const updatedItems = existing.items.map((item) => {
      if (item.id === itemId) {
        return { ...item, completed: !item.completed };
      }
      return item;
    });

    return this.update(planId, { items: updatedItems });
  }

  async acceptPlan(id: string): Promise<DailyPlan> {
    const now = new Date().toISOString();
    return this.update(id, { acceptedAt: now });
  }

  async listRecent(limit = 14): Promise<DailyPlan[]> {
    const rows = await this.db.query<DailyPlanRow>(
      "SELECT * FROM daily_plans ORDER BY local_date DESC LIMIT " + limit
    );
    return rows.map(mapRowToDailyPlan);
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.getById(id);
    if (!existing) return false;

    await this.db.execute("DELETE FROM daily_plans WHERE id = ?", [id]);
    return true;
  }
}
