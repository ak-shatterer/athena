import 'server-only';
import { createDb, type Db } from '@athena/db';

// One connection per server process; survives dev hot reloads. Against a real
// database (Supabase) the pipeline owns migrations; locally PGlite migrates itself.
const cache = globalThis as unknown as { athenaDb?: Promise<Db> };
export const getDb = () => (cache.athenaDb ??= createDb(undefined, { migrate: !process.env.DATABASE_URL }));
