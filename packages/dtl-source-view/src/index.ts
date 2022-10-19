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

function assert(expr: unknown): asserts expr {
  if (!expr) throw new Error("assertion failed");
}

export class DTLSourceView extends HTMLElement {
  #editor: EditorView;

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

    this.#editor = new EditorView({
      state: startState,
      parent: this.shadowRoot,
    });

    const slot = document.createElement("slot");
    slot.style.display = "none";
    this.shadowRoot.appendChild(slot);

    slot.addEventListener("slotchange", (event) => {
      assert(event.target instanceof HTMLSlotElement);

      const children = event.target.assignedNodes();

      let text = "";
      for (const child of children) {
        text += child.textContent;
      }

      const transaction = this.#editor.state.update({
        changes: {
          from: 0,
          to: this.#editor.state.doc.length,
          insert: text,
        },
      });
      this.#editor.dispatch(transaction);
    });
  }
}
