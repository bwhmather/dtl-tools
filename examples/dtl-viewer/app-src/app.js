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

function redraw(manifest) {
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
          h("dtl-source-view", { manifest: "./manifest.json" })
        ),
        h(
          "div",
          { class: "col border" },
          h("dtl-data-view", { manifest: "./manifest.json", store: "./data/" })
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
