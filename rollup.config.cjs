const commonjs = require('@rollup/plugin-commonjs');
const typescript = require('@rollup/plugin-typescript');
const pkg = require('./package.json');

const banner = '/*! ' + pkg.name + ' v' + pkg.version + ' */';

module.exports = [
  {
    input: 'src/icalendar.ts',
    output: [{file: pkg.module, format: 'es', name: pkg.name, banner}],
    plugins: [typescript(), commonjs()],
    external: [
      '@hebcal/hdate',
      '@hebcal/core',
      /@hebcal\/rest-api/,
      'fs',
      'stream',
      'murmurhash3',
    ],
  },
];
