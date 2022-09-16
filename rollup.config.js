import { terser } from 'rollup-plugin-terser';
import resolve from '@rollup/plugin-node-resolve';
import url from '@rollup/plugin-url';

export default [
  {
    input: 'src/index.js',
    plugins: [
        resolve(),
        url({include: ['**/@duckdb/duckdb-wasm/dist/**/*'], limit: Infinity}),
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
        url({include: ['**/@duckdb/duckdb-wasm/dist/**/*'], limit: Infinity}),
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
        url({include: ['**/@duckdb/duckdb-wasm/dist/**/*'], limit: Infinity}),
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
        url({include: ['**/@duckdb/duckdb-wasm/dist/**/*'], limit: Infinity}),
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
]


