export class DTLColumn {
    constructor({name, array}) {
        this.name = name;
        this.array = array;
    }

    static fromJson(data) {
        return new DTLColumn({name: data.name, array: data.array});
    }
}

export class DTLSnapshot {
    constructor({start, end, columns}) {
        this.start = start;
        this.end = end;

        this.#columns = columns;
    }

    static fromJson(data) {
        const start = DTLLocation.fromJson(data.start);
        const end = DTLLocation.fromJson(data.end);

        const columns = [];
        for (const columnData of data.columns) {
            columns.push(DTLColumn.fromJson(columnData));
        }

        return new DTLSnapshot({start, end, columns});
    }

    *columns() {
        for (const column of this.#columns) {
            yield column;
        }
    }
}

export class DTLManifest {
    constructor({source, snapshots, mappings}) {
        this.#source = source;
        this.#snapshots = snapshots;
        this.#mappings = mappings;

        // === Build a map from row number to source offset ===
        this.#rowToOffsetMap = [0];
        for (let offset = 0; offset < this.#source.length; offset++) {
            if (this.#source[offset] == '\n') {
                this.#rowToOffsetMap.push(offset + 1);
            }
        }

        // === Build a map from source offset to optional snapshot index ===
        // Sort snapshots in reverse order of specificity.
        let indexes = [...Array(this.#snapshots).keys()]
        indexes.sort((ia, ib) => {
            let a = this.#snapshots[ia];
            let b = this.#snapshots[ib];

            return (
                // Latest start.
                a.start.lineno - b.start.lineno ||
                a.start.column - b.start.column ||
                // Earliest finish.
                b.end.lineno - a.end.lineno ||
                b.end.column - b.end.column
            );
        )

        for (let index of indexes) {
            let snapshot = this.#snapshots[index];

            let startOffset = this.rowColToOffset();

            for (let offset = startOffset; offset < endOffset; offset++) {
                this.#offsetToSnapshotMap[offset] = index;
            }
        }
    }

    static fromJson(data) {
        source = data.source.replace(/\r\n|\r/g, '\n');

        snapshots = [];
        for (let snapshotData of data.snapshots) {
            this.snapshots.push(new DTLSnapshot(snapshotData));
        }

        mappings = [];
        for (let mappingData of data.mappings) {
            this.mappings.push(new DTLMapping(mappingData));
        }

        return new DTLManifest({source, snapshots, mappings});
    }

    static get source() {
        return this.#source;
    }

    *snapshots() {
        for (const snapshot of this.#snapshots) {
            yield snapshot;
        }
    }

    snapshotById(snapshotId) {
        return this.#snapshots[snapshotId];
    }

    snapshotByRowColumn(row, col) {
        const offset = this.#rowToOffsetMap[row] + col;
        const snapshotId = this.#offsetToSnapshotMap[offset];
        return this.#snapshots[snapshotId];
    }

    *mappings() {
        for (const mapping of this.#mappings) {
            yield mapping;
        }
    }
}

export function fetchManifest(url) {
    data = await fetch(url);
    manifest = DTLManifest.fromJson(data);
    await manifest.initialise();
    return manifest;
}

class DTLSession {
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
    initialise() {
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
    readSnapshotSchema(id) {
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

    readSnapshotLength(id) {
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
    readSnapshotData(id, {offset, limit}) {
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

            for (column of columns[1:]) {
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


class DTLViewer extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({mode: 'open'});
    }


    renderSource()
        // If source is unspecified, hides the source table and mapping column.

    }

    renderTarget() {
        // Get column names and types for headers.

        bdc.clobber(
            this.shadowRoot,
            bdc.h(
                "table",
                bdc.h("tr"),






        // Check if target has changed.
        if (header) {
            bdc.clobber("tr", [
                {"th", column.name} for column in columns
            ])
        }



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
        await db.registerFileURL("{manifest}.{target}.parquet", url);
    }

    attributeChangedCallback(name, oldValue, newValue) {

    }

    disconnectedCallback() {
        // TODO decrement ref count on manifest
    }
}



customElements.define('dtl-viewer', DTLViewer);
