/**
 * DTL Tools
 * Copyright (C) 2022 Ben Mather <bwhmather@bwhmather.com>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import * as duckdb from "@duckdb/duckdb-wasm";
import { DataType, Schema, Table, Vector } from "apache-arrow";

import { DTLManifest, fetchManifest } from "@dtl-tools/dtl-manifest";

let DUCKDB_MAIN_MODULE_URL: string | undefined;
let DUCKDB_MAIN_WORKER_URL: string | undefined;

function assert(expr: unknown): asserts expr {
  if (!expr) throw new Error("assertion failed");
}

export class DTLSession {
  #manifestUrl: string;
  #arrayUrl: string;

  #manifest: DTLManifest | undefined;
  #db: duckdb.AsyncDuckDB | undefined;

  /**
   * @private
   */
  constructor(manifestUrl: string, arrayUrl: string) {
    this.#manifestUrl = manifestUrl;
    this.#arrayUrl = arrayUrl;

    this.#manifest = undefined;
    this.#db = undefined;
  }

  /**
   * @private
   */
  async initialise() {
    assert(typeof DUCKDB_MAIN_WORKER_URL !== "undefined");
    assert(typeof DUCKDB_MAIN_MODULE_URL !== "undefined");

    this.#manifest = await fetchManifest(this.#manifestUrl);

    // === Initialise DuckDB ===
    const worker = new Worker(DUCKDB_MAIN_WORKER_URL);
    const logger = new duckdb.ConsoleLogger();
    this.#db = new duckdb.AsyncDuckDB(logger, worker);
    await this.#db.instantiate(DUCKDB_MAIN_MODULE_URL);

    // === Register all referenced arrays with DuckDB ===
    let arrays = new Set();

    // Find arrays referenced by snapshots.
    for (let snapshot of this.#manifest.snapshots()) {
      for (let column of snapshot.columns) {
        arrays.add(column.array);
      }
    }

    // Find arrays referenced by mappings.
    for (let mapping of this.#manifest.mappings()) {
      arrays.add(mapping.sourceArray);
      arrays.add(mapping.targetArray);
      arrays.add(mapping.sourceIndexArray);
      arrays.add(mapping.targetIndexArray);
    }
    let array;
    for (array of arrays) {
      const url = new URL(
        `${this.#arrayUrl.replace(/\/*$/, "")}/${array}.parquet`,
        "" + document.location
      ).href;
      await this.#db.registerFileURL(`${array}.parquet`, url, duckdb.DuckDBDataProtocol.HTTP, false);
    }
  }

  async readArraySchema(array: string): Promise<Schema> {
    assert(typeof this.#manifest !== "undefined");
    assert(typeof this.#db !== "undefined");

    let query = "";
    query += `SELECT\n`;
    query += `    values\n`;
    query += `FROM\n`;
    query += `    '${array}.parquet'\n`;
    query += `LIMIT 0`;

    // Execute the query.
    const conn = await this.#db.connect();
    try {
      const table = await conn.query(query);
      return table.schema;
    } finally {
      await conn.close();
    }
  }

  async readArrayData(
    array: string,
    options?: { offset?: number; limit?: number }
  ): Promise<Vector> {
    assert(typeof this.#manifest !== "undefined");
    assert(typeof this.#db !== "undefined");

    let offset;
    let limit;
    if (typeof options != "undefined") {
      ({ offset, limit } = options);
    }

    let query = "";
    query += `SELECT\n`;
    query += `    values\n`;
    query += `FROM\n`;
    query += `    '${array}.parquet'\n`;

    // Add offset clause.
    if (typeof offset != "undefined") {
      query += `OFFSET ${offset}\n`;
    }

    // Add limit clause.
    if (typeof limit != "undefined") {
      query += `LIMIT ${limit}\n`;
    }

    // Execute the query.
    const conn = await this.#db.connect();
    try {
      const table = await conn.query(query);
      const column = table.getChild("values");
      if (column === null) {
        throw new Error();
      }
      return column;
    } finally {
      await conn.close();
    }
  }

  /**
   * Returns an `arrow.Schema` object describing the format of the requested
   * snapshot.
   */
  async readSnapshotSchema(id: number): Promise<Schema> {
    assert(typeof this.#manifest !== "undefined");
    assert(typeof this.#db !== "undefined");

    const snapshot = this.#manifest.snapshotById(id);
    const columns = Array.from(snapshot.columns);

    const fields = [];
    for (const column of columns) {
      const arraySchema = await this.readArraySchema(column.array);
      const arrayField = arraySchema.fields[0];
      const columnField = arrayField.clone({ name: column.name });
      fields.push(columnField);
    }

    const schema = new Schema(fields);
    return schema;
  }

  async readSnapshotLength(id: number): Promise<Table> {
    assert(typeof this.#manifest !== "undefined");
    assert(typeof this.#db !== "undefined");

    const snapshot = this.#manifest.snapshotById(id);
    const columns = Array.from(snapshot.columns);

    let query = "SELECT\n";

    query += "    COUNT(*)\n";

    query += "FROM\n";
    query += `    '${columns[0].array}.parquet'\n`;

    // Execute the query.
    const conn = await this.#db.connect();
    try {
      return await conn.query(query);
    } finally {
      await conn.close();
    }
  }

  /**
   * Returns an `arrow.Table` of data from the requested snapshot.
   *
   * The schema should match the result from `readSnapshotSchema`.
   */
  async readSnapshotData(
    id: number,
    options?: { offset?: number; limit?: number }
  ): Promise<Table> {
    assert(typeof this.#manifest !== "undefined");
    assert(typeof this.#db !== "undefined");

    const snapshot = this.#manifest.snapshotById(id);
    const columns = Array.from(snapshot.columns);

    const tableColumns = {};
    for (const column of columns) {
      tableColumns[column.name] = await this.readArrayData(
        column.array,
        options
      );
    }
    const table = new Table(tableColumns);
    return table;
  }
}

export function configure({
  duckDbMainModuleUrl,
  duckDbMainWorkerUrl,
}: {
  duckDbMainModuleUrl: string;
  duckDbMainWorkerUrl: string;
}) {
  DUCKDB_MAIN_MODULE_URL = duckDbMainModuleUrl;
  DUCKDB_MAIN_WORKER_URL = duckDbMainWorkerUrl;
}

export async function createSession(
  manifestUrl: string,
  arrayUrl: string
): Promise<DTLSession> {
  const session = new DTLSession(manifestUrl, arrayUrl);
  await session.initialise();
  return session;
}
