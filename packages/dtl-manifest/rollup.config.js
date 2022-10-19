import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";

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
    ],
    external: (id) => {
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
        file: "dist/dtl-manifest.mjs",
        sourcemap: true,
        sourcemapFile: "dist/dtl-manifest.mjs.map",
      },
      {
        format: "cjs",
        file: "dist/dtl-manifest.umd.js",
        sourcemap: true,
        sourcemapFile: "dist/dtl-manifest.umd.js.map",
      },
    ],
  },
];
