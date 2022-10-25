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

import { h, clobber } from "bdc";
import {
  from,
  multicast,
  Observable,
  BehaviorSubject,
  Subject,
  combineLatest,
  switchMap,
  startWith,
} from "rxjs";
import { Schema, Table } from "apache-arrow";

import { createSession, DTLSession } from "@dtl-tools/dtl-store";

const STYLE = `
#root {
    all: initial;
}
`;

export class DTLDataView extends HTMLElement {
  #manifestUrl: BehaviorSubject<string>;
  #arrayUrl: BehaviorSubject<string>;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    this.#manifestUrl = new BehaviorSubject("");
    this.#arrayUrl = new BehaviorSubject("");

    // Manifest + Data store => Session
    const session = new BehaviorSubject<DTLSession | undefined>(undefined);
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
            return from(
              (async () => {
                if (manifestUrl && arrayUrl) {
                  return await createSession(manifestUrl, arrayUrl);
                }
              })()
            ).pipe(startWith(undefined));
          }
        )
      )
      .subscribe(session);

    // TODO
    const snapshotId = new BehaviorSubject<number | null>(0);

    // Session + Target => Headers
    // `undefined` indicates that schema is loading.  `null` indicates that
    // there is no schema to load.
    const schema = new BehaviorSubject<Schema | undefined | null>(undefined);

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
            session: DTLSession | undefined;
            snapshotId: number | null;
          }) =>
            from(
              (async () => {
                if (typeof session === "undefined") {
                  return undefined;
                }
                if (snapshotId === null) {
                  return null;
                }
                return await session.readSnapshotSchema(snapshotId);
              })()
            ).pipe(startWith(undefined))
        )
      )
      .subscribe(schema);

    schema.subscribe((schema) => console.log(schema));

    // Session + Target => Length
    // `undefined` indicates that the length is still being read.  `null`
    // indicates indicates that requesting the length at this point is
    // meaningless.
    const length = new BehaviorSubject<number | undefined | null>(null);

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
            session: DTLSession | undefined;
            snapshotId: number | null;
          }) =>
            from(
              (async () => {
                if (typeof session === "undefined") {
                  return undefined;
                }
                if (snapshotId === null) {
                  return null;
                }
                return await session.readSnapshotLength(snapshotId);
              })()
            ).pipe(startWith(undefined))
        )
      )
      .subscribe((length) => {
      });

    // Session + Target + Scroll position => data
    const data = new BehaviorSubject<Table | undefined | null>(undefined);

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
            session: DTLSession | undefined;
            snapshotId: number | null;
          }) =>
            from(
              (async () => {
                if (typeof session === "undefined") {
                  return null;
                }
                if (snapshotId === null) {
                  return null;
                }
                return await session.readSnapshotData(snapshotId);
              })()
            ).pipe(startWith(undefined))
        )
      )
      .subscribe(data);

    combineLatest({
      schema,
      length,
      data,
    }).subscribe(({ schema, length, data }) => {
      if (!schema || !data) {
        return;
      }

      const columnNames = [];
      for (const field of schema.fields) {
        columnNames.push(field.name);
      }

      const rowElements = [];

      const headerElements = [];
      for (const field of schema.fields) {
        headerElements.push(h("th", field.name));
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
        this.shadowRoot!,
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

  get manifest(): string | null {
    return this.getAttribute("manifest") || null;
  }
  set manifest(value: string | null) {
    this.setAttribute("manifest", value || "");
  }

  get store(): string | null {
    return this.getAttribute("store") || null;
  }
  set store(value: string | null) {
    this.setAttribute("store", value || "");
  }

  static get observedAttributes() {
    return ["manifest", "store", "source", "target"];
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
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
