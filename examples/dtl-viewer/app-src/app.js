import { clobber, h } from "bdc";
import {
  from,
  multicast,
  Observable,
  BehaviorSubject,
  Subject,
  combineLatest,
  switchMap,
} from "rxjs";

let $root;
let target = null;

function handleSelectionChanged(event) {
    target = event.target.target;
    redraw();
}

function redraw() {
  clobber(
    $root,
    h(
      "div",
      { class: "container vh-100 px-4" },
      h(
        "div",
        { class: "row gx-5" },
        h(
          "div",
          { class: "col border" },
          h("dtl-source-view", { manifest: "./manifest.json", onselect: handleSelectionChanged })
        ),
        h(
          "div",
          { class: "col border" },
          h("dtl-data-view", { manifest: "./manifest.json", store: "./data/", target: target })
        )
      )
    )
  );
}

function handleHashChanged() {}

export function install($newRoot) {
  $root = $newRoot;

  handleHashChanged();
  window.addEventListener("hashchange", handleHashChanged, false);

  redraw();
}
