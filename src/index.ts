export { fetchManifest } from "@dtl-tools/dtl-manifest";
import { DTLDataView } from "@dtl-tools/dtl-data-view";
import { DTLSourceView } from "@dtl-tools/dtl-source-view";
import { configure } from "@dtl-tools/dtl-store";

import { mainModuleUrl, mainWorkerUrl } from "./duckdb";

customElements.define("dtl-source-view", DTLSourceView);
customElements.define("dtl-data-view", DTLDataView);

configure({
  duckDbMainModuleUrl: mainModuleUrl,
  duckDbMainWorkerUrl: mainWorkerUrl,
});
