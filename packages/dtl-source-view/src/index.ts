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

import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap } from "@codemirror/commands";
import { EditorState } from "@codemirror/state";
import { basicSetup } from "codemirror";
import { BehaviorSubject, switchMap, from } from "rxjs";
import { fetchManifest } from "@dtl-tools/dtl-manifest";
function assert(expr: unknown): asserts expr {
  if (!expr) throw new Error("assertion failed");
}

export class DTLSourceView extends HTMLElement {
  #manifestUrl: BehaviorSubject<string>;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    const startState = EditorState.create({
      extensions: [
        basicSetup,
        EditorState.readOnly.of(true),
        keymap.of(defaultKeymap),
      ],
    });

    const editor = new EditorView({
      state: startState,
      parent: this.shadowRoot,
    });

    this.#manifestUrl = new BehaviorSubject("");

    const manifest = new BehaviorSubject(undefined);
    this.#manifestUrl
      .pipe(
        switchMap((manifestUrl: string) => {
          return from(
            (async () => {
              if (manifestUrl) {
                return await fetchManifest(manifestUrl);
              }
            })()
          );
        })
      )
      .subscribe(manifest);

    manifest.subscribe((manifest) => {
      if (!manifest) return;
      const transaction = editor.state.update({
        changes: {
          from: 0,
          to: editor.state.doc.length,
          insert: manifest.source,
        },
      });
      editor.dispatch(transaction);
    });
  }

  get manifest() {
    return this.getAttribute("manifest");
  }

  set manifest(value) {
    this.setAttribute("manifest", value);
  }

  static get observedAttributes() {
    return ["manifest"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "manifest":
        this.#manifestUrl.next(newValue);
        break;
    }
  }

  connectedCallback() {}

  disconnectedCallback() {
    // TODO decrement ref count on manifest
  }
}
