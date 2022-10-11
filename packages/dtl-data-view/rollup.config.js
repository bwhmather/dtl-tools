import { terser } from 'rollup-plugin-terser';
import resolve from '@rollup/plugin-node-resolve';

export default [
  {
    input: 'src/index.js',
    plugins: [
        resolve(),
    ],
    output: {
      format: 'es',
      file: 'dist/dtl-data-view.mjs',
      sourcemap: true,
      sourcemapFile: 'dist/dtl-data-view.mjs.map'
    }
  },
  {
    input: 'src/index.js',
    plugins: [
        resolve(),
    ],
    output: {
      format: 'cjs',
      file: 'dist/dtl-data-view.umd.js',
      sourcemap: true,
      sourcemapFile: 'dist/dtl-data-view.umd.js.map'
    }
  },
  {
    input: 'src/index.js',
    plugins: [
        resolve(),
    ],
    output: {
      format: 'iife',
      name: 'dtlDataView',
      file: 'dist/dtl-data-view.js',
      sourcemap: true,
      sourcemapFile: 'dist/dtl-data-view.js.map',
    }
  },
  {
    input: 'src/index.js',
    plugins: [
        resolve(),
        terser(),
    ],
    output: {
      format: 'iife',
      name: 'dtlDataView',
      file: 'dist/dtl-data-view.min.js',
      sourcemap: true,
      sourcemapFile: 'dist/dtl-data-view.min.js.map'
    }
  },
];
