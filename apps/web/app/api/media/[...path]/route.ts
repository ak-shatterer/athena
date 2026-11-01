import { createReadStream, statSync } from 'node:fs';
import { join, normalize } from 'node:path';
import { Readable } from 'node:stream';
import { repoRoot } from '@athena/db';

// Serves rendered videos and thumbnails from out/ during local use, with HTTP
// range support so browsers can seek. Published videos come from object storage.
const ALLOWED = /^videos\/[\w.-]+\/[\w.-]+\.(mp4|jpg)$/;

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const rel = normalize((await params).path.join('/'));
  if (!ALLOWED.test(rel)) return new Response('Not found', { status: 404 });
  const file = join(repoRoot(), 'out', rel);

  let size: number;
  try {
    size = statSync(file).size;
  } catch {
    return new Response('Not found', { status: 404 });
  }
  const type = rel.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg';
  const range = request.headers.get('range')?.match(/bytes=(\d*)-(\d*)/);
  if (!range) {
    return new Response(toWeb(file), { headers: { 'Content-Type': type, 'Content-Length': String(size), 'Accept-Ranges': 'bytes' } });
  }
  const start = range[1] ? Number(range[1]) : 0;
  const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
  if (start > end || start >= size) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  return new Response(toWeb(file, start, end), {
    status: 206,
    headers: {
      'Content-Type': type,
      'Content-Length': String(end - start + 1),
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Accept-Ranges': 'bytes',
    },
  });
}

const toWeb = (file: string, start?: number, end?: number) =>
  Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream;
