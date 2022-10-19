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

import { DTLManifest, fetchManifest } from "@dtl-tools/dtl-manifest";

let DUCKDB_MAIN_MODULE_URL;
let DUCKDB_MAIN_WORKER_URL;

export class DTLSession {
  #manifestUrl: string;
  #arrayUrl: string;

  #manifest: DTLManifest;
  #db: duckdb.AsyncDuckDB;

  /**
   * @private
   */
  constructor(manifestUrl: string, arrayUrl: string) {
    this.#manifestUrl = manifestUrl;
    this.#arrayUrl = arrayUrl;

    this.#manifest = null;
    this.#db = null;
  }

  /**
   * @private
   */
  async initialise() {
    this.#manifest = await fetchManifest(this.#manifestUrl);

    // === Initialise DuckDB ===
    const worker = new Worker(DUCKDB_MAIN_MODULE_URL);
    const logger = new duckdb.ConsoleLogger();
    this.#db = new duckdb.AsyncDuckDB(logger, worker);
    await this.#db.instantiate(DUCKDB_MAIN_WORKER_URL);

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
        `${this.#arrayUrl}/${array}.parquet`,
        "" + document.location
      ).href;
      await this.#db.registerFileURL(`${array}.parquet`, url);
    }
  }

  /**
   * Returns an `arrow.Schema` object describing the format of the requested
   * snapshot.
   */
  async readSnapshotSchema(id) {
    const snapshot = this.#manifest.snapshotById(id);

    let query = "DESCRIBE SELECT\n";

    // Add column bindings.
    for (const column of snapshot.columns) {
      query += `    ${column.name}.values as ${column.name},\n`;
    }

    // Add source clauses.
    query += "FROM\n";

    for (const column of snapshot.columns) {
      query += `    '${column.array}.parquet' ${column.name},\n`;
    }

    // Execute the query.
    const conn = await this.#db.connect();
    try {
      return await conn.query(query);
    } finally {
      await conn.close();
    }
  }

  async readSnapshotLength(id) {
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
  ) {
    let offset;
    let limit;
    if (typeof options != "undefined") {
      ({ offset, limit } = options);
    }

    const snapshot = this.#manifest.snapshotById(id);
    const columns = Array.from(snapshot.columns);

    let query = "SELECT\n";

    // Add column bindings.
    for (const column of columns) {
      query += `    ${column.name}.values as ${column.name},\n`;
    }

    // Add source clauses.
    query += `FROM (\n`;
    query += `    SELECT\n`;
    query += `        row_number() OVER () AS rownum,\n`;
    query += `        values\n`;
    query += `    FROM parquet_scan(\n`;
    query += `        '${columns[0].array}.parquet'\n`;
    query += `    )\n`;
    query += `) AS ${columns[0].name}\n`;

    // Add join clauses.
    for (const column of columns.slice(1)) {
      query += "JOIN (\n";
      query += `    SELECT\n`;
      query += `        row_number() OVER () AS rownum,\n`;
      query += `        values\n`;
      query += `    FROM parquet_scan(\n`;
      query += `        '${column.array}.parquet'\n`;
      query += `    )\n`;
      query += `) AS ${column.name}\n`;
      query += `    USING (rownum)\n`;
    }

    // Add order by clause.
    //  query += "ORDER BY\n";
    //query += `    ${columns[0].name}.rowid\n`;

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
      return await conn.query(query);
    } finally {
      await conn.close();
    }
  }
}

export function configure({ duckDbMainModuleUrl, duckDbMainWorkerUrl }) {
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
