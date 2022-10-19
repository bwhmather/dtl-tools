// import { terser } from "rollup-plugin-terser";
import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";
import url from "@rollup/plugin-url";

export default [
  {
    input: "src/index.ts",
    plugins: [
      typescript({
        compilerOptions: {
          declaration: true,
          declarationDir: "dist",
        },
      }),
      resolve(),
      url({
        include: [
          "**/@duckdb/duckdb-wasm/dist/duckdb-eh.wasm",
          "**/@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js",
        ],
        limit: Infinity,
      }),
    ],
    external: id => {
        // Bundle modules at absolute paths.
        if (/^\//.test(id)) return false;
        // Bundle modules at relative paths.
        if (/^.\//.test(id)) return false;
        // Import anything else.
        return true;
    },
    output: [
      {
        format: "es",
        file: "dist/dtl-store.mjs",
        sourcemap: true,
        sourcemapFile: "dist/dtl-store.mjs.map",
      },
      {
        format: "cjs",
        file: "dist/dtl-store.umd.js",
        sourcemap: true,
        sourcemapFile: "dist/dtl-store.umd.js.map",
      },
    ],
  },
];
