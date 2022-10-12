import { terser } from "rollup-plugin-terser";
import resolve from "@rollup/plugin-node-resolve";
import url from "@rollup/plugin-url";

const indirect = [
  "**/@duckdb/duckdb-wasm/dist/duckdb-eh.wasm",
  "**/@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js",
];

export default [
  {
    input: "src/index.js",
    plugins: [resolve(), url({ include: indirect, limit: Infinity })],
    output: {
      format: "es",
      file: "dist/dtl-store.mjs",
      sourcemap: true,
      sourcemapFile: "dist/dtl-store.mjs.map",
    },
  },
  {
    input: "src/index.js",
    plugins: [resolve(), url({ include: indirect, limit: Infinity })],
    output: {
      format: "cjs",
      file: "dist/dtl-store.umd.js",
      sourcemap: true,
      sourcemapFile: "dist/dtl-store.umd.js.map",
    },
  },
  {
    input: "src/index.js",
    plugins: [resolve(), url({ include: indirect, limit: Infinity })],
    output: {
      format: "iife",
      name: "dtlStore",
      file: "dist/dtl-store.js",
      sourcemap: true,
      sourcemapFile: "dist/dtl-store.js.map",
    },
  },
  {
    input: "src/index.js",
    plugins: [resolve(), url({ include: indirect, limit: Infinity }), terser()],
    output: {
      format: "iife",
      name: "dtlStore",
      file: "dist/dtl-store.min.js",
      sourcemap: true,
      sourcemapFile: "dist/dtl-store.min.js.map",
    },
  },
];
