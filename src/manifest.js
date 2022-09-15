export class DTLColumn {
  constructor({ name, array }) {
    this.name = name;
    this.array = array;
  }

  static fromJson(data) {
    return new DTLColumn({ name: data.name, array: data.array });
  }
}

export class DTLSnapshot {
  #columns;

  constructor({ start, end, columns }) {
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

    return new DTLSnapshot({ start, end, columns });
  }

  *columns() {
    for (const column of this.#columns) {
      yield column;
    }
  }
}

export class DTLManifest {
  #source;
  #snapshots;
  #mappings;

  #rowToOffsetMap;
  #offsetToSnapshotMap;

  constructor({ source, snapshots, mappings }) {
    this.#source = source;
    this.#snapshots = snapshots;
    this.#mappings = mappings;

    // === Build a map from row number to source offset ===
    this.#rowToOffsetMap = [0];
    for (let offset = 0; offset < this.#source.length; offset++) {
      if (this.#source[offset] == "\n") {
        this.#rowToOffsetMap.push(offset + 1);
      }
    }

    // === Build a map from source offset to optional snapshot index ===
    // Sort snapshots in reverse order of specificity.
    let indexes = [...Array(this.#snapshots).keys()];
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
    });

    for (let index of indexes) {
      let snapshot = this.#snapshots[index];

      let startOffset = this.rowColToOffset();

      for (let offset = startOffset; offset < endOffset; offset++) {
        this.#offsetToSnapshotMap[offset] = index;
      }
    }
  }

  static fromJson(data) {
    source = data.source.replace(/\r\n|\r/g, "\n");

    snapshots = [];
    for (let snapshotData of data.snapshots) {
      this.snapshots.push(new DTLSnapshot(snapshotData));
    }

    mappings = [];
    for (let mappingData of data.mappings) {
      this.mappings.push(new DTLMapping(mappingData));
    }

    return new DTLManifest({ source, snapshots, mappings });
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

export async function fetchManifest(url) {
  data = await fetch(url);
  manifest = DTLManifest.fromJson(data);
  await manifest.initialise();
  return manifest;
}
