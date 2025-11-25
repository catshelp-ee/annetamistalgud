const path = require('path');
const esbuild = require('esbuild');

// Inject VITE_ environment variables into the bundle
const viteEnv = Object.entries(process.env)
  .filter(([key]) => key.startsWith('VITE_'))
  .reduce((acc, [key, val]) => {
    acc[`process.env.${key}`] = JSON.stringify(val);
    return acc;
  }, {});

esbuild
  .build({
    entryPoints: [path.resolve(__dirname, 'server/main.ts')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node20',
    outfile: 'dist/bundle.cjs',
    external: [
      '@prisma/client',
      '*.node',
      'pg-hstore',
      'path',
      'fs',
      'url',
      'crypto',
      'stream',
      'buffer',
      'util',
      'events',
    ],
    define: viteEnv,
  })
  .catch(() => process.exit(1));
