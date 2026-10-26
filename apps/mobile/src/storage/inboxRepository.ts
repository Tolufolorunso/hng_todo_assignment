import type { SqliteDatabase } from "../db/driver.js";
import type {
  InboxCapture,
  InboxCaptureState,
  InboxResultEntityType,
  CreateInboxCaptureInput,
} from "../types/inbox.js";

interface InboxCaptureRow {
  id: string;
  text: string;
  shared_url: string | null;
  source_app_label: string | null;
  captured_at: string;
  state: string;
  result_entity_type: string | null;
  result_entity_id: string | null;
  processed_at: string | null;
}

function mapRowToCapture(row: InboxCaptureRow): InboxCapture {
  return {
    id: row.id,
    text: row.text,
    sharedUrl: row.shared_url,
    sourceAppLabel: row.source_app_label,
    capturedAt: row.captured_at,
    state: (row.state as InboxCaptureState) || "pending",
    resultEntityType: (row.result_entity_type as InboxResultEntityType) || null,
    resultEntityId: row.result_entity_id,
    processedAt: row.processed_at,
  };
}

export class InboxRepository {
  constructor(private db: SqliteDatabase) {}

  async create(input: CreateInboxCaptureInput): Promise<InboxCapture> {
    const text = input.text?.trim();
    if (!text) {
      throw new Error("Capture text is required");
    }

    const id = "inbox_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    const capturedAt = new Date().toISOString();

    await this.db.execute(
      `INSERT INTO inbox_captures (
        id, text, shared_url, source_app_label, captured_at, state, result_entity_type, result_entity_id, processed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        text,
        input.sharedUrl || null,
        input.sourceAppLabel || null,
        capturedAt,
        "pending",
        null,
        null,
        null,
      ]
    );

    return {
      id,
      text,
      sharedUrl: input.sharedUrl || null,
      sourceAppLabel: input.sourceAppLabel || null,
      capturedAt,
      state: "pending",
      resultEntityType: null,
      resultEntityId: null,
      processedAt: null,
    };
  }

  async getById(id: string): Promise<InboxCapture | null> {
    const row = await this.db.queryFirst<InboxCaptureRow>(
      "SELECT * FROM inbox_captures WHERE id = ?",
      [id]
    );
    return row ? mapRowToCapture(row) : null;
  }

  async list(filter?: { state?: InboxCaptureState }): Promise<InboxCapture[]> {
    const rows = await this.db.query<InboxCaptureRow>(
      "SELECT * FROM inbox_captures ORDER BY captured_at DESC"
    );
    let items = rows.map(mapRowToCapture);
    if (filter?.state) {
      items = items.filter((i) => i.state === filter.state);
    }
    return items;
  }

  async markProcessed(
    id: string,
    resultEntityType: InboxResultEntityType,
    resultEntityId: string
  ): Promise<InboxCapture> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`InboxCapture ${id} not found`);
    }

    const processedAt = new Date().toISOString();
    await this.db.execute(
      `UPDATE inbox_captures
       SET state = 'processed', result_entity_type = ?, result_entity_id = ?, processed_at = ?
       WHERE id = ?`,
      [resultEntityType, resultEntityId, processedAt, id]
    );

    return {
      ...existing,
      state: "processed",
      resultEntityType,
      resultEntityId,
      processedAt,
    };
  }

  async discard(id: string): Promise<InboxCapture> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`InboxCapture ${id} not found`);
    }

    const processedAt = new Date().toISOString();
    await this.db.execute(
      "UPDATE inbox_captures SET state = 'discarded', processed_at = ? WHERE id = ?",
      [processedAt, id]
    );

    return {
      ...existing,
      state: "discarded",
      processedAt,
    };
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.getById(id);
    if (!existing) return false;

    await this.db.execute("DELETE FROM inbox_captures WHERE id = ?", [id]);
    return true;
  }
}
