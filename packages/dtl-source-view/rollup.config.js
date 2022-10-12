import { terser } from "rollup-plugin-terser";
import resolve from "@rollup/plugin-node-resolve";

export default [
  {
    input: "src/index.js",
    plugins: [resolve()],
    output: {
      format: "es",
      file: "dist/dtl-source-view.mjs",
      sourcemap: true,
      sourcemapFile: "dist/dtl-source-view.mjs.map",
    },
  },
  {
    input: "src/index.js",
    plugins: [resolve()],
    output: {
      format: "cjs",
      file: "dist/dtl-source-view.umd.js",
      sourcemap: true,
      sourcemapFile: "dist/dtl-source-view.umd.js.map",
    },
  },
  {
    input: "src/index.js",
    plugins: [resolve()],
    output: {
      format: "iife",
      name: "dtlSourceView",
      file: "dist/dtl-source-view.js",
      sourcemap: true,
      sourcemapFile: "dist/dtl-source-view.js.map",
    },
  },
  {
    input: "src/index.js",
    plugins: [resolve(), terser()],
    output: {
      format: "iife",
      name: "dtlSourceView",
      file: "dist/dtl-source-view.min.js",
      sourcemap: true,
      sourcemapFile: "dist/dtl-source-view.min.js.map",
    },
  },
];
