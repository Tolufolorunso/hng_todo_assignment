export interface SqliteDatabase {
  execute(sql: string, params?: unknown[]): Promise<void>;
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  queryFirst<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | null>;
  transaction<T>(action: (tx: SqliteDatabase) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export interface RowData {
  [key: string]: unknown;
}

export class InMemorySqliteDatabase implements SqliteDatabase {
  private tables: Map<string, Map<string, RowData>> = new Map();
  private inTransaction = false;

  async execute(sql: string, params: unknown[] = []): Promise<void> {
    const trimmed = sql.trim();
    const upper = trimmed.toUpperCase();

    if (upper.startsWith("CREATE TABLE")) {
      this.handleCreateTable(trimmed);
      return;
    }

    if (upper.startsWith("CREATE INDEX") || upper.startsWith("DROP INDEX")) {
      // Indexes are no-ops in memory map implementation
      return;
    }

    if (upper.startsWith("INSERT INTO")) {
      this.handleInsert(trimmed, params);
      return;
    }

    if (upper.startsWith("UPDATE")) {
      this.handleUpdate(trimmed, params);
      return;
    }

    if (upper.startsWith("DELETE FROM")) {
      this.handleDelete(trimmed, params);
      return;
    }

    // Default no-op for generic statements
  }

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    const trimmed = sql.trim();
    const upper = trimmed.toUpperCase();

    if (upper.startsWith("SELECT")) {
      return this.handleSelect<T>(trimmed, params);
    }

    return [];
  }

  async queryFirst<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | null> {
    const results = await this.query<T>(sql, params);
    return results.length > 0 ? results[0] : null;
  }

  async transaction<T>(action: (tx: SqliteDatabase) => Promise<T>): Promise<T> {
    // Snapshot state for rollback
    const snapshot = new Map<string, Map<string, RowData>>();
    for (const [tName, tRows] of this.tables.entries()) {
      const copyRows = new Map<string, RowData>();
      for (const [k, v] of tRows.entries()) {
        copyRows.set(k, { ...v });
      }
      snapshot.set(tName, copyRows);
    }

    this.inTransaction = true;
    try {
      const result = await action(this);
      this.inTransaction = false;
      return result;
    } catch (err) {
      this.tables = snapshot;
      this.inTransaction = false;
      throw err;
    }
  }

  async close(): Promise<void> {
    this.tables.clear();
  }

  private handleCreateTable(sql: string): void {
    const match = sql.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)/i);
    if (!match) return;
    const tableName = match[1].toLowerCase();
    if (!this.tables.has(tableName)) {
      this.tables.set(tableName, new Map());
    }
  }

  private handleInsert(sql: string, params: unknown[]): void {
    const match = sql.match(/INSERT\s+(?:OR\s+REPLACE\s+)?INTO\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
    if (!match) {
      throw new Error(`Unsupported INSERT syntax: ${sql}`);
    }

    const tableName = match[1].toLowerCase();
    const columns = match[2].split(",").map((c) => c.trim().toLowerCase());
    const table = this.tables.get(tableName);
    if (!table) {
      throw new Error(`Table ${tableName} does not exist`);
    }

    const row: RowData = {};
    columns.forEach((col, idx) => {
      row[col] = params[idx] !== undefined ? params[idx] : null;
    });

    // Primary key is 'id' or first column
    const pkCol = columns.includes("id") ? "id" : columns[0];
    const pkValue = String(row[pkCol] || Math.random().toString(36).substring(2));
    table.set(pkValue, row);
  }

  private handleUpdate(sql: string, params: unknown[]): void {
    const match = sql.match(/UPDATE\s+([a-zA-Z0-9_]+)\s+SET\s+(.+?)(?:\s+WHERE\s+(.+))?$/i);
    if (!match) {
      throw new Error(`Unsupported UPDATE syntax: ${sql}`);
    }

    const tableName = match[1].toLowerCase();
    const setClause = match[2];
    const whereClause = match[3];

    const table = this.tables.get(tableName);
    if (!table) return;

    const setPairs = setClause.split(",").map((p) => p.trim());
    const numSetParams = setPairs.length;
    const setParams = params.slice(0, numSetParams);
    const whereParams = params.slice(numSetParams);

    for (const [pk, row] of table.entries()) {
      if (this.evalWhere(row, whereClause, whereParams)) {
        setPairs.forEach((pair, idx) => {
          const col = pair.split("=")[0].trim().toLowerCase();
          row[col] = setParams[idx];
        });
        table.set(pk, row);
      }
    }
  }

  private handleDelete(sql: string, params: unknown[]): void {
    const match = sql.match(/DELETE\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+(.+))?$/i);
    if (!match) {
      throw new Error(`Unsupported DELETE syntax: ${sql}`);
    }

    const tableName = match[1].toLowerCase();
    const whereClause = match[2];
    const table = this.tables.get(tableName);
    if (!table) return;

    if (!whereClause) {
      table.clear();
      return;
    }

    for (const [pk, row] of Array.from(table.entries())) {
      if (this.evalWhere(row, whereClause, params)) {
        table.delete(pk);
      }
    }
  }

  private handleSelect<T>(sql: string, params: unknown[]): T[] {
    const match = sql.match(/SELECT\s+(.+?)\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+(.+?))?(?:\s+LIMIT\s+(\d+))?$/i);
    if (!match) {
      // Simple count support e.g. SELECT COUNT(*) as count FROM table
      const countMatch = sql.match(/SELECT\s+COUNT\(\*\)\s+AS\s+([a-zA-Z0-9_]+)\s+FROM\s+([a-zA-Z0-9_]+)/i);
      if (countMatch) {
        const alias = countMatch[1];
        const tableName = countMatch[2].toLowerCase();
        const table = this.tables.get(tableName);
        const count = table ? table.size : 0;
        return [{ [alias]: count }] as unknown as T[];
      }
      return [];
    }

    const columnsStr = match[1].trim();
    const tableName = match[2].toLowerCase();
    const whereClause = match[3];
    const orderClause = match[4];
    const limit = match[5] ? parseInt(match[5], 10) : undefined;

    const table = this.tables.get(tableName);
    if (!table) return [];

    let rows: RowData[] = Array.from(table.values());

    if (whereClause) {
      rows = rows.filter((r) => this.evalWhere(r, whereClause, params));
    }

    if (orderClause) {
      const [orderCol, orderDir] = orderClause.split(/\s+/);
      const isDesc = orderDir && orderDir.toUpperCase() === "DESC";
      const col = orderCol.toLowerCase();
      rows.sort((a, b) => {
        const valA = a[col] as string | number | null;
        const valB = b[col] as string | number | null;
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        if (valA < valB) return isDesc ? 1 : -1;
        return isDesc ? -1 : 1;
      });
    }

    if (limit !== undefined) {
      rows = rows.slice(0, limit);
    }

    if (columnsStr === "*") {
      return rows.map((r) => ({ ...r })) as unknown as T[];
    }

    const maxMatch = columnsStr.match(/MAX\(([a-zA-Z0-9_]+)\)\s+AS\s+([a-zA-Z0-9_]+)/i);
    if (maxMatch) {
      const targetCol = maxMatch[1].toLowerCase();
      const alias = maxMatch[2];
      let maxVal: number | null = null;
      for (const r of rows) {
        const val = Number(r[targetCol]);
        if (!isNaN(val)) {
          if (maxVal === null || val > maxVal) {
            maxVal = val;
          }
        }
      }
      return [{ [alias]: maxVal }] as unknown as T[];
    }

    const selectedCols = columnsStr.split(",").map((c) => {
      const aliasMatch = c.trim().match(/([a-zA-Z0-9_]+)\s+AS\s+([a-zA-Z0-9_]+)/i);
      if (aliasMatch) {
        return { col: aliasMatch[1].toLowerCase(), alias: aliasMatch[2] };
      }
      const raw = c.trim().toLowerCase();
      return { col: raw, alias: raw };
    });

    return rows.map((r) => {
      const projected: RowData = {};
      selectedCols.forEach(({ col, alias }) => {
        projected[alias] = r[col] !== undefined ? r[col] : null;
      });
      return projected;
    }) as unknown as T[];
  }

  private evalWhere(row: RowData, whereClause?: string, params: unknown[] = []): boolean {
    if (!whereClause) return true;

    // Handle simple WHERE id = ?
    if (/^[a-zA-Z0-9_]+\s*=\s*\?$/i.test(whereClause.trim())) {
      const col = whereClause.split("=")[0].trim().toLowerCase();
      return row[col] === params[0];
    }

    // Handle WHERE col = ? AND col2 = ?
    const conditions = whereClause.split(/\s+AND\s+/i);
    let paramIndex = 0;

    for (const cond of conditions) {
      const trimmedCond = cond.trim();

      if (trimmedCond.includes("=")) {
        const [colPart] = trimmedCond.split("=");
        const col = colPart.trim().toLowerCase();
        const expected = params[paramIndex++];
        if (row[col] !== expected) return false;
      } else if (trimmedCond.toUpperCase().includes("IS NULL")) {
        const col = trimmedCond.replace(/IS\s+NULL/i, "").trim().toLowerCase();
        if (row[col] !== null && row[col] !== undefined) return false;
      } else if (trimmedCond.toUpperCase().includes("IS NOT NULL")) {
        const col = trimmedCond.replace(/IS\s+NOT\s+NULL/i, "").trim().toLowerCase();
        if (row[col] === null || row[col] === undefined) return false;
      } else if (trimmedCond.toUpperCase().includes("LIKE")) {
        const [colPart] = trimmedCond.split(/LIKE/i);
        const col = colPart.trim().toLowerCase();
        const pattern = String(params[paramIndex++] || "").replace(/%/g, ".*");
        const regex = new RegExp(`^${pattern}$`, "i");
        const val = String(row[col] || "");
        if (!regex.test(val)) return false;
      }
    }

    return true;
  }
}

export function createDatabase(type: "memory" | "native" = "memory"): SqliteDatabase {
  if (type === "memory") {
    return new InMemorySqliteDatabase();
  }
  // Native fallback driver can be injected in React Native runtime
  return new InMemorySqliteDatabase();
}
