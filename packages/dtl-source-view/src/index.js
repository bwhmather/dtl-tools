import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap } from "@codemirror/commands";
import { EditorState } from "@codemirror/state";

class DTLSourceViewElement extends HTMLElement {
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

    this.editor = new EditorView({
      state: startState,
      parent: this.shadowRoot,
    });

    const slot = document.createElement("slot");
    slot.style.display = "none";
    this.shadowRoot.appendChild(slot);

    slot.addEventListener("slotchange", (event) => {
      const children = event.target.assignedNodes();

      let text = "";
      for (const child of children) {
        text += child.textContent;
      }

      const transaction = this.editor.state.update({
        changes: {
          from: 0,
          to: this.editor.state.doc.length,
          insert: text,
        },
      });
      this.editor.dispatch(transaction);
    });
  }
}

window.customElements.define("dtl-source-view", DTLSourceViewElement);
