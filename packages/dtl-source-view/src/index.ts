import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap } from "@codemirror/commands";
import { EditorState } from "@codemirror/state";
import { basicSetup } from "codemirror";

function assert(expr: unknown): asserts expr {
    if (!expr) throw new Error("assertion failed");
}

export class DTLSourceView extends HTMLElement {
  #editor: EditorView

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
