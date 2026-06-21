import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const gtsConfig = require('gts/build/eslint.config.js');

export default [
  ...gtsConfig,
  {
    ignores: ['test/', 'dist/'],
  },
  {
    files: ['eslint.config.js'],
    languageOptions: {
      sourceType: 'module',
    },
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: join(__dirname, 'tsconfig.json'),
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
];
