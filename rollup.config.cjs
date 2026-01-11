const typescript = require('@rollup/plugin-typescript');
const pkg = require('./package.json');

const banner = '/*! ' + pkg.name + ' v' + pkg.version + ' */';

module.exports = [
  {
    input: 'src/icalendar.ts',
    output: [
      {
        dir: 'dist',
        format: 'es',
        name: pkg.name,
        banner,
        preserveModules: true,
        preserveModulesRoot: 'src',
      },
    ],
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        outputToFilesystem: false,
      }),
    ],
    external: [/@hebcal\//, 'node:fs', 'stream', 'murmurhash3'],
  },
];
