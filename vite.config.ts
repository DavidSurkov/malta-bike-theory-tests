import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

import { defineConfig } from 'vite';

const DIST_DIRECTORY = resolve('dist');

const listFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = resolve(directory, entry.name);
    return entry.isDirectory() ? listFiles(filePath) : [filePath];
  });

const createServiceWorker = () => {
  const source = readFileSync(resolve('src/service-worker.js'), 'utf8');
  const buildFiles = listFiles(DIST_DIRECTORY).filter(
    (filePath) => !filePath.endsWith('/sw.js'),
  );
  const assets = [
    '/',
    ...buildFiles.map(
      (filePath) =>
        `/${relative(DIST_DIRECTORY, filePath).replaceAll('\\', '/')}`,
    ),
  ];
  const versionHash = createHash('sha256').update(source);

  for (const filePath of buildFiles) {
    versionHash.update(filePath).update(readFileSync(filePath));
  }

  const version = versionHash.digest('hex').slice(0, 12);
  const worker = [
    `const CACHE_NAME = 'malta-motorcycle-theory-${version}';`,
    `const OFFLINE_ASSETS = ${JSON.stringify(assets)};`,
    '',
    source,
  ].join('\n');

  writeFileSync(resolve(DIST_DIRECTORY, 'sw.js'), worker);
};

export default defineConfig({
  publicDir: 'static',
  plugins: [
    {
      name: 'prepare-static-site',
      closeBundle: () => {
        createServiceWorker();
      },
    },
  ],
});
