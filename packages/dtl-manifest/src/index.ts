export type DTLLocation = {
  readonly lineno: number;
  readonly column: number;
};

export function locationFromJson(data: any): DTLLocation {
  return {
    lineno: data["lineno"],
    column: data["column"],
  };
}

export type DTLColumn = {
  readonly name: string;
  readonly array: string;
};

export function columnFromJson(data: any): DTLColumn {
  return { name: data["name"], array: data["array"] };
}

export type DTLSnapshot = {
  readonly start: DTLLocation;
  readonly end: DTLLocation;
  readonly columns: DTLColumn[];
};

export function snapshotFromJson(data: any): DTLSnapshot {
  const start = locationFromJson(data.start);
  const end = locationFromJson(data.end);

  const columns = [];
  for (const columnData of data.columns) {
    columns.push(columnFromJson(columnData));
  }

  return { start, end, columns };
}

export type DTLMapping = {
  readonly sourceArray: string;
  readonly targetArray: string;
  readonly sourceIndexArray: string;
  readonly targetIndexArray: string;
};

export function mappingFromJson(data: any): DTLMapping {
  return {
    sourceArray: data["sourceArray"],
    targetArray: data["targetArray"],
    sourceIndexArray: data["sourceIndexArray"],
    targetIndexArray: data["targetIndexArray"],
  };
}

export class DTLManifest {
  #source: string;
  #snapshots: DTLSnapshot[];
  #mappings: DTLMapping[];

  #rowToOffsetMap: number[];
  #offsetToSnapshotMap: number[];

  constructor({
    source,
    snapshots,
    mappings,
  }: {
    source: string;
    snapshots: DTLSnapshot[];
    mappings: DTLMapping[];
  }) {
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
      const snapshot = this.#snapshots[index];

      const startOffset = this.rowColToOffset(
        snapshot.start.lineno,
        snapshot.end.column
      );
      const endOffset = this.rowColToOffset(
        snapshot.end.lineno,
        snapshot.end.column
      );

      for (let offset = startOffset; offset < endOffset; offset++) {
        this.#offsetToSnapshotMap[offset] = index;
      }
    }
  }

  get source(): string {
    return this.#source;
  }

  *snapshots(): IterableIterator<DTLSnapshot> {
    for (const snapshot of this.#snapshots) {
      yield snapshot;
    }
  }

  rowColToOffset(row: number, col: number): number {
    return this.#rowToOffsetMap[row] + col;
  }

  snapshotById(snapshotId: number): DTLSnapshot {
    return this.#snapshots[snapshotId];
  }

  snapshotByRowColumn(row: number, col: number): DTLSnapshot {
    const offset = this.#rowToOffsetMap[row] + col;
    const snapshotId = this.#offsetToSnapshotMap[offset];
    return this.#snapshots[snapshotId];
  }

  *mappings(): IterableIterator<DTLMapping> {
    for (const mapping of this.#mappings) {
      yield mapping;
    }
  }
}

export function manifestFromJson(data: string): DTLManifest {
  const source = data["source"].replace(/\r\n|\r/g, "\n");

  const snapshots = [];
  for (let snapshotData of data["snapshots"]) {
    snapshots.push(snapshotFromJson(snapshotData));
  }

  const mappings = [];
  for (let mappingData of data["mappings"]) {
    mappings.push(mappingFromJson(mappingData));
  }

  return new DTLManifest({ source, snapshots, mappings });
}

export async function fetchManifest(url) {
  const response = await fetch(url);
  const data = await response.json();
  const manifest = manifestFromJson(data);
  return manifest;
}
