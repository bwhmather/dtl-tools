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
import { createSession, DTLSession } from "@dtl-tools/dtl-store";

const STYLE = `
#root {
    all: initial;
}
`;

export class DTLDataView extends HTMLElement {
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
        switchMap(
          ({
            manifestUrl,
            arrayUrl,
          }: {
            manifestUrl: string;
            arrayUrl: string;
          }) => {
            console.log({ manifestUrl, arrayUrl });
            return from(
              (async () => {
                if (manifestUrl && arrayUrl) {
                  return await createSession(manifestUrl, arrayUrl);
                }
              })()
            );
          }
        )
      )
      .subscribe(session);

    // TODO
    const snapshotId = new Observable((subscriber) => {
      subscriber.next(0);
    });

    // Session + Target => Headers
    const headers = new BehaviorSubject(undefined);

    combineLatest({
      session: session,
      snapshotId: snapshotId,
    })
      .pipe(
        switchMap(
          ({
            session,
            snapshotId,
          }: {
            session: DTLSession;
            snapshotId: number;
          }) =>
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

    headers.subscribe((table) => table && console.table(table.toArray()));

    // Session + Target => Length
    const length = new BehaviorSubject(undefined);

    combineLatest({
      session: session,
      snapshotId: snapshotId,
    })
      .pipe(
        switchMap(
          ({
            session,
            snapshotId,
          }: {
            session: DTLSession;
            snapshotId: number;
          }) =>
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
    const data = new BehaviorSubject(undefined);

    combineLatest({
      session: session,
      snapshotId: snapshotId,
    })
      .pipe(
        switchMap(
          ({
            session,
            snapshotId,
          }: {
            session: DTLSession;
            snapshotId: number;
          }) =>
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
        h("style", STYLE),
        h(
          "table",
          { id: "root" },
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
