import { h, clobber } from 'bdc';

class DTLSession {
    #manifestUrl;
    #arrayUrl;
    #manifest;

    /**
     * @private
     */
    constructor(manifestUrl, arrayUrl) {
        this.#manifestUrl = manifestUrl;
        this.#arrayUrl = arrayUrl;

        this.#manifest = null;
    }

    /**
     * @private
     */
    async initialise() {
        this.#manifest = fetchManifest(this.#manifestUrl);

        // === Register all referenced arrays with DuckDB ===
        let arrays = new Map();

        // Find arrays referenced by snapshots.
        for (let snapshot of this.#manifest.snapshots()) {
            for (column of snapshot.columns) {
                arrays.set(column.array);
            }
        }

        // Find arrays referenced by mappings.
        for (let mapping of this.#manifest.mappings()) {
            arrays.add(mapping.srcArray);
            arrays.add(mapping.tgtArray);
            arrays.add(mapping.srcIndexArray);
            arrays.add(mapping.tgtIndexArray);
        }

        for (let array of arrays) {
            await db.registerFileURL(
                `${array}.parquet`, `${this.#arrayUrl}/${array}.parquet`
            );
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
        return await conn.query(query);
    }

    async readSnapshotLength(id) {
        let query = "SELECT\n";

        query += "    COUNT(*)\n";

        query += "FROM\n";
        query += `    '${column.array}.parquet'\n`;

        // Execute the query.
        return await conn.query(query);
    }

    /**
     * Returns an `arrow.Table` of data from the requested snapshot.
     *
     * The schema should match the result from `readSnapshotSchema`.
     */
    async readSnapshotData(id, {offset, limit}) {
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
        if (typeof(offset) != "undefined") {
            query += `OFFSET ${offset}\n`;
        }

        // Add limit clause.
        if (typeof(limit) != "undefined") {
            query += `LIMIT ${LIMIT}\n`;
        }

        // Execute the query.
        return await conn.query(query);
    }
}


export class DTLViewer extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({mode: 'open'});
    }


    renderSource() {
        // If source is unspecified, hides the source table and mapping column.

    }

    renderTarget() {
        // Get column names and types for headers.

        clobber(
            this.shadowRoot,
            h(
                "table",
                h("tr"),
            ),
        );





        // Check if target has changed.


        // Clear old table contents.

        // Render table header.

        // Render table contents.

    }

    static get observedAttributes() {
        return ["manifest", "store", "source", "target"];
    }

    setManifest(newValue) {

    }

    setTarget(newValue) {
    }

    attributeChangedCallback(name, oldValue, newValue) {

    }

    disconnectedCallback() {
        // TODO decrement ref count on manifest
    }
}



