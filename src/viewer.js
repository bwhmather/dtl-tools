import { h, clobber } from "bdc";
import mainModuleUrl from "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm";
import mainWorkerUrl from "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js";
import * as duckdb from "@duckdb/duckdb-wasm";

import { fetchManifest } from "./manifest.js";

class DTLSession {
  #manifestUrl;
  #arrayUrl;

  #manifest;
  #db;

  /**
   * @private
   */
  constructor(manifestUrl, arrayUrl) {
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
    const worker = new Worker(mainWorkerUrl);
    const logger = new duckdb.ConsoleLogger();
    this.#db = new duckdb.AsyncDuckDB(logger, worker);
    await this.#db.instantiate(mainModuleUrl);

    // === Register all referenced arrays with DuckDB ===
    let arrays = new Set();

    // Find arrays referenced by snapshots.
    for (let snapshot of this.#manifest.snapshots()) {
      for (let column of snapshot.columns()) {
        arrays.add(column.array);
      }
    }

    // Find arrays referenced by mappings.
    for (let mapping of this.#manifest.mappings()) {
      arrays.add(mapping.srcArray);
      arrays.add(mapping.tgtArray);
      arrays.add(mapping.srcIndexArray);
      arrays.add(mapping.tgtIndexArray);
    }
    let array;
    for (array of arrays) {
      const url = new URL(
        `${this.#arrayUrl}/${array}.parquet`,
        document.location
      ).href;
      await this.#db.registerFileURL(`${array}.parquet`, url);
    }
  }

  /**
   * Returns an `arrow.Schema` object describing the format of the requested
   * snapshot.
   */
  async readSnapshotSchema(id) {
    let query = "DESCRIBE SELECT\n";

    // Add column bindings.
    for (column of columns) {
      query += `    ${column.name}.values as ${column.name},\n`;
    }

    // Add source clauses.
    query += "FROM\n";

    for (column of columns) {
      query += `    '${column.array}.parquet' ${column.name},\n`;
    }

    // Execute the query.
    const conn = await this.#db.connect();
    try {
      return await conn.query(query);
    } finally {
      await con.close();
    }
  }

  async readSnapshotLength(id) {
    let query = "SELECT\n";

    query += "    COUNT(*)\n";

    query += "FROM\n";
    query += `    '${column.array}.parquet'\n`;

    // Execute the query.
    const conn = await this.#db.connect();
    try {
      return await conn.query(query);
    } finally {
      await con.close();
    }
  }

  /**
   * Returns an `arrow.Table` of data from the requested snapshot.
   *
   * The schema should match the result from `readSnapshotSchema`.
   */
  async readSnapshotData(id, { offset, limit }) {
    let query = "SELECT\n";

    // Add column bindings.
    for (column of columns) {
      query += `    ${column.name}.values as ${column.name},\n`;
    }

    // Add source clauses.
    query += "FROM\n";

    for (column of columns) {
      query += `    '${column.array}.parquet' ${column.name},\n`;
    }

    // Add filter clauses.
    if (columns.length > 1) {
      query += "WHERE\n";

      for (column of columns.slice(1)) {
        query += `    ${column.name}.rowid = ${columns[0].name}.rowid,\n`;
      }
    }

    // Add order by clause.
    query += "ORDER BY\n";
    query += `    ${columns[0].name}.rowid\n`;

    // Add offset clause.
    if (typeof offset != "undefined") {
      query += `OFFSET ${offset}\n`;
    }

    // Add limit clause.
    if (typeof limit != "undefined") {
      query += `LIMIT ${LIMIT}\n`;
    }

    // Execute the query.
    const conn = await this.#db.connect();
    try {
      return await conn.query(query);
    } finally {
      await con.close();
    }
  }
}

export class DTLViewer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  renderSource() {
    // If source is unspecified, hides the source table and mapping column.
  }

  renderTarget() {
    // Get column names and types for headers.

    clobber(this.shadowRoot, h("table", h("tr")));

    // Check if target has changed.

    // Clear old table contents.

    // Render table header.

    // Render table contents.
  }

  get manifest() {
    return this.getAttribute("manifest");
  }
  set manifest(value) {
    this.setAttribute("manifest", value);
  }

  get store() {
    return this.getAttribute("store");
  }
  set store(value) {
    this.setAttribute("store", value);
  }

  static get observedAttributes() {
    return ["manifest", "store", "source", "target"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name == "manifest" || name == "store") {
      if (this.manifest && this.store) {
        this.session = new DTLSession("./manifest.json", "./data");
        this.session.initialise();
        this.render();
      }
    }
  }

  connectedCallback() {}

  disconnectedCallback() {
    // TODO decrement ref count on manifest
  }
}
