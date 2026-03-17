/* eslint-disable @typescript-eslint/no-require-imports */
const nextCoreWebVitals = require('eslint-config-next/core-web-vitals');
const nextTypeScript = require('eslint-config-next/typescript');

module.exports = [
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    ignores: ['.next/**', 'coverage/**', 'node_modules/**'],
  },
];
