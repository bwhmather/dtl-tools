import { terser } from 'rollup-plugin-terser';
import resolve from '@rollup/plugin-node-resolve';
import url from '@rollup/plugin-url';

const indirect = [
    "**/@duckdb/duckdb-wasm/dist/duckdb-eh.wasm",
    "**/@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js",
];

export default [
  {
    input: 'src/index.js',
    plugins: [
        resolve(),
        url({include: indirect, limit: Infinity}),
    ],
    output: {
      format: 'es',
      file: 'dist/dtl.mjs',
      sourcemap: true,
      sourcemapFile: 'dist/dtl.mjs.map'
    }
  },
  {
    input: 'src/index.js',
    plugins: [
        resolve(),
        url({include: indirect, limit: Infinity}),
    ],
    output: {
      format: 'cjs',
      file: 'dist/dtl.umd.js',
      sourcemap: true,
      sourcemapFile: 'dist/dtl.umd.js.map'
    }
  },
  {
    input: 'src/index.js',
    plugins: [
        resolve(),
        url({include: indirect, limit: Infinity}),
    ],
    output: {
      format: 'iife',
      name: 'dtl',
      file: 'dist/dtl.js',
      sourcemap: true,
      sourcemapFile: 'dist/dtl.js.map',
    }
  },
  {
    input: 'src/index.js',
    plugins: [
        resolve(),
        url({include: indirect, limit: Infinity}),
        terser(),
    ],
    output: {
      format: 'iife',
      name: 'dtl',
      file: 'dist/dtl.min.js',
      sourcemap: true,
      sourcemapFile: 'dist/dtl.min.js.map'
    }
  },
];
