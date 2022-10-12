import { terser } from "rollup-plugin-terser";
import resolve from "@rollup/plugin-node-resolve";

export default [
  {
    input: "src/index.js",
    plugins: [resolve()],
    output: {
      format: "es",
      file: "dist/dtl-manifest.mjs",
      sourcemap: true,
      sourcemapFile: "dist/dtl-manifest.mjs.map",
    },
  },
  {
    input: "src/index.js",
    plugins: [resolve()],
    output: {
      format: "cjs",
      file: "dist/dtl-manifest.umd.js",
      sourcemap: true,
      sourcemapFile: "dist/dtl-manifest.umd.js.map",
    },
  },
  {
    input: "src/index.js",
    plugins: [resolve()],
    output: {
      format: "iife",
      name: "dtlManifest",
      file: "dist/dtl-manifest.js",
      sourcemap: true,
      sourcemapFile: "dist/dtl-manifest.js.map",
    },
  },
  {
    input: "src/index.js",
    plugins: [resolve(), terser()],
    output: {
      format: "iife",
      name: "dtlManifest",
      file: "dist/dtl-manifest.min.js",
      sourcemap: true,
      sourcemapFile: "dist/dtl-manifest.min.js.map",
    },
  },
];
