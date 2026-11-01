import type { NextConfig } from 'next';

const config: NextConfig = {
  // Workspace packages ship TypeScript source.
  transpilePackages: ['@athena/db', '@athena/shared', '@athena/config'],
  // PGlite loads its own WASM and data files at runtime; keep it out of the bundle.
  serverExternalPackages: ['@electric-sql/pglite'],
};

export default config;
