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
