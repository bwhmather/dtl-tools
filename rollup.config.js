import { terser } from "rollup-plugin-terser";
import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";
import url from "@rollup/plugin-url";

export default [
  {
    input: "src/index.ts",
    plugins: [
      resolve(),
      url({
        include: [
          "**/@duckdb/duckdb-wasm/dist/duckdb-eh.wasm",
          "**/@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js",
        ],
        limit: Infinity,
      }),
      typescript({
        compilerOptions: {
          declaration: true,
          declarationDir: "dist",
        },
      }),
    ],
    treeshake: false,
    output: [
      {
        format: "iife",
        name: "dtlTools",
        file: "dist/dtl-tools.js",
        sourcemap: true,
        sourcemapFile: "dist/dtl-tools.js.map",
      },
      {
        format: "iife",
        name: "dtlTools",
        file: "dist/dtl-tools.min.js",
        sourcemap: true,
        sourcemapFile: "dist/dtl-tools.min.js.map",
        plugins: [terser()],
      },
    ],
  },
];
