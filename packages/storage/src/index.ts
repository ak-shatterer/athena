// One interface over the free places a video can live. Pick with STORAGE_DRIVER.
//   local    – leave files in out/ and serve them from the web app (default, dev)
//   supabase – Supabase Storage, 1 GB free, no card needed
//   r2       – Cloudflare R2, 10 GB free with no egress fees (card on file)
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { DeleteObjectsCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

export interface VideoStorage {
  driver: string;
  /** Uploads a local file under `key` and returns the URL viewers load it from. */
  put(key: string, file: string, contentType: string): Promise<string>;
  remove(keys: string[]): Promise<void>;
}

export function createStorage(driver = process.env.STORAGE_DRIVER || 'local'): VideoStorage {
  switch (driver) {
    case 'local':
      return local();
    case 'supabase':
      return supabase();
    case 'r2':
      return r2();
    default:
      throw new Error(`Unknown STORAGE_DRIVER "${driver}" (use local, supabase or r2)`);
  }
}

function need(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set (needed by STORAGE_DRIVER=${process.env.STORAGE_DRIVER})`);
  return value;
}

// Files already sit in out/<key>; the web app's /api/media route serves them.
function local(): VideoStorage {
  return {
    driver: 'local',
    put: async (key) => `/api/media/${key}`,
    remove: async () => {},
  };
}

function supabase(): VideoStorage {
  const client = createClient(need('SUPABASE_URL'), need('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
  const bucket = process.env.SUPABASE_BUCKET || 'videos';
  return {
    driver: 'supabase',
    async put(key, file, contentType) {
      const { error } = await client.storage.from(bucket).upload(key, readFileSync(file), { contentType, upsert: true });
      if (error) throw new Error(`Supabase upload ${key}: ${error.message}`);
      return client.storage.from(bucket).getPublicUrl(key).data.publicUrl;
    },
    async remove(keys) {
      if (keys.length === 0) return;
      const { error } = await client.storage.from(bucket).remove(keys);
      if (error) throw new Error(`Supabase remove: ${error.message}`);
    },
  };
}

function r2(): VideoStorage {
  const bucket = process.env.R2_BUCKET || 'athena-videos';
  const publicBase = need('R2_PUBLIC_URL').replace(/\/$/, '');
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${need('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: need('R2_ACCESS_KEY_ID'), secretAccessKey: need('R2_SECRET_ACCESS_KEY') },
  });
  return {
    driver: 'r2',
    async put(key, file, contentType) {
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: readFileSync(file), ContentType: contentType }));
      return `${publicBase}/${key}`;
    },
    async remove(keys) {
      if (keys.length === 0) return;
      await client.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: keys.map((Key) => ({ Key })) } }));
    },
  };
}
