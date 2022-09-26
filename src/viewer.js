import { h, clobber } from "bdc";
import {
  from,
  multicast,
  Observable,
  BehaviorSubject,
  Subject,
  combineLatest,
  switchMap,
} from "rxjs";
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
    const snapshot = this.#manifest.snapshotById(id);

    let query = "DESCRIBE SELECT\n";

    // Add column bindings.
    for (const column of snapshot.columns()) {
      query += `    ${column.name}.values as ${column.name},\n`;
    }

    // Add source clauses.
    query += "FROM\n";

    for (const column of snapshot.columns()) {
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
    const columns = Array.from(snapshot.columns());

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
  async readSnapshotData(id, options) {
    const snapshot = this.#manifest.snapshotById(id);
    const columns = Array.from(snapshot.columns());

    let query = "SELECT\n";

    // Add column bindings.
    for (const column of columns) {
      query += `    ${column.name}.values as ${column.name},\n`;
    }

    // Add source clauses.
    query += "FROM\n";

    for (const column of columns) {
      query += `    '${column.array}.parquet' ${column.name},\n`;
    }

    // Add filter clauses.
    /*    if (columns.length > 1) {
      query += "WHERE\n";

      const clauses = []
      for (const column of columns.slice(1)) {
        clauses.push(`    ${column.name}.rowid = ${columns[0].name}.rowid`);
      }
      query += clauses.join(' AND\n');
      query += '\n';
    }
*/
    // Add order by clause.
    //  query += "ORDER BY\n";
    //query += `    ${columns[0].name}.rowid\n`;

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
      await conn.close();
    }
  }
}

async function createSession(manifestUrl, arrayUrl) {
  const session = new DTLSession(manifestUrl, arrayUrl);
  await session.initialise();
  return session;
}

export class DTLViewer extends HTMLElement {
  #manifestUrl;
  #arrayUrl;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    this.#manifestUrl = new Subject();
    this.#arrayUrl = new Subject();

    // Manifest + Data store => Session
    const session = new Subject();
    combineLatest({
      manifestUrl: this.#manifestUrl,
      arrayUrl: this.#arrayUrl,
    })
      .pipe(
        switchMap(({ manifestUrl, arrayUrl }) => {
          console.log({ manifestUrl, arrayUrl });
          return from(
            (async () => {
              if (manifestUrl && arrayUrl) {
                return await createSession(manifestUrl, arrayUrl);
              }
            })()
          );
        })
      )
      .subscribe(session);

    // TODO
    const snapshotId = new Observable((subscriber) => {
      subscriber.next(0);
    });

    // Session + Target => Headers
    const headers = new BehaviorSubject();

    combineLatest({
      session: session,
      snapshotId: snapshotId,
    })
      .pipe(
        switchMap(({ session, snapshotId }) =>
          from(
            (async () => {
              if (!session) {
                return;
              }
              return await session.readSnapshotSchema(snapshotId);
            })()
          )
        )
      )
      .subscribe(headers);

    // Session + Target => Length
    const length = new BehaviorSubject();

    combineLatest({
      session: session,
      snapshotId: snapshotId,
    })
      .pipe(
        switchMap(({ session, snapshotId }) =>
          from(
            (async () => {
              if (!session) {
                return;
              }
              return await session.readSnapshotLength(snapshotId);
            })()
          )
        )
      )
      .subscribe((length) => {
        console.log(length);
      });

    // Session + Target + Scroll position => data
    const data = new BehaviorSubject();

    combineLatest({
      session: session,
      snapshotId: snapshotId,
    })
      .pipe(
        switchMap(({ session, snapshotId }) =>
          from(
            (async () => {
              if (!session) {
                return;
              }
              return await session.readSnapshotData(snapshotId);
            })()
          )
        )
      )
      .subscribe(data);

    combineLatest({
      headers,
      length,
      data,
    }).subscribe(({ headers, length, data }) => {
      if (!headers || !data) {
        return;
      }

      const columnNames = [];
      for (const column of headers) {
        columnNames.push(column.column_name);
      }

      const rowElements = [];

      const headerElements = [];
      for (const column of headers) {
        headerElements.push(h("th", column.column_name));
      }

      for (const row of data) {
        rowElements.push(
          h(
            "tr",
            columnNames.map((columnName) => h("td", "" + row[columnName]))
          )
        );
      }

      clobber(
        this.shadowRoot,
        h(
          "table",
          h("thead", h("tr", headerElements)),
          h("tbody", rowElements)
        )
      );
    });
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
    switch (name) {
      case "manifest":
        this.#manifestUrl.next(newValue);
        break;
      case "store":
        this.#arrayUrl.next(newValue);
        break;
    }
  }

  connectedCallback() {}

  disconnectedCallback() {
    // TODO decrement ref count on manifest
  }
}
